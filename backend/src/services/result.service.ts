import { prisma } from "../config/database";

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
      timeSpent: true,
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
    score: t.score,
    passed: t.passed,
    timeSpent: t.timeSpent,
  }));
};

export const getResult = async (id: string, userId: string) => {
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      course: { select: { title: true } },
      answers: {
        include: {
          question: {
            select: {
              text: true,
              options: true,
              correctIndex: true,
              explanation: true,
            },
          },
        },
      },
    },
  });

  if (!test) {
    const err: any = new Error("Result not found");
    err.status = 404;
    throw err;
  }

  if (test.userId !== userId) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  return {
    id: test.id,
    courseId: test.courseId ?? undefined,
    courseTitle: test.course?.title ?? undefined,
    totalQuestions: test.totalQuestions,
    correctAnswers: test.correctAnswers,
    wrongAnswers: test.wrongAnswers,
    score: test.score,
    passed: test.passed,
    timeSpent: test.timeSpent,
    answers: test.answers.map((a) => ({
      questionId: a.questionId,
      text: a.question.text,
      options: a.question.options as unknown as string[],
      correctIndex: a.question.correctIndex,
      selectedIndex: a.selectedIndex < 0 ? null : a.selectedIndex,
      explanation: a.question.explanation ?? undefined,
    })),
  };
};

export default { listResults, getResult };
