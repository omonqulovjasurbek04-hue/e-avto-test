import { prisma } from "../config/database";
import { getMe } from "./auth.service";

const TASHKENT_OFFSET_MS = 5 * 3_600_000;
const DAY_MS = 86_400_000;

/** Tashkent calendar day (UTC+5, no DST) as YYYY-MM-DD. */
const localDay = (d: Date) => new Date(d.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);

/**
 * Consecutive local days with at least one finished test, counted back from today
 * (or from yesterday, so a streak is not lost before today's test is taken).
 */
export const studyStreak = (finishedAt: Date[], now: Date = new Date()): number => {
  const days = new Set(finishedAt.map(localDay));
  let cursor = now.getTime();
  if (!days.has(localDay(new Date(cursor)))) cursor -= DAY_MS;
  let streak = 0;
  while (days.has(localDay(new Date(cursor)))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
};


export const getProfile = async (userId: string) => {
  const [user, progress] = await Promise.all([
    getMe(userId),
    prisma.progress.findMany({ where: { userId }, include: { course: { select: { title: true } } } }),
  ]);
  return {
    user: {
      ...user,
      progress: progress.map((p) => ({
        courseId: p.courseId,
        course: p.course.title,
        completedLessons: p.completedLessons,
        pct: p.percent,
      })),
    },
  };
};

export const getStatistics = async (userId: string) => {
  const [tests, completedLessons, lessonProgress] = await Promise.all([
    prisma.test.findMany({
      where: { userId, finishedAt: { not: null } },
      select: { score: true, passed: true, timeSpent: true, finishedAt: true },
    }),
    prisma.lessonProgress.count({ where: { userId, completed: true } }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: { percent: true, lesson: { select: { duration: true } } },
    }),
  ]);

  const totalTests = tests.length;
  const totalScore = tests.reduce((sum, t) => sum + t.score, 0);
  const testSeconds = tests.reduce((sum, t) => sum + t.timeSpent, 0);
  const lessonSeconds = lessonProgress.reduce((sum, p) => sum + (p.lesson.duration * p.percent) / 100, 0);

  const streak = studyStreak(tests.map((t) => t.finishedAt!));

  return {
    totalTests,
    averageScore: totalTests ? Math.round(totalScore / totalTests) : 0,
    bestScore: totalTests ? Math.max(...tests.map((t) => t.score)) : 0,
    passedTests: tests.filter((t) => t.passed).length,
    failedTests: tests.filter((t) => !t.passed).length,
    completedLessons,
    studyStreakDays: streak,
    // Minutes spent in tests plus the watched share of lesson videos.
    learningTime: Math.round((testSeconds + lessonSeconds) / 60),
  };
};



export default { getProfile, getStatistics };
