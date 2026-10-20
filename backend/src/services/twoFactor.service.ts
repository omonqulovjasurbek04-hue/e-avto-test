import { User } from "@prisma/client";
import { prisma } from "../config/database";
import { verifyTwoFactorChallenge } from "../utils/jwt";
import { badRequest, conflict, forbidden, HttpError, notFound, unauthorized } from "../utils/errors";
import { comparePassword } from "../utils/password";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  otpauthUrl,
  verifyCode,
} from "../lib/totp";
import { startSession } from "./session.service";
import { writeAudit } from "./audit.service";
import { MAX_FAILED_LOGINS, LOCK_MINUTES } from "./auth.service";

/** 2FA is offered to the roles that can move money or change other people's rights. */
export const TWO_FACTOR_ROLES = ["ADMIN", "SUPERADMIN", "FINANCE"] as const;
export const canUseTwoFactor = (role: string) => (TWO_FACTOR_ROLES as readonly string[]).includes(role);

const RECOVERY_CODE = /^[0-9a-f]{5}-?[0-9a-f]{5}$/i;

const load = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User not found");
  return user;
};

export const getStatus = async (userId: string) => {
  const user = await load(userId);
  return {
    available: canUseTwoFactor(user.role),
    enabled: Boolean(user.totpEnabledAt),
    enabledAt: user.totpEnabledAt,
    recoveryCodesLeft: user.totpRecoveryHashes.length,
  };
};

/** Step 1: a new secret is stored as "pending" until the user proves their app produces valid codes. */
export const beginSetup = async (userId: string) => {
  const user = await load(userId);
  if (!canUseTwoFactor(user.role)) throw forbidden("Two-factor authentication is available for admin and finance accounts");
  if (user.totpEnabledAt) throw conflict("Two-factor authentication is already enabled");
  const secret = generateSecret();
  await prisma.user.update({ where: { id: userId }, data: { totpPendingSecret: encryptSecret(secret) } });
  const account = user.email ?? user.name;
  return { secret, otpauthUrl: otpauthUrl(secret, account) };
};

/** Step 2: confirms the pending secret with a code and returns one-time recovery codes (shown once). */
export const confirmSetup = async (userId: string, code: string) => {
  const user = await load(userId);
  if (!canUseTwoFactor(user.role)) throw forbidden("Two-factor authentication is available for admin and finance accounts");
  if (user.totpEnabledAt) throw conflict("Two-factor authentication is already enabled");
  if (!user.totpPendingSecret) throw badRequest("Start the setup first");
  const secret = decryptSecret(user.totpPendingSecret);
  const step = verifyCode(secret, code, null);
  if (step === null) throw badRequest("Invalid code");

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: user.totpPendingSecret,
      totpPendingSecret: null,
      totpEnabledAt: new Date(),
      totpLastStep: step,
      totpRecoveryHashes: recoveryCodes.map(hashRecoveryCode),
    },
  });
  await writeAudit({ actorId: userId, action: "auth.2fa.enable", entity: "User", entityId: userId });
  return { enabled: true, recoveryCodes };
};

/**
 * Checks a TOTP code or a recovery code. A valid TOTP advances totpLastStep (no replay);
 * a recovery code is consumed.
 */
export const checkSecondFactor = async (user: User, code: string): Promise<boolean> => {
  if (!user.totpSecret) return false;
  const trimmed = code.trim();
  if (/^\d{6}$/.test(trimmed)) {
    const step = verifyCode(decryptSecret(user.totpSecret), trimmed, user.totpLastStep);
    if (step === null) return false;
    // Conditional update: two requests with the same code cannot both pass.
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
      data: { totpLastStep: step },
    });
    return claimed.count === 1;
  }
  if (RECOVERY_CODE.test(trimmed)) {
    const hash = hashRecoveryCode(trimmed);
    if (!user.totpRecoveryHashes.includes(hash)) return false;
    const remaining = user.totpRecoveryHashes.filter((h) => h !== hash);
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, totpRecoveryHashes: { has: hash } },
      data: { totpRecoveryHashes: remaining },
    });
    return claimed.count === 1;
  }
  return false;
};

/** Login step 2: the challenge from the password step plus a code from the authenticator app. */
export const completeTwoFactorLogin = async (challengeToken: string, code: string, userAgent?: string) => {
  let challenge;
  try {
    challenge = verifyTwoFactorChallenge(challengeToken);
  } catch {
    throw unauthorized("The sign-in step expired, please sign in again");
  }
  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user || user.tokenVersion !== challenge.tv || !user.totpEnabledAt) {
    throw unauthorized("The sign-in step expired, please sign in again");
  }
  if (!user.isActive) throw forbidden("Account is disabled");
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(429, "Too many failed attempts, try again in a few minutes");
  }

  if (!(await checkSecondFactor(user, code))) {
    // Wrong codes count towards the same per-account lockout as wrong passwords.
    const updated = await prisma.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } }, select: { failedLogins: true } });
    if (updated.failedLogins >= MAX_FAILED_LOGINS) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } });
    }
    throw unauthorized("Invalid code");
  }
  if (user.failedLogins > 0) await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0 } });
  return { user, session: await startSession(user, userAgent) };
};

/** Turning 2FA off needs the password (if the account has one) and a current code or recovery code. */
export const disable = async (userId: string, input: { password?: string; code: string }) => {
  const user = await load(userId);
  if (!user.totpEnabledAt) throw badRequest("Two-factor authentication is not enabled");
  if (user.passwordHash && !(input.password && (await comparePassword(input.password, user.passwordHash)))) {
    throw badRequest("Current password is incorrect");
  }
  if (!(await checkSecondFactor(user, input.code))) throw badRequest("Invalid code");
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, totpPendingSecret: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryHashes: [] },
  });
  await writeAudit({ actorId: userId, action: "auth.2fa.disable", entity: "User", entityId: userId });
  return { enabled: false };
};

/** New recovery codes replace the old ones; needs a current code. */
export const regenerateRecoveryCodes = async (userId: string, code: string) => {
  const user = await load(userId);
  if (!user.totpEnabledAt) throw badRequest("Two-factor authentication is not enabled");
  if (!(await checkSecondFactor(user, code))) throw badRequest("Invalid code");
  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({ where: { id: userId }, data: { totpRecoveryHashes: recoveryCodes.map(hashRecoveryCode) } });
  return { recoveryCodes };
};
