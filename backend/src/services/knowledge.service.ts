import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { hasPermission } from "../lib/permissions";
import { forbidden, notFound } from "../utils/errors";
import { mistakeQuestionIds } from "./practice.service";

/**
 * "Knowledge control" for teachers: how a group's students did on tests in the last 7 days, and for one
 * student, which questions they still get wrong (with the answer they picked) and their weakest topics.
 * A teacher sees the students of their own active groups; group managers see every group.
 */
type Actor = { userId: string; role: string };

const WEEK_MS = 7 * 86_400_000;
const seesAll = (actor: Actor) => hasPermission(actor.role, "groups:manage");

const optionList = (v: Prisma.JsonValue): string[] => (Array.isArray(v) ? (v as unknown[]).map(String) : []);

/** Average of finished-test scores, or null when there are none. */
const average = (tests: { score: number }[]) => (tests.length ? Math.round(tests.reduce((s, t) => s + t.score, 0) / tests.length) : null);

/**
 * For group managers (admin): every teacher next to their groups' test activity for the last 7 days, in
 * three queries however many teachers there are. Teachers without an active group are listed with zeros.
 */
export const teachersOverview = async () => {
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const [teachers, groups] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEACHER", isActive: true }, select: { id: true, name: true, avatarUrl: true, phone: true } }),
    prisma.teacherGroup.findMany({
      where: { status: "ACTIVE" },
      select: { teacherId: true, teacher: { select: { id: true, name: true, avatarUrl: true, phone: true } }, members: { where: { leftAt: null }, select: { studentId: true } } },
    }),
  ]);
  const studentIds = [...new Set(groups.flatMap((g) => g.members.map((m) => m.studentId)))];
  const week = studentIds.length
    ? await prisma.test.findMany({ where: { userId: { in: studentIds }, finishedAt: { gte: weekAgo } }, select: { userId: true, score: true } })
    : [];
  const testsOf = new Map<string, { score: number }[]>();
  for (const t of week) testsOf.set(t.userId, [...(testsOf.get(t.userId) ?? []), t]);

  // Admins and others can run groups too; they are listed when they have one.
  const people = new Map(teachers.map((t) => [t.id, t]));
  for (const g of groups) if (!people.has(g.teacherId)) people.set(g.teacherId, g.teacher);

  const rows = [...people.values()].map((teacher) => {
    const own = groups.filter((g) => g.teacherId === teacher.id);
    const students = [...new Set(own.flatMap((g) => g.members.map((m) => m.studentId)))];
    const tests = students.flatMap((id) => testsOf.get(id) ?? []);
    return {
      ...teacher,
      groups: own.length,
      students: students.length,
      tests7d: tests.length,
      average7d: average(tests),
      inactive7d: students.filter((id) => !testsOf.has(id)).length,
    };
  });
  rows.sort((a, b) => b.groups - a.groups || a.name.localeCompare(b.name));

  const allTests = studentIds.flatMap((id) => testsOf.get(id) ?? []);
  return {
    summary: {
      teachers: rows.length,
      groups: groups.length,
      students: studentIds.length,
      tests7d: allTests.length,
      average7d: average(allTests),
      inactive7d: studentIds.filter((id) => !testsOf.has(id)).length,
    },
    teachers: rows,
  };
};

