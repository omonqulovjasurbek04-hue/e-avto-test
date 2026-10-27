import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/database";
import { ListQuery } from "../validators/course";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors";
import { canAssignRole } from "../lib/permissions";
import { accountIdFilter, assignStudentNumber, becomeTeacher, leaveTeacher } from "../lib/accountNumbers";
import { writeAudit } from "./audit.service";
import { revokeAllSessions } from "./session.service";
import { getPagination } from "../utils/pagination";

export const listUsers = async (query: ListQuery) => {
  const { page, limit, skip, take } = getPagination(query.page, query.limit);
  const digits = query.search?.replace(/\D/g, "") ?? "";
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    // student = had a course; user = only signed up; teacher = teaches now (role TEACHER).
    ...(query.kind === "student"
      ? { studentNumber: { not: null } }
      : query.kind === "user"
        ? { studentNumber: null, NOT: { role: "TEACHER" as const } }
        : query.kind === "teacher"
          ? { role: "TEACHER" as const }
          : {}),
    ...(query.search
      ? {
          // "student0007" / "user0042" → that account; otherwise name, e-mail or phone.
          AND: [
            accountIdFilter(query.search) ?? {
              OR: [
                { name: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
                ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-9) } }] : []),
              ],
            },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        userNumber: true,
        studentNumber: true,
        teacherNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        emailVerifiedAt: true,
        totpEnabledAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, page, limit, total };
};

/**
 * Role changes are admin-only (enforced by the route) and an admin cannot change their own role.
 * Becoming a teacher gives a teacher number (teacher0001) and frees the user number for a new sign-up;
 * no longer being one gives a user number back. The account id never changes, so courses, payments,
 * results, groups and attendance stay with the person. A teacher with active groups keeps the role until
 * the groups are handed to another teacher.
 */
export const updateUserRole = async (actorId: string, actorRole: string, userId: string, role: Role, reason?: string) => {
  if (actorId === userId) throw badRequest("You cannot change your own role");
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw notFound("User not found");
  if (!canAssignRole(actorRole, existing.role, role)) throw forbidden("Only a superadmin can grant or change admin roles");
  if (existing.role === role) return publicRole(existing);

  const leavingTeacher = existing.role === "TEACHER" && role !== "TEACHER";
  if (leavingTeacher) {
    const groups = await prisma.teacherGroup.count({ where: { teacherId: userId, status: "ACTIVE" } });
    if (groups > 0) throw conflict(`This teacher still has ${groups} active group(s); hand them to another teacher first`);
  }

  const user = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      // A role change revokes existing sessions so the new rights apply immediately.
      data: { role, tokenVersion: { increment: 1 } },
    });
    await revokeAllSessions(userId, tx);
    if (role === "TEACHER") {
      // The teacher profile (bio, photo on the site) at once; an older one is reactivated.
      await tx.teacherProfile.upsert({ where: { userId }, create: { userId }, update: { isActive: true } });
      await becomeTeacher(tx, userId);
    } else if (leavingTeacher) {
      // Kept for history (lessons, attendance); the teacher number stays on the account.
      await tx.teacherProfile.updateMany({ where: { userId }, data: { isActive: false } });
      await leaveTeacher(tx, userId);
    }
    const updated = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await writeAudit(
      {
        actorId,
        action: "user.role.change",
        entity: "User",
        entityId: userId,
        before: { role: existing.role, userNumber: existing.userNumber, teacherNumber: existing.teacherNumber },
        after: { role, userNumber: updated.userNumber, teacherNumber: updated.teacherNumber },
        reason: reason || undefined,
      },
      tx
    );
    return updated;
  });
  return publicRole(user);
};

type RoleRow = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  createdAt: Date;
  userNumber: number | null;
  studentNumber: number | null;
  teacherNumber: number | null;
};
const publicRole = (u: RoleRow) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  createdAt: u.createdAt,
  userNumber: u.userNumber,
  studentNumber: u.studentNumber,
  teacherNumber: u.teacherNumber,
});

