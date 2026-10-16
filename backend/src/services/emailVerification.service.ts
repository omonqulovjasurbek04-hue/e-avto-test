import crypto from "crypto";
import { User } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { badRequest, notFound } from "../utils/errors";
import { isMailConfigured, sendMail } from "./mail.service";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * What actually happened to the e-mail. `sent: true` only when the SMTP server accepted it;
 * `mailConfigured: false` tells the client that no e-mail service is set up at all.
 */
export interface VerificationDelivery {
  sent: boolean;
  mailConfigured: boolean;
}

/** Issues a fresh verification link for the user's current e-mail (older links stop working). */
export const sendVerificationEmail = async (user: Pick<User, "id" | "email">): Promise<VerificationDelivery> => {
  if (!user.email) return { sent: false, mailConfigured: isMailConfigured() };
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.emailVerification.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailVerification.create({
      data: { userId: user.id, email: user.email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
    }),
  ]);

  const link = `${env.CLIENT_URL.split(",")[0].trim()}/verify-email?token=${token}`;
  const sent = await sendMail({
    to: user.email,
    subject: "E-Avto Test: e-pochtani tasdiqlash",
    text: `E-pochta manzilingizni tasdiqlash uchun havola (24 soat amal qiladi):
${link}

Agar siz ro'yxatdan o'tmagan bo'lsangiz, xatni e'tiborsiz qoldiring.`,
  });
  // Without SMTP the link is only printed outside production, never returned to the caller.
  if (!sent && env.NODE_ENV !== "production" && env.NODE_ENV !== "test") {
    console.log(`[dev] e-mail verification link for ${user.email}: ${link}`);
  }
  return { sent, mailConfigured: isMailConfigured() };
};

export const resendVerification = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User not found");
  if (!user.email) throw badRequest("This account has no e-mail address");
  if (user.emailVerifiedAt) return { alreadyVerified: true, sent: false, mailConfigured: isMailConfigured() };
  return { alreadyVerified: false, ...(await sendVerificationEmail(user)) };
};

export const verifyEmail = async (token: string) => {
  const record = await prisma.emailVerification.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  // A link for an address the user has since replaced confirms nothing.
  if (!record || record.usedAt || record.expiresAt < new Date() || record.user.email !== record.email) {
    throw badRequest("Verification link is invalid or expired");
  }
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.emailVerification.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw badRequest("Verification link is invalid or expired");
    await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  });
  return { verified: true };
};
