import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { TestStartInput, TestAnswerInput, TestFinishInput } from "../validators/test";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors";
import { buildResult } from "./result.service";
import { notify } from "./notification.service";
import { accessibleCourseIds, canAccessCourse } from "./access.service";

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

const optionCount = (options: Prisma.JsonValue): number =>
  Array.isArray(options) ? options.length : 0;

const elapsedSeconds = (startedAt: Date): number =>
  Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));

export const startTest = async (userId: string, input: TestStartInput, role = "USER") => {
  const viewer = { userId, role };
  const where: Prisma.QuestionWhereInput = { isPublished: true };

  // A test on a course (or one of its lessons) needs the same access as watching it.
  let targetCourseId = input.courseId ?? null;
  if (!targetCourseId && input.lessonId) {
    targetCourseId = (await prisma.lesson.findUnique({ where: { id: input.lessonId }, select: { courseId: true } }))?.courseId ?? null;
  }
  if (targetCourseId) {
    if (!(await canAccessCourse(viewer, targetCourseId))) throw forbidden("You need access to this course to take its test");
  } else {
    // A mixed test may only draw from courses the user can open.
    const allowed = await accessibleCourseIds(viewer);
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
  // (Also when the test was started from one of the course's lessons.)
  const config = targetCourseId ? await prisma.testConfig.findUnique({ where: { courseId: targetCourseId } }) : null;
  if (config?.maxAttempts) {
    const used = await prisma.test.count({ where: { userId, courseId: targetCourseId! } });
    if (used >= config.maxAttempts) throw conflict("Attempt limit reached for this course");
  }
  if (input.courseId) where.courseId = input.courseId;
  if (input.lessonId) where.lessonId = input.lessonId;

  const available = await prisma.question.findMany({ where });
  if (available.length === 0) throw badRequest("No questions available");

  const requested = config?.questionCount ?? input.count ?? DEFAULT_QUESTION_COUNT;
  const totalQuestions = Math.min(requested, available.length);
  const picked = shuffle(available).slice(0, totalQuestions);
  // Time follows the number of questions actually served, not the number requested.
  const duration = config?.durationSeconds ?? durationFor(totalQuestions);

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

    await tx.test.update({
      where: { id: testId },
      data: {
        finishedAt: new Date(),
        totalQuestions: total,
        correctAnswers,
        wrongAnswers,
        score,
        passed: score >= current.passScore,
        timeSpent: Math.min(elapsedSeconds(current.startedAt), current.duration),
      },
    });
    return { score, correctAnswers, total, passed: score >= current.passScore };
  });

  // Only the request that actually closed the attempt notifies (double submits stay silent); in-app only, no e-mail.
  if (outcome) {
    const { score, correctAnswers, total, passed } = outcome;
    await notify({ userId, type: "TEST_RESULT", dedupeKey: `test:${testId}`, template: passed ? "TEST_PASSED" : "TEST_FAILED", vars: { score, correct: correctAnswers, total } }).catch(() => undefined);
  }

  return buildResult(testId, userId);
};

export default { startTest, answerQuestion, finishTest };
