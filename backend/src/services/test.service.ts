import crypto from "crypto";
import { clearLeaderboardCache } from "./leaderboard.service";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { TestStartInput, TestAnswerInput, TestFinishInput, TICKET_COUNT, TICKET_SIZE } from "../validators/test";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors";
import { buildResult } from "./result.service";
import { notify } from "./notification.service";
import { mistakeQuestionIds, savedQuestionIds } from "./practice.service";
import { accessibleCourseIds, canAccessCourse, canAccessLesson, lessonStates } from "./access.service";

export const PASS_THRESHOLD = 70;
const DEFAULT_QUESTION_COUNT = 50;
// Network latency tolerance when comparing client actions against the server clock.
const GRACE_SECONDS = 10;

const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Time allowed for an attempt, in seconds (20 -> 20 min, 50 -> 45 min, 100 -> 90 min). */
export const durationFor = (count: number): number => {
  if (count <= 20) return 20 * 60;
  if (count <= 50) return 45 * 60;
  return 90 * 60;
};

/**
 * The questions of exam ticket `ticket` (1-based): the course pool in a fixed order (a hash of course and
 * question id, so it does not depend on when questions were added), cut into consecutive blocks. With
 * TICKET_COUNT * TICKET_SIZE questions every ticket is different; a smaller pool wraps around.
 */
export const ticketQuestions = <T extends { id: string }>(pool: T[], courseId: string, ticket: number): T[] => {
  if (pool.length === 0) return [];
  const key = (q: T) => crypto.createHash("sha256").update(`${courseId}:${q.id}`).digest("hex");
  const ordered = pool.map((q) => ({ q, k: key(q) })).sort((a, b) => (a.k < b.k ? -1 : 1)).map((x) => x.q);
  const size = Math.min(TICKET_SIZE, ordered.length);
  const start = ((ticket - 1) * TICKET_SIZE) % ordered.length;
  return Array.from({ length: size }, (_, i) => ordered[(start + i) % ordered.length]);
};

const optionCount = (options: Prisma.JsonValue): number =>
  Array.isArray(options) ? options.length : 0;

const elapsedSeconds = (startedAt: Date): number =>
  Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));

/** Lessons of these courses that are not open for the viewer yet: their questions stay out of tests. */
const closedLessonIds = async (viewer: { userId: string; role: string }, courseIds: string[]): Promise<string[]> => {
  const states = await lessonStates(viewer, courseIds);
  return [...states].filter(([, st]) => st.locked).map(([id]) => id);
};

