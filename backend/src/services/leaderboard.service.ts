import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/env";

/**
 * Student leaderboard. Everything is computed on the server from finished test attempts.
 *
 * Points (per student, summed over courses):
 *   +10 per correct answer, +20 when the attempt is 100% correct — counted for the BEST attempt per
 *       course only, so re-taking the same test cannot inflate the score;
 *   +10 once per course when the very first attempt of that course was passed.
 *   Wrong answers give 0.
 * Accuracy = all correct answers / all questions over every counted attempt.
 *
 * Privacy: the public list contains only students who opted in, under a shortened name ("Azizbek K.").
 * Staff (admin reports) see full names of everyone.
 */
export const POINTS = { perCorrect: 10, perfectBonus: 20, firstTryPassBonus: 10 } as const;
const PUBLIC_SIZE = 50;

export type LeaderboardSort = "points" | "accuracy" | "tests";
export type LeaderboardPeriod = "all" | "month" | "week";

interface Row {
  userId: string;
  name: string;
  optIn: boolean;
  points: number;
  tests: number;
  correct: number;
  asked: number;
  mainCourseId: string | null;
  lastAt: Date;
}

const since = (period: LeaderboardPeriod) =>
  period === "week" ? new Date(Date.now() - 7 * 86_400_000) : period === "month" ? new Date(Date.now() - 30 * 86_400_000) : null;

/** One aggregated row per student (SQL does the heavy lifting; no per-user queries). */
const aggregate = async (courseId: string | null, period: LeaderboardPeriod): Promise<Row[]> => {
  const from = since(period);
  const courseFilter = courseId ? Prisma.sql`AND t."courseId" = ${courseId}` : Prisma.empty;
  const periodFilter = from ? Prisma.sql`WHERE a."finishedAt" >= ${from}` : Prisma.empty;
  const rows = await prisma.$queryRaw<Row[]>`
    WITH a AS (
      -- attempt number per student and course over ALL time, so "first attempt" means the real first one
      SELECT t."userId", t."courseId", t."correctAnswers" AS c, t."totalQuestions" AS q, t.score, t.passed, t."finishedAt",
             ROW_NUMBER() OVER (PARTITION BY t."userId", t."courseId" ORDER BY t."finishedAt", t.id) AS n
      FROM tests t
      JOIN users u ON u.id = t."userId"
      WHERE t."finishedAt" IS NOT NULL AND t.mode = 'EXAM' AND u."isActive" = true AND u.role = 'USER' ${courseFilter}
    ),
    per_course AS (
      SELECT a."userId", a."courseId",
             MAX(a.c * ${POINTS.perCorrect} + CASE WHEN a.q > 0 AND a.c = a.q THEN ${POINTS.perfectBonus} ELSE 0 END) AS best,
             MAX(CASE WHEN a.n = 1 AND a.passed THEN ${POINTS.firstTryPassBonus} ELSE 0 END) AS first_try,
             COUNT(*) AS attempts, SUM(a.c) AS correct, SUM(a.q) AS asked, MAX(a."finishedAt") AS last_at
      FROM a ${periodFilter}
      GROUP BY a."userId", a."courseId"
    )
    SELECT p."userId", u.name, u."leaderboardOptIn" AS "optIn",
           SUM(p.best + p.first_try)::int AS points,
           SUM(p.attempts)::int AS tests,
           SUM(p.correct)::int AS correct,
           SUM(p.asked)::int AS asked,
           (ARRAY_AGG(p."courseId" ORDER BY p.attempts DESC, p.last_at DESC))[1] AS "mainCourseId",
           MAX(p.last_at) AS "lastAt"
    FROM per_course p
    JOIN users u ON u.id = p."userId"
    GROUP BY p."userId", u.name, u."leaderboardOptIn"`;
  return rows;
};

// Short in-process cache per filter combination; finishing a test shows up within LEADERBOARD_CACHE_SECONDS.
const cache = new Map<string, { at: number; rows: Promise<Row[]> }>();
const cachedAggregate = (courseId: string | null, period: LeaderboardPeriod) => {
  const ttl = env.LEADERBOARD_CACHE_SECONDS * 1000;
  const key = `${courseId ?? "*"}|${period}`;
  const hit = cache.get(key);
  if (ttl > 0 && hit && Date.now() - hit.at < ttl) return hit.rows;
  const rows = aggregate(courseId, period);
  rows.catch(() => cache.delete(key));
  cache.set(key, { at: Date.now(), rows });
  return rows;
};
export const clearLeaderboardCache = () => cache.clear();

