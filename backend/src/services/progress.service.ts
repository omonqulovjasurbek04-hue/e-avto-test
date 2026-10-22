import { prisma } from "../config/database";
import { LessonProgressInput } from "../validators/progress";
import { forbidden, notFound } from "../utils/errors";
import { canAccessLesson } from "./access.service";

export const updateLessonProgress = async (
  userId: string,
  lessonId: string,
  input: LessonProgressInput,
  role = "USER"
) => {
  // Only lessons the user can actually see and open count towards progress and the leaderboard.
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, isPublished: true, course: { isPublished: true } },
    select: { id: true, courseId: true },
  });
  if (!lesson) throw notFound("Lesson not found");
  if (!(await canAccessLesson({ userId, role }, lesson))) throw forbidden("This lesson is not open for you yet");

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { percent: true, completed: true },
  });
  // A video lesson is completed only through the watch heartbeats (recordVideoWatch), never by a
  // client simply reporting 100 %; its reported percent stops at 99.
  const reported = (await lessonVideo(lessonId)) && !existing?.completed ? Math.min(input.percent, 99) : input.percent;
  // Progress only moves forward.
  const percent = Math.max(existing?.percent ?? 0, reported);
  const completed = existing?.completed || percent >= 100;
  await saveMonotonic(userId, lessonId, { percent, completed });
  const lessonProgress = await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId } } });

  await refreshCourseProgress(userId, lesson.courseId);
  return lessonProgress;
};

/**
 * Progress only ever moves forward, also when requests overlap (e.g. the player's last percent report and
 * its last watch heartbeat arrive together): each write is conditional, so a request that read an older
 * row can never lower the percent or turn a completed lesson back to "not completed".
 */
const saveMonotonic = async (userId: string, lessonId: string, next: { percent: number; completed: boolean; watch?: { watchedSeconds: number; at: Date } }) => {
  const where = { userId_lessonId: { userId, lessonId } };
  await prisma.lessonProgress.upsert({
    where,
    create: { userId, lessonId, percent: next.percent, completed: next.completed, ...(next.watch ? { watchedSeconds: next.watch.watchedSeconds, lastWatchAt: next.watch.at } : {}) },
    update: next.watch ? { lastWatchAt: next.watch.at } : {},
  });
  await prisma.lessonProgress.updateMany({ where: { userId, lessonId, percent: { lt: next.percent } }, data: { percent: next.percent } });
  if (next.watch) await prisma.lessonProgress.updateMany({ where: { userId, lessonId, watchedSeconds: { lt: next.watch.watchedSeconds } }, data: { watchedSeconds: next.watch.watchedSeconds } });
  if (next.completed) await prisma.lessonProgress.updateMany({ where: { userId, lessonId, completed: false }, data: { completed: true, percent: 100 } });
};

const refreshCourseProgress = async (userId: string, courseId: string) => {
  const [completedLessons, totalLessons] = await Promise.all([
    prisma.lessonProgress.count({
      where: { userId, completed: true, lesson: { courseId, isPublished: true } },
    }),
    prisma.lesson.count({ where: { courseId, isPublished: true } }),
  ]);
  const coursePercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  await prisma.progress.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, completedLessons, percent: coursePercent },
    update: { completedLessons, percent: coursePercent },
  });
};

// ───────────── video watching (verified on the server) ─────────────

/** Share of the video that must really be played before the lesson counts as watched. */
export const WATCH_SHARE = 0.9;
/** The player must also reach the end (within this many seconds). */
const END_SLACK_SECONDS = 3;
/** Fastest playback speed the player offers: 10 s of real time can cover at most 20 s of video. */
const MAX_PLAYBACK_RATE = 2;
/** A single heartbeat never credits more than this (the player sends one about every 10 s). */
const MAX_BEAT_SECONDS = 30;