export const startTest = async (userId: string, input: TestStartInput, role = "USER") => {
  const viewer = { userId, role };
  const mode = input.mode ?? "EXAM";
  const practice = mode !== "EXAM";
  const where: Prisma.QuestionWhereInput = { isPublished: true };
  if (practice) {
    const ids = mode === "MISTAKES" ? await mistakeQuestionIds(userId) : await savedQuestionIds(userId);
    if (ids.length === 0) throw badRequest(mode === "MISTAKES" ? "You have no mistakes to practise" : "You have no saved questions");
    where.id = { in: ids };
  }

  // A test on a course (or one of its lessons) needs the same access as watching it.
  let targetCourseId = input.courseId ?? null;
  if (!targetCourseId && input.lessonId) {
    targetCourseId = (await prisma.lesson.findUnique({ where: { id: input.lessonId }, select: { courseId: true } }))?.courseId ?? null;
  }
  if (targetCourseId) {
    if (!(await canAccessCourse(viewer, targetCourseId))) throw forbidden("You need access to this course to take its test");
    // A lesson's test opens together with the lesson (attendance or the step-by-step schedule).
    if (input.lessonId && !(await canAccessLesson(viewer, { id: input.lessonId, courseId: targetCourseId }))) {
      throw forbidden("This lesson is not open for you yet");
    }
  } else {
    // A mixed test may only draw from courses the user can open.
    const allowed = await accessibleCourseIds(viewer);
    // Without any purchased course there is no test to take.
    if (allowed !== "all" && allowed.size === 0) throw forbidden("You need an active course to take tests");
    if (allowed !== "all") {
      const ids = [...allowed];
      where.OR = [
        { courseId: { in: ids } },
        { courseId: null, lessonId: null },
        { courseId: null, lesson: { courseId: { in: ids } } },
      ];
    }
  }

  // Exam rules of the course (if the admin configured any) override whatever the client asks for.
  // (Also when the test was started from one of the course's lessons.) Practice ignores them.
  const config = targetCourseId && !practice ? await prisma.testConfig.findUnique({ where: { courseId: targetCourseId } }) : null;
  // Tickets are practice before the exam: they do not use up the course's exam attempts.
  if (config?.maxAttempts && !input.ticket) {
    const used = await prisma.test.count({ where: { userId, courseId: targetCourseId!, mode: "EXAM" } });
    if (used >= config.maxAttempts) throw conflict("Attempt limit reached for this course");
  }
  if (input.courseId) where.courseId = input.courseId;
  if (input.lessonId) where.lessonId = input.lessonId;

  // Questions of lessons that are not open yet stay out of course and mixed tests.
  if (!input.lessonId) {
    const scope = targetCourseId ? [targetCourseId] : await (async () => {
      const allowed = await accessibleCourseIds(viewer);
      if (allowed !== "all") return [...allowed];
      return (await prisma.course.findMany({ where: { isPublished: true }, select: { id: true } })).map((c) => c.id);
    })();
    const closed = await closedLessonIds(viewer, scope);
    if (closed.length) where.AND = [{ OR: [{ lessonId: null }, { lessonId: { notIn: closed } }] }];
  }

  const available = await prisma.question.findMany({ where });
  if (available.length === 0) throw badRequest("No questions available");

  // A ticket always serves the same questions in the same order; any other test draws at random.
  const requested = config?.questionCount ?? input.count ?? DEFAULT_QUESTION_COUNT;
  const picked = input.ticket
    ? ticketQuestions(available, targetCourseId!, input.ticket)
    : shuffle(available).slice(0, Math.min(requested, available.length));
  const totalQuestions = picked.length;
  // Time follows the number of questions actually served, not the number requested.
  const duration = (!input.ticket && config?.durationSeconds) || durationFor(totalQuestions);

  // Every attempt gets its own question order and option order (Fisher-Yates).
  const prepared = picked.map((q) => ({
    question: q,
    optionOrder: shuffle(Array.from({ length: optionCount(q.options) }, (_, i) => i)),
  }));

  const test = await prisma.test.create({
    data: {
      userId,
      courseId: targetCourseId ?? undefined,
      totalQuestions,
      duration,
      passScore: config?.passScore ?? PASS_THRESHOLD,
      maxMistakes: config?.maxMistakes ?? null,
      mode,
      ticket: input.ticket ?? null,
      answers: {
        create: prepared.map(({ question, optionOrder }) => ({
          questionId: question.id,
          selectedIndex: -1,
          isCorrect: false,
          optionOrder,
        })),
      },
    },
  });

  // correctIndex and explanation are deliberately NOT sent while the attempt is active.
  const questions = prepared.map(({ question, optionOrder }, idx) => {
    const options = question.options as string[];
    return {
      id: question.id,
      text: question.text,
      imageUrl: question.imageUrl,
      options: optionOrder.map((i) => options[i]),
      order: idx + 1,
    };
  });

  return {
    test: {
      id: test.id,
      totalQuestions: test.totalQuestions,
      duration: test.duration,
      startedAt: test.startedAt,
      mode: test.mode,
      maxMistakes: test.maxMistakes,
      ticket: test.ticket,
    },
    questions,
  };
};

const loadOwnedTest = async (testId: string, userId: string) => {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw notFound("Test not found");
  if (test.userId !== userId) throw forbidden();
  return test;
};

const isExpired = (test: { startedAt: Date; duration: number }): boolean =>
  elapsedSeconds(test.startedAt) > test.duration + GRACE_SECONDS;

type Db = Prisma.TransactionClient;

/**
 * Stores answers of an attempt that is still open, all or nothing. Returns false when a question does not
 * belong to the attempt. Must run inside a transaction that holds a lock on the attempt row (see below).
 */
const saveAnswers = async (tx: Db, testId: string, inputs: TestAnswerInput[]): Promise<boolean> => {
  if (inputs.length === 0) return true;
  const rows = await tx.userAnswer.findMany({
    where: { testId, questionId: { in: inputs.map((i) => i.questionId) } },
    select: { id: true, questionId: true, optionOrder: true, question: { select: { options: true, correctIndex: true } } },
  });
  const byQuestion = new Map(rows.map((r) => [r.questionId, r]));
  for (const input of inputs) {
    const row = byQuestion.get(input.questionId);
    if (!row) return false;
    if (input.selectedIndex >= optionCount(row.question.options)) throw badRequest("Selected answer is out of range");
    const order = Array.isArray(row.optionOrder) ? (row.optionOrder as number[]) : null;
    const originalIndex = order ? order[input.selectedIndex] : input.selectedIndex;
    await tx.userAnswer.update({
      where: { id: row.id },
      data: { selectedIndex: input.selectedIndex, isCorrect: originalIndex === row.question.correctIndex },
    });
  }
  return true;
};

/**
 * Answering takes a SHARE lock and finishing an UPDATE lock on the attempt row, so an answer can never land
 * after the score was computed, and two finishes cannot both grade.
 */
const lockAttempt = (tx: Db, testId: string, mode: "share" | "update") =>
  mode === "share"
    ? tx.$queryRaw`SELECT id FROM tests WHERE id = ${testId} FOR SHARE`
    : tx.$queryRaw`SELECT id FROM tests WHERE id = ${testId} FOR UPDATE`;

