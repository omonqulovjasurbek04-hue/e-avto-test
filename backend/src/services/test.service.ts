import { prisma } from "../config/database";
import { TestStartInput, TestAnswerInput, TestFinishInput } from "../validators/test";

const PASS_THRESHOLD = 70;

const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const startTest = async (userId: string, input: TestStartInput) => {
  const where: any = {};
  if (input.courseId) {
    where.courseId = input.courseId;
  }

  const available = await prisma.question.findMany({ where });

  if (available.length === 0) {
    const err: any = new Error("No questions available");
    err.status = 400;
    throw err;
  }

  const requested = input.count ?? 50;
  const totalQuestions = Math.min(requested, available.length);
  const picked = shuffle(available).slice(0, totalQuestions);

  const test = await prisma.test.create({
    data: {
      userId,
      courseId: input.courseId,
      totalQuestions,
      answers: {
        create: picked.map((q) => ({
          questionId: q.id,
          selectedIndex: -1,
          isCorrect: false,
        })),
      },
    },
  });

  const questions = picked.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    order: q.order,
  }));

  return {
    test: {
      id: test.id,
      totalQuestions: test.totalQuestions,
      startedAt: test.startedAt,
    },
    questions,
  };
};

export const answerQuestion = async (
  testId: string,
  userId: string,
  input: TestAnswerInput
) => {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) {
    const err: any = new Error("Test not found");
    err.status = 404;
    throw err;
  }
  if (test.userId !== userId) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  if (test.finishedAt) {
    const err: any = new Error("Test already finished");
    err.status = 400;
    throw err;
  }

  const answer = await prisma.userAnswer.findFirst({
    where: { testId, questionId: input.questionId },
    include: { question: true },
  });
  if (!answer) {
    const err: any = new Error("Question does not belong to this test");
    err.status = 400;
    throw err;
  }
  const question = answer.question;
  const options = question.options as unknown[];
  if (input.selectedIndex >= options.length) {
    const err: any = new Error("Selected answer is out of range");
    err.status = 400;
    throw err;
  }

  const isCorrect = input.selectedIndex === question.correctIndex;

  await prisma.userAnswer.update({
    where: { id: answer.id },
    data: { selectedIndex: input.selectedIndex, isCorrect },
  });

  return { success: true };
};

export const finishTest = async (
  testId: string,
  userId: string,
  input: TestFinishInput
) => {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      answers: {
        include: {
          question: { select: { correctIndex: true } },
        },
      },
    },
  });

  if (!test) {
    const err: any = new Error("Test not found");
    err.status = 404;
    throw err;
  }
  if (test.userId !== userId) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  if (test.finishedAt) {
    const err: any = new Error("Test already finished");
    err.status = 400;
    throw err;
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - test.startedAt.getTime()) / 1000)
  );
  let correctAnswers = 0;
  const correctedAnswers = test.answers.map((ans) => {
    const correct = ans.selectedIndex === ans.question.correctIndex;
    correctAnswers += correct ? 1 : 0;
    return { id: ans.id, correct };
  });

  const total = test.answers.length;
  const wrongAnswers = total - correctAnswers;
  const score = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
  const passed = score >= PASS_THRESHOLD;

  const updated = await prisma.$transaction(async (tx) => {
    await Promise.all(
      correctedAnswers.map(({ id, correct }) =>
        tx.userAnswer.update({ where: { id }, data: { isCorrect: correct } })
      )
    );
    return tx.test.update({
      where: { id: testId },
      data: {
        finishedAt: new Date(),
        totalQuestions: total,
        correctAnswers,
        wrongAnswers,
        score,
        passed,
        timeSpent: elapsedSeconds,
      },
    });
  });

  return {
    id: updated.id,
    courseId: updated.courseId ?? undefined,
    totalQuestions: updated.totalQuestions,
    correctAnswers: updated.correctAnswers,
    wrongAnswers: updated.wrongAnswers,
    score: updated.score,
    passed: updated.passed,
    timeSpent: updated.timeSpent,
  };
};

export default { startTest, answerQuestion, finishTest };