/** One group's students. Group managers may narrow the group list to one teacher (`teacherId`). */
export const groupKnowledge = async (actor: Actor, groupId?: string, teacherId?: string) => {
  const teacherFilter = seesAll(actor) ? (teacherId ? { teacherId } : {}) : { teacherId: actor.userId };
  const groups = await prisma.teacherGroup.findMany({
    where: { status: "ACTIVE", ...teacherFilter },
    orderBy: { name: "asc" },
    select: { id: true, name: true, course: { select: { title: true } }, _count: { select: { members: { where: { leftAt: null } } } } },
  });
  if (groupId && !groups.some((g) => g.id === groupId)) throw forbidden("Not your group");
  const selected = groupId ?? groups[0]?.id ?? null;
  const groupList = groups.map((g) => ({ id: g.id, name: g.name, course: g.course.title, students: g._count.members }));
  if (!selected) return { groups: groupList, groupId: null, summary: null, students: [] };

  const members = await prisma.groupMembership.findMany({
    where: { groupId: selected, leftAt: null },
    select: { student: { select: { id: true, name: true, userNumber: true, studentNumber: true, avatarUrl: true } } },
  });
  const ids = members.map((m) => m.student.id);
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const [week, last, mistakes] = await Promise.all([
    prisma.test.findMany({ where: { userId: { in: ids }, finishedAt: { gte: weekAgo } }, select: { userId: true, score: true, passed: true } }),
    prisma.test.groupBy({ by: ["userId"], where: { userId: { in: ids }, finishedAt: { not: null } }, _max: { finishedAt: true } }),
    Promise.all(ids.map(async (id) => [id, (await mistakeQuestionIds(id)).length] as const)),
  ]);
  const lastAt = new Map(last.map((l) => [l.userId, l._max.finishedAt]));
  const open = new Map(mistakes);

  const students = members
    .map(({ student }) => {
      const mine = week.filter((t) => t.userId === student.id);
      return {
        ...student,
        tests7d: mine.length,
        average7d: average(mine),
        passed7d: mine.filter((t) => t.passed).length,
        mistakes: open.get(student.id) ?? 0,
        lastTestAt: lastAt.get(student.id) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    groups: groupList,
    groupId: selected,
    summary: {
      students: students.length,
      tests7d: week.length,
      average7d: average(week),
      // Students who took no test this week: the ones to talk to.
      inactive7d: students.filter((s) => s.tests7d === 0).length,
    },
    students,
  };
};

/** The student must be in one of the teacher's active groups (group managers may open anyone). */
const ensureMayView = async (actor: Actor, studentId: string) => {
  if (seesAll(actor)) return;
  const member = await prisma.groupMembership.findFirst({
    where: { studentId, leftAt: null, group: { teacherId: actor.userId, status: "ACTIVE" } },
    select: { id: true },
  });
  if (!member) throw forbidden("This student is not in your groups");
};

export const studentKnowledge = async (actor: Actor, studentId: string) => {
  await ensureMayView(actor, studentId);
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, userNumber: true, studentNumber: true, avatarUrl: true, phone: true },
  });
  if (!student) throw notFound("Student not found");

  const weekAgo = new Date(Date.now() - WEEK_MS);
  const [recent, week, ids] = await Promise.all([
    prisma.test.findMany({
      where: { userId: studentId, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: 10,
      select: { id: true, score: true, passed: true, mode: true, ticket: true, totalQuestions: true, correctAnswers: true, finishedAt: true, course: { select: { title: true } } },
    }),
    prisma.test.findMany({ where: { userId: studentId, finishedAt: { gte: weekAgo } }, select: { score: true } }),
    mistakeQuestionIds(studentId),
  ]);

  // Every wrong answer to the questions still on the mistakes list, newest first.
  const wrong = ids.length
    ? await prisma.userAnswer.findMany({
        where: { questionId: { in: ids }, isCorrect: false, selectedIndex: { gte: 0 }, test: { userId: studentId, finishedAt: { not: null } } },
        orderBy: { test: { finishedAt: "desc" } },
        select: {
          questionId: true,
          selectedIndex: true,
          optionOrder: true,
          test: { select: { finishedAt: true } },
          question: { select: { text: true, imageUrl: true, options: true, correctIndex: true, lesson: { select: { title: true } } } },
        },
      })
    : [];

  const byQuestion = new Map<string, { times: number; row: (typeof wrong)[number] }>();
  for (const row of wrong) {
    const seen = byQuestion.get(row.questionId);
    if (seen) seen.times += 1;
    else byQuestion.set(row.questionId, { times: 1, row });
  }
  const mistakes = [...byQuestion.values()].map(({ times, row }) => {
    const options = optionList(row.question.options);
    // The index was of the shuffled options shown in that attempt; map it back to the stored option.
    const order = Array.isArray(row.optionOrder) ? (row.optionOrder as number[]) : null;
    const picked = order ? order[row.selectedIndex] : row.selectedIndex;
    return {
      questionId: row.questionId,
      text: row.question.text,
      imageUrl: row.question.imageUrl,
      topic: row.question.lesson?.title ?? null,
      chosen: options[picked] ?? null,
      correct: options[row.question.correctIndex] ?? null,
      times,
      lastAt: row.test.finishedAt,
    };
  });

  const topicCount = new Map<string, number>();
  for (const m of mistakes) if (m.topic) topicCount.set(m.topic, (topicCount.get(m.topic) ?? 0) + 1);

  return {
    student,
    week: { tests: week.length, average: week.length ? Math.round(week.reduce((s, t) => s + t.score, 0) / week.length) : null },
    recent: recent.map(({ course, ...t }) => ({ ...t, course: course?.title ?? null })),
    mistakes,
    weakTopics: [...topicCount.entries()].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
};
