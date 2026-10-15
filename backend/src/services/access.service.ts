import { prisma } from "../config/database";
import { env } from "../config/env";
import { hasPermission } from "../lib/permissions";

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
 * - ENFORCE_ENROLLMENT=false (default, keeps the pre-payments behaviour): everything published is open.
 * - Otherwise: staff with catalog rights, or a user with an active enrollment.
 */
export const canAccessCourse = async (viewer: { userId: string; role: string } | undefined, courseId: string): Promise<boolean> => {
  if (!env.ENFORCE_ENROLLMENT) return true;
  if (!viewer) return false;
  if (hasPermission(viewer.role, "catalog:manage")) return true;
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
  if (hasPermission(viewer.role, "catalog:manage")) return "all";
  const rows = await prisma.enrollment.findMany({
    where: { userId: viewer.userId },
    select: { courseId: true, status: true, startsAt: true, expiresAt: true },
  });
  return new Set(rows.filter((r) => isEnrollmentActive(r)).map((r) => r.courseId));
};
