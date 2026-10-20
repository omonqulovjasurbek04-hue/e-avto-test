import { prisma } from "../config/database";
import { notFound } from "../utils/errors";

/**
 * Questions whose latest answer by this student (in a finished attempt) was wrong. Answering one correctly
 * later takes it off the list, the way "Xatolarim" works on other driving-test sites.
 */
export const mistakeQuestionIds = async (userId: string): Promise<string[]> => {
  const rows = await prisma.$queryRaw<{ questionId: string; isCorrect: boolean }[]>`
    SELECT DISTINCT ON (ua."questionId") ua."questionId", ua."isCorrect"
    FROM user_answers ua
    JOIN tests t ON t.id = ua."testId"
    WHERE t."userId" = ${userId} AND t."finishedAt" IS NOT NULL AND ua."selectedIndex" >= 0
    ORDER BY ua."questionId", t."finishedAt" DESC`;
  return rows.filter((r) => !r.isCorrect).map((r) => r.questionId);
};

export const savedQuestionIds = async (userId: string): Promise<string[]> =>
  (await prisma.savedQuestion.findMany({ where: { userId }, select: { questionId: true }, orderBy: { createdAt: "desc" } }))
    .map((s) => s.questionId);

/** Counts for the practice cards on the tests page. */
export const practiceSummary = async (userId: string) => {
  const [mistakes, saved] = await Promise.all([mistakeQuestionIds(userId), savedQuestionIds(userId)]);
  return { mistakes: mistakes.length, saved: saved.length, savedIds: saved };
};

export const saveQuestion = async (userId: string, questionId: string) => {
  if (!(await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } }))) throw notFound("Question not found");
  await prisma.savedQuestion.upsert({ where: { userId_questionId: { userId, questionId } }, create: { userId, questionId }, update: {} });
  return { saved: true };
};

export const unsaveQuestion = async (userId: string, questionId: string) => {
  await prisma.savedQuestion.deleteMany({ where: { userId, questionId } });
  return { saved: false };
};
