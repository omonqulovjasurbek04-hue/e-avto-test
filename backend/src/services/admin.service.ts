import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/database";
import { ListQuery } from "../validators/course";
import { badRequest, forbidden, notFound } from "../utils/errors";
import { canAssignRole } from "../lib/permissions";
import { writeAudit } from "./audit.service";
import { revokeAllSessions } from "./session.service";
import { getPagination } from "../utils/pagination";

export const listUsers = async (query: ListQuery) => {
  const { page, limit, skip, take } = getPagination(query.page, query.limit);
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
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
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, emailVerifiedAt: true, totpEnabledAt: true },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, page, limit, total };
};

/** Role changes are admin-only (enforced by the route) and an admin cannot change their own role. */
export const updateUserRole = async (actorId: string, actorRole: string, userId: string, role: Role) => {
  if (actorId === userId) throw badRequest("You cannot change your own role");
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw notFound("User not found");
  if (!canAssignRole(actorRole, existing.role, role)) throw forbidden("Only a superadmin can grant or change admin roles");
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      // A role change revokes existing sessions so the new rights apply immediately.
      data: { role, tokenVersion: { increment: 1 } },
    });
    await revokeAllSessions(userId, tx);
    await writeAudit(
      { actorId, action: "user.role.change", entity: "User", entityId: userId, before: { role: existing.role }, after: { role } },
      tx
    );
    return updated;
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
};

/** Deactivating revokes all existing sessions; admins cannot deactivate themselves. */
export const updateUserStatus = async (actorId: string, actorRole: string, userId: string, isActive: boolean) => {
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
    return saved;
  });
  return { id: user.id, isActive: user.isActive };
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
  const finished = { finishedAt: { not: null } } satisfies Prisma.TestWhereInput;
  const [totalUsers, totalCourses, totalLessons, totalQuestions, totalTests, passedTests, scoreAgg] =
    await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.lesson.count(),
      prisma.question.count(),
      prisma.test.count({ where: finished }),
      prisma.test.count({ where: { ...finished, passed: true } }),
      prisma.test.aggregate({ where: finished, _avg: { score: true } }),
    ]);

  return {
    totalUsers,
    totalCourses,
    totalLessons,
    totalQuestions,
    totalTests,
    averageScore: Math.round(scoreAgg._avg.score ?? 0),
    passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
  };
};

export default { listUsers, updateUserRole, updateUserStatus, resetTwoFactor, getStatistics };
