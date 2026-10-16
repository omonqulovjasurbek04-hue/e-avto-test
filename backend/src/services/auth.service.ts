import crypto from "crypto";
import { User } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { hashPassword, comparePassword } from "../utils/password";
import { generateTwoFactorChallenge } from "../utils/jwt";
import { conflict, notFound, unauthorized, badRequest, forbidden, HttpError } from "../utils/errors";
import { sendMail } from "./mail.service";
import { revokeAllSessions, startSession, Session } from "./session.service";
import { sendVerificationEmail } from "./emailVerification.service";
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from "../validators/auth";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
// Per-account lockout: this many wrong passwords in a row lock the account for LOCK_MINUTES.
export const MAX_FAILED_LOGINS = 8;
export const LOCK_MINUTES = 15;

// A valid bcrypt hash used to keep login timing similar when the email is unknown.
const DUMMY_HASH = "$2a$10$TZK7Qn8z/lHkDkzQvNVyau.gMZm6zXZqoAfJcbE3ylYXyu9wop4Li";

export const toPublicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email ?? undefined,
  phone: user.phone ?? undefined,
  avatarUrl: user.avatarUrl ?? undefined,
  role: user.role,
  // Telegram-only accounts have no e-mail, so there is nothing to verify.
  emailVerified: user.email ? Boolean(user.emailVerifiedAt) : undefined,
  twoFactorEnabled: Boolean(user.totpEnabledAt),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/** Either a finished login (session) or the second step of a 2FA login. */
export type LoginOutcome =
  | { kind: "session"; user: User; session: Session }
  | { kind: "2fa"; challengeToken: string };

/**
 * The last step shared by every login method (password, Telegram): accounts with 2FA get a
 * short-lived challenge instead of a session.
 */
export const completeLogin = async (user: User, userAgent?: string): Promise<LoginOutcome> => {
  if (user.totpEnabledAt && user.totpSecret) {
    return { kind: "2fa", challengeToken: generateTwoFactorChallenge(user.id, user.tokenVersion) };
  }
  return { kind: "session", user, session: await startSession(user, userAgent) };
};

export const register = async (input: RegisterInput, userAgent?: string) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("Email already registered");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: "USER", // roles can never be chosen by the client
    },
  });

  const emailVerification = await sendVerificationEmail(user);
  return { user, session: await startSession(user, userAgent), emailVerification };
};

export const login = async (input: LoginInput, userAgent?: string): Promise<LoginOutcome> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Telegram-only accounts have no password, so password login is never possible for them.
  const valid = await comparePassword(input.password, user?.passwordHash ?? DUMMY_HASH);

  // While locked, even the correct password is refused (so the lock cannot be probed with guesses).
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(429, "Too many failed attempts, try again in a few minutes");
  }

  if (!user || !user.passwordHash || !valid) {
    if (user) {
      // Atomic increment; the account locks itself once the limit is reached.
      const updated = await prisma.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } }, select: { failedLogins: true } });
      if (updated.failedLogins >= MAX_FAILED_LOGINS) {
        await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } });
      }
    }
    throw unauthorized("Invalid credentials");
  }
  if (!user.isActive) throw forbidden("Account is disabled");
  if (user.failedLogins > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }

  return completeLogin(user, userAgent);
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User not found");
  return toPublicUser(user);
};

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  if (input.email) {
    const existing = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: userId } },
    });
    if (existing) throw conflict("Email already in use");
  }

  const before = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const emailChanged = input.email !== undefined && input.email !== before?.email;
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      // A new address is unconfirmed until its own link is opened.
      ...(emailChanged ? { email: input.email, emailVerifiedAt: null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
  });
  if (emailChanged && user.email) await sendVerificationEmail(user);
  return toPublicUser(user);
};

export const changePassword = async (userId: string, input: ChangePasswordInput, userAgent?: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User not found");
  if (!user.passwordHash) throw badRequest("This account has no password; sign in with Telegram");
  if (!(await comparePassword(input.currentPassword, user.passwordHash))) {
    throw badRequest("Current password is incorrect");
  }
  // Bumping tokenVersion and revoking refresh tokens signs the user out everywhere else;
  // this device gets a fresh session.
  const passwordHash = await hashPassword(input.newPassword);
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.user.update({ where: { id: userId }, data: { passwordHash, tokenVersion: { increment: 1 } } });
    await revokeAllSessions(userId, tx);
    return saved;
  });
  return { changed: true, session: await startSession(updated, userAgent) };
};

export const logoutEverywhere = async (userId: string) => {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
    await revokeAllSessions(userId, tx);
  });
  return { loggedOut: true };
};

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Creates a one-time reset token and e-mails it when SMTP is configured (otherwise the link is only
 * logged outside production); the response never reveals whether the account exists.
 */
export const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const link = `${env.CLIENT_URL.split(",")[0].trim()}/reset-password?token=${token}`;
  const sent = await sendMail({
    to: email,
    subject: "E-Avto Test: parolni tiklash",
    text: `Parolni tiklash uchun havola (30 daqiqa amal qiladi):
${link}

Agar bu so'rovni siz yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring.`,
  });
  // Without SMTP the link is only printed outside production, never returned to the caller.
  if (!sent && env.NODE_ENV !== "production") {
    console.log(`[dev] password reset link for ${email}: ${link}`);
  }
};

export const resetPassword = async (input: ResetPasswordInput) => {
  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest("Reset token is invalid or expired");
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (tx) => {
    // Claim the token first: of two simultaneous requests with the same token only one can win.
    const claimed = await tx.passwordReset.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw badRequest("Reset token is invalid or expired");
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } });
    await revokeAllSessions(record.userId, tx);
    // Any other outstanding reset link for this account stops working too.
    await tx.passwordReset.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
  });
  return { reset: true };
};

export default {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
