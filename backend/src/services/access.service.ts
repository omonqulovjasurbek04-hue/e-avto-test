import { prisma } from "../config/database";
import { env } from "../config/env";
import { hasPermission } from "../lib/permissions";

/** Staff who see every course without buying it: catalog managers and teachers. */
const opensEverything = (role: string) => hasPermission(role, "catalog:manage") || hasPermission(role, "courses:open-all");

export interface EnrollmentLike {
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  startsAt: Date;
  expiresAt: Date | null;
}

/** Access is decided from the stored enrollment, never from anything the client sends. */
export const isEnrollmentActive = (e: EnrollmentLike, now: Date = new Date()): boolean =>
  e.status === "ACTIVE" && e.startsAt <= now && (e.expiresAt === null || e.expiresAt > now);

/**
 * Can this viewer open the course content (video, lesson text)?
 * - Default: catalog managers and teachers, or a user with an active enrollment (a purchased course).
 * - ENFORCE_ENROLLMENT=false (demo mode only): everything published is open.
 */
export const canAccessCourse = async (viewer: { userId: string; role: string } | undefined, courseId: string): Promise<boolean> => {
  if (!env.ENFORCE_ENROLLMENT) return true;
  if (!viewer) return false;
  if (opensEverything(viewer.role)) return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: viewer.userId, courseId } },
    select: { status: true, startsAt: true, expiresAt: true },
  });
  return enrollment ? isEnrollmentActive(enrollment) : false;
};

/** Course ids the viewer may open, for list endpoints (one query instead of one per course). */
export const accessibleCourseIds = async (viewer: { userId: string; role: string } | undefined): Promise<"all" | Set<string>> => {
  if (!env.ENFORCE_ENROLLMENT) return "all";
  if (!viewer) return new Set();
  if (opensEverything(viewer.role)) return "all";
  const rows = await prisma.enrollment.findMany({
    where: { userId: viewer.userId },
    select: { courseId: true, status: true, startsAt: true, expiresAt: true },
  });
  return new Set(rows.filter((r) => isEnrollmentActive(r)).map((r) => r.courseId));
};

/** For the student UI: which courses this user can open right now ("all" = staff or demo mode). */
export const courseAccessSummary = async (viewer: { userId: string; role: string }) => {
  const allowed = await accessibleCourseIds(viewer);
  return allowed === "all" ? { all: true, courseIds: [] as string[] } : { all: false, courseIds: [...allowed] };
};

// ───────────────────────── Lessons open step by step ─────────────────────────

/** Distance learners: this many lessons open at once ... */
export const DRIP_LESSONS_PER_STEP = 2;
/** ... and the next batch after this many days. */
export const DRIP_STEP_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Attendance that counts as "was in class" (an excused absence does not open the next lesson). */
const ATTENDED = ["PRESENT", "LATE", "ONLINE"] as const;

export type LessonLockReason = "purchase" | "attendance" | "schedule";
export interface LessonState {
  locked: boolean;
  reason: LessonLockReason | null;
  /** Distance learners: when this lesson opens (null if it is open or depends on attendance). */
  unlocksAt: Date | null;
}
const OPEN: LessonState = { locked: false, reason: null, unlocksAt: null };

/**
 * How many of a course's lessons (in course order) this student may open now:
 * - in an active class group of the course: one lesson per attended class;
 * - otherwise (distance learning): 2 lessons right after enrolling, 2 more every 3 days.
 */
type Gate = { kind: "all" } | { kind: "none" } | { kind: "attendance"; open: number } | { kind: "schedule"; startsAt: Date; open: number };

const gateFor = async (viewer: { userId: string; role: string } | undefined, courseId: string, now: Date): Promise<Gate> => {
  if (!env.ENFORCE_ENROLLMENT) return { kind: "all" };
  if (!viewer) return { kind: "none" };
  if (opensEverything(viewer.role)) return { kind: "all" };
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: viewer.userId, courseId } },
    select: { status: true, startsAt: true, expiresAt: true },
  });
  if (!enrollment || !isEnrollmentActive(enrollment, now)) return { kind: "none" };

  const inGroup = await prisma.groupMembership.findFirst({
    where: { studentId: viewer.userId, leftAt: null, group: { courseId, status: "ACTIVE" } },
    select: { id: true },
  });
  if (inGroup) {
    const attended = await prisma.attendanceRecord.count({
      where: { studentId: viewer.userId, status: { in: [...ATTENDED] }, session: { slot: { group: { courseId } } } },
    });
    return { kind: "attendance", open: attended };
  }
  const steps = Math.floor(Math.max(0, now.getTime() - enrollment.startsAt.getTime()) / (DRIP_STEP_DAYS * DAY_MS));
  return { kind: "schedule", startsAt: enrollment.startsAt, open: (steps + 1) * DRIP_LESSONS_PER_STEP };
};

const stateAt = (gate: Gate, index: number): LessonState => {
  switch (gate.kind) {
    case "all":
      return OPEN;
    case "none":
      return { locked: true, reason: "purchase", unlocksAt: null };
    case "attendance":
      return index < gate.open ? OPEN : { locked: true, reason: "attendance", unlocksAt: null };
    case "schedule": {
      if (index < gate.open) return OPEN;
      const step = Math.floor(index / DRIP_LESSONS_PER_STEP);
      return { locked: true, reason: "schedule", unlocksAt: new Date(gate.startsAt.getTime() + step * DRIP_STEP_DAYS * DAY_MS) };
    }
  }
};

/**
 * Open/closed state of every published lesson of these courses for this viewer (lesson id → state).
 * The position in the course (by `order`) decides which lessons the gate opens.
 */
export const lessonStates = async (
  viewer: { userId: string; role: string } | undefined,
  courseIds: string[],
  now: Date = new Date()
): Promise<Map<string, LessonState>> => {
  const result = new Map<string, LessonState>();
  const unique = [...new Set(courseIds)];
  if (unique.length === 0) return result;
  const lessons = await prisma.lesson.findMany({
    where: { courseId: { in: unique }, isPublished: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, courseId: true },
  });
  for (const courseId of unique) {
    const gate = await gateFor(viewer, courseId, now);
    lessons.filter((l) => l.courseId === courseId).forEach((l, i) => result.set(l.id, stateAt(gate, i)));
  }
  return result;
};

/** One lesson: may the viewer open it (video, text, its test, progress)? */
export const lessonState = async (viewer: { userId: string; role: string } | undefined, lesson: { id: string; courseId: string }): Promise<LessonState> =>
  (await lessonStates(viewer, [lesson.courseId])).get(lesson.id) ?? { locked: true, reason: "purchase", unlocksAt: null };

export const canAccessLesson = async (viewer: { userId: string; role: string } | undefined, lesson: { id: string; courseId: string }): Promise<boolean> =>
  !(await lessonState(viewer, lesson)).locked;
