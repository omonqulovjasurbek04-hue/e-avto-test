import { prisma } from "../config/database";

export const listUsers = async () => {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
};

export const getStatistics = async () => {
  const [totalUsers, totalCourses, totalQuestions, totalTests] =
    await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.question.count(),
      prisma.test.count({ where: { finishedAt: { not: null } } }),
    ]);

  const tests = await prisma.test.findMany({
    where: { finishedAt: { not: null } },
    select: { score: true, passed: true },
  });

  const count = tests.length;
  const sumScore = tests.reduce((acc, t) => acc + t.score, 0);
  const passedCount = tests.filter((t) => t.passed).length;

  const averageScore = count > 0 ? Math.round(sumScore / count) : 0;
  const passRate = count > 0 ? Math.round((passedCount / count) * 100) : 0;

  return {
    totalUsers,
    totalCourses,
    totalQuestions,
    totalTests,
    averageScore,
    passRate,
  };
};

export default { listUsers, getStatistics };
