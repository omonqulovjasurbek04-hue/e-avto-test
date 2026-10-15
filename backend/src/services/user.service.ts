import { prisma } from "../config/database";
import { env } from "../config/env";
import { ttlCache } from "../utils/ttlCache";
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

const LEADERBOARD_SIZE = 50;

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

interface LeaderRow {
  id: string;
  name: string;
  tests: number;
  average: number;
  lessons: number;
}

/** Aggregated in SQL so only the top entries are loaded, not every user. */
const computeLeaderboard = async () => {
  const rows = await prisma.$queryRaw<LeaderRow[]>`
    SELECT u.id, u.name,
           COALESCE(t.tests, 0)::int    AS tests,
           COALESCE(t.average, 0)::int  AS average,
           COALESCE(l.lessons, 0)::int  AS lessons
    FROM users u
    LEFT JOIN (
      SELECT "userId", COUNT(*) AS tests, ROUND(AVG(score)) AS average
      FROM tests WHERE "finishedAt" IS NOT NULL GROUP BY "userId"
    ) t ON t."userId" = u.id
    LEFT JOIN (
      SELECT "userId", COUNT(*) AS lessons
      FROM lesson_progress WHERE completed = true GROUP BY "userId"
    ) l ON l."userId" = u.id
    WHERE u."isActive" = true AND (t.tests IS NOT NULL OR l.lessons IS NOT NULL)
    ORDER BY (COALESCE(t.average, 0) * COALESCE(t.tests, 0) + COALESCE(l.lessons, 0) * 10) DESC,
             COALESCE(t.average, 0) DESC, u.id
    LIMIT ${LEADERBOARD_SIZE}`;

  return rows.map((r, index) => ({
    id: r.id,
    name: r.name,
    tests: r.tests,
    averageScore: r.average,
    points: r.average * r.tests + r.lessons * 10,
    rank: index + 1,
  }));
};

// The public top list is an aggregation over every finished test; a minute of staleness is invisible to visitors.
export const getLeaderboard = ttlCache(computeLeaderboard, () => env.LEADERBOARD_CACHE_SECONDS * 1000);

export default { getProfile, getStatistics, getLeaderboard };