const accuracyOf = (r: Row) => (r.asked > 0 ? Math.round((r.correct / r.asked) * 100) : 0);

const compare = (sort: LeaderboardSort) => (a: Row, b: Row) => {
  const keys: Record<LeaderboardSort, (r: Row) => number[]> = {
    points: (r) => [r.points, accuracyOf(r), r.tests],
    accuracy: (r) => [accuracyOf(r), r.points, r.tests],
    tests: (r) => [r.tests, r.points, accuracyOf(r)],
  };
  const ka = keys[sort](a);
  const kb = keys[sort](b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
  // Equal results: whoever got there first ranks higher; then a stable tie-break.
  return a.lastAt.getTime() - b.lastAt.getTime() || a.userId.localeCompare(b.userId);
};

/** "Azizbek Karimov" → "Azizbek K." — enough to recognise yourself, not enough to identify a stranger. */
export const publicName = (full: string) => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "O'quvchi";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

const courseTitles = async (ids: (string | null)[]) => {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const rows = unique.length ? await prisma.course.findMany({ where: { id: { in: unique } }, select: { id: true, title: true } }) : [];
  return new Map(rows.map((c) => [c.id, c.title]));
};

const summary = (rows: Row[]) => {
  const correct = rows.reduce((s, r) => s + r.correct, 0);
  const asked = rows.reduce((s, r) => s + r.asked, 0);
  return { students: rows.length, testsTaken: rows.reduce((s, r) => s + r.tests, 0), averageAccuracy: asked > 0 ? Math.round((correct / asked) * 100) : null };
};

/** Public leaderboard (+ the viewer's own position, private to them). */
export const publicLeaderboard = async (opts: { courseId?: string; sort?: LeaderboardSort; viewerId?: string }) => {
  const sort = opts.sort ?? "points";
  const rows = await cachedAggregate(opts.courseId ?? null, "all");
  const visible = rows.filter((r) => r.optIn).sort(compare(sort));
  const top = visible.slice(0, PUBLIC_SIZE);
  const titles = await courseTitles(top.map((r) => r.mainCourseId));

  let me: null | { rank: number | null; points: number; tests: number; accuracy: number; visible: boolean } = null;
  if (opts.viewerId) {
    const mine = rows.find((r) => r.userId === opts.viewerId);
    const user = await prisma.user.findUnique({ where: { id: opts.viewerId }, select: { leaderboardOptIn: true } });
    if (mine) {
      // Position among the visible students, as if the viewer were visible too.
      const ahead = visible.filter((r) => r.userId !== mine.userId && compare(sort)(r, mine) < 0).length;
      me = { rank: ahead + 1, points: mine.points, tests: mine.tests, accuracy: accuracyOf(mine), visible: Boolean(user?.leaderboardOptIn) };
    } else if (user) {
      me = { rank: null, points: 0, tests: 0, accuracy: 0, visible: user.leaderboardOptIn };
    }
  }

  return {
    stats: summary(rows),
    entries: top.map((r, i) => ({
      rank: i + 1,
      name: publicName(r.name),
      course: r.mainCourseId ? titles.get(r.mainCourseId) ?? null : null,
      tests: r.tests,
      accuracy: accuracyOf(r),
      points: r.points,
      isMe: r.userId === opts.viewerId,
    })),
    me,
    rules: POINTS,
  };
};

/** Staff report: everybody, full names, optional period. */
export const adminLeaderboard = async (opts: { courseId?: string; sort?: LeaderboardSort; period?: LeaderboardPeriod }) => {
  const rows = (await aggregate(opts.courseId ?? null, opts.period ?? "all")).sort(compare(opts.sort ?? "points"));
  const top = rows.slice(0, 200);
  const titles = await courseTitles(top.map((r) => r.mainCourseId));
  return {
    stats: summary(rows),
    entries: top.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      visible: r.optIn,
      course: r.mainCourseId ? titles.get(r.mainCourseId) ?? null : null,
      tests: r.tests,
      accuracy: accuracyOf(r),
      points: r.points,
      lastAt: r.lastAt,
    })),
  };
};

export const setOptIn = async (userId: string, visible: boolean) => {
  await prisma.user.update({ where: { id: userId }, data: { leaderboardOptIn: visible } });
  clearLeaderboardCache();
  return { visible };
};
