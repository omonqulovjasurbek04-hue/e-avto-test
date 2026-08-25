import { prisma } from "../config/database";

export const getStatistics = async (userId: string) => {
  const [tests, completedLessons, learningTime] = await Promise.all([
    prisma.test.findMany({
      where: { userId, finishedAt: { not: null } },
      select: { score: true, passed: true, timeSpent: true },
    }),
    prisma.lessonProgress.count({ where: { userId, completed: true } }),
    prisma.lessonProgress.aggregate({ where: { userId }, _sum: { percent: true } }),
  ]);

  const totalTests = tests.length;
  const totalScore = tests.reduce((sum, test) => sum + test.score, 0);
  return {
    totalTests,
    averageScore: totalTests ? Math.round(totalScore / totalTests) : 0,
    bestScore: totalTests ? Math.max(...tests.map((test) => test.score)) : 0,
    passedTests: tests.filter((test) => test.passed).length,
    failedTests: tests.filter((test) => !test.passed).length,
    completedLessons,
    // Kept as a simple engagement value until video watch time is recorded separately.
    learningTime: learningTime._sum.percent ?? 0,
  };
};

export const getLeaderboard = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      tests: { where: { finishedAt: { not: null } }, select: { score: true } },
      lessonProgress: { where: { completed: true }, select: { id: true } },
    },
  });

  return users
    .map((user) => {
      const tests = user.tests.length;
      const averageScore = tests
        ? Math.round(user.tests.reduce((sum, test) => sum + test.score, 0) / tests)
        : 0;
      const points = averageScore * tests + user.lessonProgress.length * 10;
      return { id: user.id, name: user.name, tests, averageScore, points };
    })
    .sort((a, b) => b.points - a.points || b.averageScore - a.averageScore)
    .map((user, index) => ({ ...user, rank: index + 1 }));
};