export const answerQuestion = async (testId: string, userId: string, input: TestAnswerInput) => {
  await loadOwnedTest(testId, userId);
  return prisma.$transaction(async (tx) => {
    await lockAttempt(tx, testId, "share");
    const test = await tx.test.findUniqueOrThrow({ where: { id: testId } });
    if (test.finishedAt) throw badRequest("Test already finished");
    if (isExpired(test)) throw badRequest("Time is over for this test");
    if (!(await saveAnswers(tx, testId, [input]))) throw badRequest("Question does not belong to this test");
    return { saved: true };
  });
};

export const finishTest = async (testId: string, userId: string, input: TestFinishInput) => {
  const test = await loadOwnedTest(testId, userId);

  // Idempotent: a repeated submit returns the stored result instead of failing or duplicating.
  if (test.finishedAt) return buildResult(testId, userId);

  const outcome = await prisma.$transaction(async (tx) => {
    await lockAttempt(tx, testId, "update");
    const current = await tx.test.findUniqueOrThrow({ where: { id: testId } });
    if (current.finishedAt) return null; // another request finished it while we waited for the lock

    // Answers that arrive after the deadline are ignored; only what was saved in time counts.
    if (input.answers && !isExpired(current)) {
      if (!(await saveAnswers(tx, testId, input.answers))) throw badRequest("Question does not belong to this test");
    }

    const answers = await tx.userAnswer.findMany({ where: { testId }, select: { selectedIndex: true, isCorrect: true } });
    const total = answers.length;
    const answered = answers.filter((a) => a.selectedIndex >= 0);
    const correctAnswers = answered.filter((a) => a.isCorrect).length;
    const wrongAnswers = answered.length - correctAnswers;
    const score = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
    // Unanswered questions count as mistakes, as in the official exam.
    const withinMistakes = current.maxMistakes === null || total - correctAnswers <= current.maxMistakes;
    const passed = score >= current.passScore && withinMistakes;

    await tx.test.update({
      where: { id: testId },
      data: {
        finishedAt: new Date(),
        totalQuestions: total,
        correctAnswers,
        wrongAnswers,
        score,
        passed,
        timeSpent: Math.min(elapsedSeconds(current.startedAt), current.duration),
      },
    });
    return { score, correctAnswers, total, passed, practice: current.mode !== "EXAM" };
  });

  // Only the request that actually closed the attempt notifies (double submits stay silent); in-app only, no e-mail.
  if (outcome && !outcome.practice) {
    clearLeaderboardCache(); // the new result shows up in the ranking right away
    const { score, correctAnswers, total, passed } = outcome;
    await notify({ userId, type: "TEST_RESULT", dedupeKey: `test:${testId}`, template: passed ? "TEST_PASSED" : "TEST_FAILED", vars: { score, correct: correctAnswers, total } }).catch(() => undefined);
  }

  return buildResult(testId, userId);
};

export default { startTest, answerQuestion, finishTest };

/** At or above this score a ticket counts as learned; below it the ticket should be taken again. */
export const TICKET_LEARNED_SCORE = 90;

export type TicketStatus = { ticket: number; status: "active" | "passed" | "retry"; score: number | null; testId: string | null };

/**
 * The student's state on every ticket of a course they have tried: the latest finished attempt decides
 * learned/retry; an attempt still running (and not timed out) shows as active.
 */
export const ticketStatuses = async (userId: string, courseId: string, role = "USER") => {
  const viewer = { userId, role };
  if (!(await canAccessCourse(viewer, courseId))) throw forbidden("You need access to this course to take its test");
  const attempts = await prisma.test.findMany({
    where: { userId, courseId, ticket: { not: null } },
    select: { id: true, ticket: true, score: true, finishedAt: true, startedAt: true, duration: true },
    orderBy: { startedAt: "desc" },
  });
  const byTicket = new Map<number, TicketStatus>();
  for (const a of attempts) {
    const ticket = a.ticket!;
    if (byTicket.has(ticket)) continue;
    if (!a.finishedAt) {
      // A running attempt is only the newest one; an abandoned (timed-out) one is skipped.
      if (!isExpired(a)) byTicket.set(ticket, { ticket, status: "active", score: null, testId: a.id });
      continue;
    }
    byTicket.set(ticket, { ticket, status: a.score >= TICKET_LEARNED_SCORE ? "passed" : "retry", score: a.score, testId: a.id });
  }
  // The same pool a ticket draws from: published questions of the course outside lessons not open yet.
  const closed = await closedLessonIds(viewer, [courseId]);
  const pool = await prisma.question.count({
    where: { isPublished: true, courseId, ...(closed.length ? { OR: [{ lessonId: null }, { lessonId: { notIn: closed } }] } : {}) },
  });
  return {
    count: TICKET_COUNT,
    size: Math.min(TICKET_SIZE, pool),
    learnedScore: TICKET_LEARNED_SCORE,
    tickets: [...byTicket.values()].sort((a, b) => a.ticket - b.ticket),
  };
};
