import { prisma } from "../config/database";

/**
 * Real study time. While a lesson or test page is open and visible, the browser reports the seconds
 * it counted (about every 30 s). The server credits at most the time that really passed since the
 * previous report of this student (any page, any tab), capped per report, so leaving several tabs
 * open or replaying requests cannot inflate the counter. Days follow Tashkent time (UTC+5, no DST).
 */

export type StudyKind = "lesson" | "test";

const DAY_MS = 86_400_000;
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
/** Most a single report can add (the client reports every 30 s; a little slack for slow networks). */
export const MAX_BEAT_SECONDS = 60;

/** The Tashkent calendar day of an instant, as the UTC midnight Prisma stores in a DATE column. */
export const tashkentDay = (at: Date) => new Date(Math.floor((at.getTime() + TZ_OFFSET_MS) / DAY_MS) * DAY_MS);

export const recordStudyTime = async (userId: string, kind: StudyKind, reported: number, now = new Date()) => {
  const day = tashkentDay(now);
  // The newest report of this student, whichever day it fell on (a session can cross midnight).
  const last = await prisma.studyTime.findFirst({ where: { userId, lastBeatAt: { not: null } }, orderBy: { lastBeatAt: "desc" }, select: { lastBeatAt: true } });
  const sinceLast = last?.lastBeatAt ? Math.floor((now.getTime() - last.lastBeatAt.getTime()) / 1000) : MAX_BEAT_SECONDS;
  const credit = Math.max(0, Math.min(Math.floor(reported), MAX_BEAT_SECONDS, sinceLast));
  const field = kind === "lesson" ? "lessonSeconds" : "testSeconds";
  await prisma.studyTime.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, [field]: credit, lastBeatAt: now },
    update: { [field]: { increment: credit }, lastBeatAt: now },
  });
  return { credited: credit };
};

/** Monday–Sunday of the current Tashkent week, minutes per day split into lessons and tests. */
export const weekStudyTime = async (userId: string, now = new Date()) => {
  const today = tashkentDay(now);
  const weekday = (today.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(today.getTime() - weekday * DAY_MS);
  const rows = await prisma.studyTime.findMany({ where: { userId, day: { gte: monday, lt: new Date(monday.getTime() + 7 * DAY_MS) } } });
  const byDay = new Map(rows.map((r) => [r.day.getTime(), r]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getTime() + i * DAY_MS);
    const r = byDay.get(d.getTime());
    return {
      date: d.toISOString().slice(0, 10),
      lessonMinutes: Math.round((r?.lessonSeconds ?? 0) / 60),
      testMinutes: Math.round((r?.testSeconds ?? 0) / 60),
    };
  });
  const totalSeconds = rows.reduce((s, r) => s + r.lessonSeconds + r.testSeconds, 0);
  return { today: today.toISOString().slice(0, 10), totalMinutes: Math.round(totalSeconds / 60), days };
};

/** All tracked study time, in minutes. */
export const totalStudyMinutes = async (userId: string) => {
  const sum = await prisma.studyTime.aggregate({ where: { userId }, _sum: { lessonSeconds: true, testSeconds: true } });
  return Math.round(((sum._sum.lessonSeconds ?? 0) + (sum._sum.testSeconds ?? 0)) / 60);
};