/** The lesson's current private video with a known length, or null. */
const lessonVideo = (lessonId: string) =>
  prisma.videoAsset.findFirst({
    where: { lessonId, isArchived: false, durationSec: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    select: { durationSec: true },
  });

export const requiredWatchSeconds = (durationSec: number) => Math.ceil(durationSec * WATCH_SHARE);

export interface WatchState {
  watchedSeconds: number;
  requiredSeconds: number;
  durationSec: number;
  completed: boolean;
}

/** Where the viewer stands with the lesson video; null for a lesson without one. */
export const watchState = async (userId: string, lessonId: string): Promise<WatchState | null> => {
  const video = await lessonVideo(lessonId);
  if (!video) return null;
  const p = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } }, select: { watchedSeconds: true, completed: true } });
  return { watchedSeconds: p?.watchedSeconds ?? 0, requiredSeconds: requiredWatchSeconds(video.durationSec), durationSec: video.durationSec, completed: p?.completed ?? false };
};

/**
 * One heartbeat from the player: `seconds` of video played since the last one (seeking does not count)
 * and the current `position`. The server credits no more than the real time since the previous beat
 * allows (at most 2x speed), so the count cannot be faked by skipping ahead or by calling the API
 * faster. Watched >= 90 % of the length and the end reached -> the lesson is completed.
 */
export const recordVideoWatch = async (userId: string, role: string, lessonId: string, input: { seconds: number; position: number }, now = new Date()): Promise<WatchState> => {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, isPublished: true, course: { isPublished: true } },
    select: { id: true, courseId: true },
  });
  if (!lesson) throw notFound("Lesson not found");
  if (!(await canAccessLesson({ userId, role }, lesson))) throw forbidden("This lesson is not open for you yet");
  const video = await lessonVideo(lessonId);
  if (!video) throw notFound("This lesson has no video");

  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  const elapsed = existing?.lastWatchAt ? (now.getTime() - existing.lastWatchAt.getTime()) / 1000 : MAX_BEAT_SECONDS / MAX_PLAYBACK_RATE;
  // A little slack for network jitter between beats.
  const allowed = Math.min(MAX_BEAT_SECONDS, (elapsed + 2) * MAX_PLAYBACK_RATE);
  const credit = Math.max(0, Math.min(input.seconds, allowed));
  const watchedSeconds = Math.min(video.durationSec, (existing?.watchedSeconds ?? 0) + Math.round(credit));

  const required = requiredWatchSeconds(video.durationSec);
  const reachedEnd = input.position >= video.durationSec - END_SLACK_SECONDS;
  const completed = Boolean(existing?.completed) || (watchedSeconds >= required && reachedEnd);
  const percent = completed ? 100 : Math.max(existing?.percent ?? 0, Math.min(99, Math.floor((watchedSeconds / video.durationSec) * 100)));

  await saveMonotonic(userId, lessonId, { percent, completed, watch: { watchedSeconds, at: now } });
  if (completed && !existing?.completed) await refreshCourseProgress(userId, lesson.courseId);
  return { watchedSeconds, requiredSeconds: required, durationSec: video.durationSec, completed };
};

export const getLessonProgress = async (userId: string, lessonId: string) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) throw notFound("Lesson not found");
  return prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
};

export const listCompletedLessonIds = async (userId: string): Promise<string[]> => {
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, completed: true },
    select: { lessonId: true },
  });
  return rows.map((r) => r.lessonId);
};

export const getProgress = async (userId: string) => {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      _count: { select: { lessons: true } },
      progress: { where: { userId }, select: { completedLessons: true, percent: true, updatedAt: true } },
    },
  });
  return courses.map((course) => ({
    courseId: course.id,
    course: course.title,
    totalLessons: course._count.lessons,
    completedLessons: course.progress[0]?.completedLessons ?? 0,
    pct: course.progress[0]?.percent ?? 0,
    updatedAt: course.progress[0]?.updatedAt ?? null,
  }));
};
