import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { conflict, forbidden, notFound } from "../utils/errors";

const toOrder = (value: Prisma.JsonValue | null | undefined, length: number): number[] =>
  Array.isArray(value) ? (value as number[]) : Array.from({ length }, (_, i) => i);

export const listResults = async (userId: string) => {
  const tests = await prisma.test.findMany({
    where: { userId, finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    select: {
      id: true,
      courseId: true,
      totalQuestions: true,
      correctAnswers: true,
      wrongAnswers: true,
      score: true,
      passed: true,
      mode: true,
      ticket: true,
      timeSpent: true,
      finishedAt: true,
      course: { select: { title: true } },
    },
  });

  return tests.map((t) => ({
    id: t.id,
    courseId: t.courseId ?? undefined,
    courseTitle: t.course?.title ?? undefined,
    totalQuestions: t.totalQuestions,
    correctAnswers: t.correctAnswers,
    wrongAnswers: t.wrongAnswers,
    skippedAnswers: t.totalQuestions - t.correctAnswers - t.wrongAnswers,
    score: t.score,
    passed: t.passed,
    mode: t.mode,
    ticket: t.ticket,
    timeSpent: t.timeSpent,
    createdAt: t.finishedAt,
  }));
};

/**
 * Full result with per-question review. Correct answers are only exposed for finished attempts
 * owned by the requesting user.
 */
export const buildResult = async (id: string, userId: string) => {
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      course: { select: { title: true } },
      answers: {
        include: {
          question: {
            select: { text: true, imageUrl: true, options: true, correctIndex: true, explanation: true },
          },
        },
      },
    },
  });

  if (!test) throw notFound("Result not found");
  if (test.userId !== userId) throw forbidden();
  if (!test.finishedAt) throw conflict("Test is not finished yet");

  return {
    id: test.id,
    courseId: test.courseId ?? undefined,
    courseTitle: test.course?.title ?? undefined,
    totalQuestions: test.totalQuestions,
    correctAnswers: test.correctAnswers,
    wrongAnswers: test.wrongAnswers,
    skippedAnswers: test.totalQuestions - test.correctAnswers - test.wrongAnswers,
    score: test.score,
    passed: test.passed,
    mode: test.mode,
    ticket: test.ticket,
    maxMistakes: test.maxMistakes ?? undefined,
    timeSpent: test.timeSpent,
    createdAt: test.finishedAt,
    answers: test.answers.map((a) => {
      const original = a.question.options as unknown as string[];
      const order = toOrder(a.optionOrder, original.length);
      return {
        questionId: a.questionId,
        text: a.question.text,
        imageUrl: a.question.imageUrl ?? undefined,
        options: order.map((i) => original[i]),
        correctIndex: order.indexOf(a.question.correctIndex),
        selectedIndex: a.selectedIndex < 0 ? null : a.selectedIndex,
        explanation: a.question.explanation ?? undefined,
      };
    }),
  };
};

export const getResult = buildResult;

export default { listResults, getResult, buildResult };
