import { totalStudyMinutes } from "./studyTime.service";
import { prisma } from "../config/database";
import { getMe } from "./auth.service";
import { isEnrollmentActive } from "./access.service";

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

/** Weights of the readiness score: lessons done, recent exam average, recent exams passed. */
const READINESS_WEIGHTS = { lessons: 0.4, score: 0.4, passRate: 0.2 } as const;
/** How many of the latest exam / ticket attempts describe the current level. */
const RECENT_TESTS = 5;
export const READY_AT = 85;
const ALMOST_AT = 60;

type FinishedTest = { score: number; passed: boolean; finishedAt: Date | null; mode: string };

/**
 * How ready the student is for the state exam, 0..100: the share of the bought courses' lessons
 * completed, the average of the latest exam/ticket attempts and how many of them passed. Practice
 * rounds (own mistakes, saved questions) do not count.
 */
export const readiness = async (userId: string, tests: FinishedTest[]) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: { courseId: true, status: true, startsAt: true, expiresAt: true, course: { select: { title: true, category: { select: { name: true } } } } },
  });
  const active = enrollments.filter((e) => isEnrollmentActive(e));
  const courseIds = active.map((e) => e.courseId);
  const [totalLessons, doneLessons] = courseIds.length
    ? await Promise.all([
        prisma.lesson.count({ where: { courseId: { in: courseIds }, isPublished: true } }),
        prisma.lessonProgress.count({ where: { userId, completed: true, lesson: { courseId: { in: courseIds }, isPublished: true } } }),
      ])
    : [0, 0];

  const recent = tests
    .filter((t) => t.mode === "EXAM")
    .sort((a, b) => b.finishedAt!.getTime() - a.finishedAt!.getTime())
    .slice(0, RECENT_TESTS);
  const lessonsPercent = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
  const recentAverage = recent.length ? Math.round(recent.reduce((sum, t) => sum + t.score, 0) / recent.length) : 0;
  const recentPassRate = recent.length ? Math.round((recent.filter((t) => t.passed).length / recent.length) * 100) : 0;
  const percent = Math.round(
    READINESS_WEIGHTS.lessons * lessonsPercent + READINESS_WEIGHTS.score * recentAverage + READINESS_WEIGHTS.passRate * recentPassRate
  );

  return {
    percent,
    level: percent >= READY_AT ? "ready" : percent >= ALMOST_AT ? "almost" : "notYet",
    lessons: { completed: doneLessons, total: totalLessons, percent: lessonsPercent },
    recentTests: recent.length,
    recentAverage,
    recentPassRate,
    // The courses the student is preparing with ("B toifa", …), shown on the profile.
    courses: active.map((e) => ({ title: e.course.title, category: e.course.category?.name ?? null })),
  };
};

export const getStatistics = async (userId: string) => {
  const [tests, completedLessons, lessonProgress, trackedMinutes] = await Promise.all([
    prisma.test.findMany({
      where: { userId, finishedAt: { not: null } },
      select: { score: true, passed: true, timeSpent: true, finishedAt: true, mode: true },
    }),
    prisma.lessonProgress.count({ where: { userId, completed: true } }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: { percent: true, lesson: { select: { duration: true } } },
    }),
    totalStudyMinutes(userId),
  ]);

  const totalTests = tests.length;
  const totalScore = tests.reduce((sum, t) => sum + t.score, 0);
  const testSeconds = tests.reduce((sum, t) => sum + t.timeSpent, 0);
  const lessonSeconds = lessonProgress.reduce((sum, p) => sum + (p.lesson.duration * p.percent) / 100, 0);

  const streak = studyStreak(tests.map((t) => t.finishedAt!));
  const ready = await readiness(userId, tests);

  return {
    totalTests,
    averageScore: totalTests ? Math.round(totalScore / totalTests) : 0,
    bestScore: totalTests ? Math.max(...tests.map((t) => t.score)) : 0,
    passedTests: tests.filter((t) => t.passed).length,
    failedTests: tests.filter((t) => !t.passed).length,
    completedLessons,
    studyStreakDays: streak,
    // Real time on lesson and test pages; accounts from before tracking fall back to the old estimate
    // (test time plus the watched share of lesson videos).
    learningTime: Math.max(trackedMinutes, Math.round((testSeconds + lessonSeconds) / 60)),
    readiness: ready,
  };
};



export default { getProfile, getStatistics };