/** Deactivating revokes all existing sessions; admins cannot deactivate themselves. Audited, with the reason. */
export const updateUserStatus = async (actorId: string, actorRole: string, userId: string, isActive: boolean, reason?: string) => {
  if (actorId === userId) throw badRequest("You cannot change your own status");
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw notFound("User not found");
  // Same privilege boundary as role changes: only a superadmin may disable or re-enable an ADMIN/SUPERADMIN account.
  if (!canAssignRole(actorRole, existing.role, existing.role)) throw forbidden("Only a superadmin can change the status of admin accounts");
  const user = await prisma.$transaction(async (tx) => {
    const saved = await tx.user.update({
      where: { id: userId },
      data: { isActive, ...(isActive ? {} : { tokenVersion: { increment: 1 } }) },
    });
    if (!isActive) await revokeAllSessions(userId, tx);
    await writeAudit(
      {
        actorId,
        action: isActive ? "user.activate" : "user.block",
        entity: "User",
        entityId: userId,
        before: { isActive: existing.isActive },
        after: { isActive },
        reason: reason || undefined,
      },
      tx
    );
    return saved;
  });
  return { id: user.id, isActive: user.isActive };
};

/** Every public number the account has held (user, student, teacher), newest first. */
export const userIdentifiers = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw notFound("User not found");
  return prisma.userIdentifier.findMany({
    where: { userId },
    orderBy: { assignedAt: "desc" },
    select: { id: true, kind: true, number: true, assignedAt: true, releasedAt: true, releaseReason: true },
  });
};

/** The account's courses (paid or granted), for the admin's user page. */
export const userEnrollments = async (userId: string) =>
  prisma.enrollment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, startsAt: true, expiresAt: true, orderId: true, course: { select: { id: true, title: true } } },
  });

/**
 * Opens a course without payment (a free place, a special case). Needs its own permission and a reason;
 * the account becomes a student like after a purchase. Refused while the course is already open.
 */
export const grantEnrollment = async (actorId: string, userId: string, input: { courseId: string; days?: number | null; reason: string }) => {
  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true, title: true } }),
  ]);
  if (!user) throw notFound("User not found");
  if (!course) throw notFound("Course not found");
  const now = new Date();
  const current = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  if (current && current.status === "ACTIVE" && (!current.expiresAt || current.expiresAt > now)) {
    throw conflict("The course is already open for this account");
  }
  const expiresAt = input.days ? new Date(now.getTime() + input.days * 86_400_000) : null;

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      create: { userId, courseId: course.id, expiresAt },
      update: { status: "ACTIVE", expiresAt, startsAt: now, orderId: null, packageId: null },
    });
    await assignStudentNumber(tx, userId);
    await writeAudit(
      {
        actorId,
        action: "enrollment.grant",
        entity: "Enrollment",
        entityId: enrollment.id,
        after: { userId, courseId: course.id, course: course.title, expiresAt },
        reason: input.reason,
      },
      tx
    );
    return enrollment;
  });
};

/**
 * Recovery for a staff member who lost both the authenticator and the recovery codes. Superadmin only,
 * never for oneself, audited; existing sessions are closed so the account signs in again.
 */
export const resetTwoFactor = async (actorId: string, actorRole: string, userId: string) => {
  if (actorRole !== "SUPERADMIN") throw forbidden("Only a superadmin can reset two-factor authentication");
  if (actorId === userId) throw badRequest("Use your own security settings to turn off two-factor authentication");
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw notFound("User not found");
  if (!existing.totpEnabledAt) throw badRequest("Two-factor authentication is not enabled for this user");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpPendingSecret: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryHashes: [], tokenVersion: { increment: 1 } },
    });
    await revokeAllSessions(userId, tx);
    await writeAudit({ actorId, action: "user.2fa.reset", entity: "User", entityId: userId }, tx);
  });
  return { id: userId, twoFactorEnabled: false };
};

export const getStatistics = async () => {
  const finished = { finishedAt: { not: null }, mode: "EXAM" } satisfies Prisma.TestWhereInput;
  const [totalUsers, totalStudents, totalCourses, totalLessons, totalQuestions, totalTests, passedTests, scoreAgg] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { studentNumber: { not: null } } }),
      prisma.course.count(),
      prisma.lesson.count(),
      prisma.question.count(),
      prisma.test.count({ where: finished }),
      prisma.test.count({ where: { ...finished, passed: true } }),
      prisma.test.aggregate({ where: finished, _avg: { score: true } }),
    ]);

  return {
    totalUsers,
    // Accounts that bought a course (have a student number); the rest only signed up.
    totalStudents,
    totalCourses,
    totalLessons,
    totalQuestions,
    totalTests,
    averageScore: Math.round(scoreAgg._avg.score ?? 0),
    passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
  };
};

export default { listUsers, updateUserRole, updateUserStatus, resetTwoFactor, getStatistics, userIdentifiers, userEnrollments, grantEnrollment };
