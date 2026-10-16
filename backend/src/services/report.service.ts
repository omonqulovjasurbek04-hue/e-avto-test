import { prisma } from "../config/database";

const pct = (part: number, whole: number): number => (whole === 0 ? 0 : Math.round((part / whole) * 100));

/**
 * Finished test attempts per course in a period. Only attempts with finishedAt count: an abandoned
 * attempt has no score yet. Scores and pass flags are the server-computed values stored on the attempt.
 */
export const testResults = async (from: Date, to: Date, courseId?: string) => {
  const where = { finishedAt: { gte: from, lt: to }, ...(courseId ? { courseId } : {}) };
  const [byCourse, passedByCourse, students, courses] = await Promise.all([
    prisma.test.groupBy({ by: ["courseId"], where, _count: { _all: true }, _avg: { score: true, timeSpent: true } }),
    prisma.test.groupBy({ by: ["courseId"], where: { ...where, passed: true }, _count: { _all: true } }),
    prisma.test.groupBy({ by: ["courseId", "userId"], where }),
    prisma.course.findMany({ select: { id: true, title: true } }),
  ]);
  const title = new Map(courses.map((c) => [c.id, c.title]));
  const passed = new Map(passedByCourse.map((r) => [r.courseId, r._count._all]));
  const uniq = new Map<string | null, number>();
  for (const s of students) uniq.set(s.courseId, (uniq.get(s.courseId) ?? 0) + 1);

  const rows = byCourse
    .map((r) => ({
      courseId: r.courseId,
      course: r.courseId ? title.get(r.courseId) ?? null : null,
      attempts: r._count._all,
      students: uniq.get(r.courseId) ?? 0,
      passed: passed.get(r.courseId) ?? 0,
      passRate: pct(passed.get(r.courseId) ?? 0, r._count._all),
      averageScore: Math.round(r._avg.score ?? 0),
      averageSeconds: Math.round(r._avg.timeSpent ?? 0),
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const attempts = rows.reduce((n, r) => n + r.attempts, 0);
  const passedTotal = rows.reduce((n, r) => n + r.passed, 0);
  const weighted = rows.reduce((n, r) => n + r.averageScore * r.attempts, 0);
  return {
    from,
    to,
    total: {
      attempts,
      students: new Set(students.map((s) => s.userId)).size,
      passed: passedTotal,
      passRate: pct(passedTotal, attempts),
      averageScore: attempts === 0 ? 0 : Math.round(weighted / attempts),
    },
    rows,
  };
};

/**
 * Teaching load per teacher: groups, current students and scheduled lessons in the period.
 * "attendanceMissing" = lessons that already ended, were not cancelled and still have no finalized attendance.
 */
export const teacherWorkload = async (from: Date, to: Date) => {
  const now = new Date();
  const [teachers, slots] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ role: "TEACHER" }, { taughtGroups: { some: {} } }] },
      select: {
        id: true,
        name: true,
        taughtGroups: { select: { status: true, _count: { select: { members: { where: { leftAt: null } } } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.scheduleSlot.findMany({
      where: { startsAt: { gte: from, lt: to } },
      select: { startsAt: true, endsAt: true, status: true, group: { select: { teacherId: true } }, session: { select: { finalizedAt: true } } },
    }),
  ]);

  const load = new Map<string, { planned: number; done: number; cancelled: number; minutes: number; attendanceMissing: number }>();
  for (const s of slots) {
    const row = load.get(s.group.teacherId) ?? { planned: 0, done: 0, cancelled: 0, minutes: 0, attendanceMissing: 0 };
    if (s.status === "CANCELLED") row.cancelled += 1;
    else {
      if (s.status === "DONE" || s.session?.finalizedAt) row.done += 1;
      else row.planned += 1;
      row.minutes += Math.max(0, Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000));
      if (s.endsAt < now && !s.session?.finalizedAt) row.attendanceMissing += 1;
    }
    load.set(s.group.teacherId, row);
  }

  return {
    from,
    to,
    rows: teachers.map((t) => {
      const active = t.taughtGroups.filter((g) => g.status === "ACTIVE");
      const l = load.get(t.id) ?? { planned: 0, done: 0, cancelled: 0, minutes: 0, attendanceMissing: 0 };
      return {
        teacherId: t.id,
        name: t.name,
        activeGroups: active.length,
        students: active.reduce((n, g) => n + g._count.members, 0),
        lessons: l.planned + l.done,
        ...l,
        hours: Math.round((l.minutes / 60) * 10) / 10,
      };
    }),
  };
};
