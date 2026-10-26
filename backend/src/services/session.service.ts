import crypto from "crypto";
import { Prisma, User } from "@prisma/client";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { generateToken } from "../utils/jwt";
import { HttpError } from "../utils/errors";

type Tx = Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const issueAccessToken = (user: Pick<User, "id" | "role" | "tokenVersion">): string =>
  generateToken({ userId: user.id, role: user.role, tv: user.tokenVersion });

const refreshExpiry = () => new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);

const createRefreshToken = async (db: Tx | typeof prisma, user: Pick<User, "id" | "tokenVersion">, familyId: string, userAgent?: string) => {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.refreshToken.create({
    data: {
      userId: user.id,
      familyId,
      tokenHash: hashToken(token),
      tokenVersion: user.tokenVersion,
      expiresAt: refreshExpiry(),
      userAgent: userAgent?.slice(0, 200),
    },
  });
  return token;
};

export interface Session {
  accessToken: string;
  refreshToken: string;
}

/** Starts a new session (new refresh-token family) after a successful login. */
export const startSession = async (user: User, userAgent?: string): Promise<Session> => {
  const refreshToken = await createRefreshToken(prisma, user, crypto.randomUUID(), userAgent);
  return { accessToken: issueAccessToken(user), refreshToken };
};

const invalidSession = () => new HttpError(401, "Session expired, please sign in again");

/**
 * How long a just-rotated token is still accepted. The browser can lose the response that carried its
 * successor (a reload or navigation while the request is in flight, a slow cold start); without this
 * window its next refresh would look like theft and sign the user out.
 */
export const REUSE_GRACE_MS = 30_000;

const justRotated = (usedAt: Date | null) => usedAt !== null && Date.now() - usedAt.getTime() <= REUSE_GRACE_MS;

/**
 * Exchanges a refresh token for a new access token and a new refresh token (rotation).
 * A token that was already rotated (outside the short grace window) or revoked is treated as stolen:
 * the whole family is revoked, so both the thief and the legitimate client must sign in again.
 */
export const rotateSession = async (presented: string, userAgent?: string): Promise<Session & { user: User }> => {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(presented) }, include: { user: true } });
  if (!record) throw invalidSession();

  if (record.revokedAt || (record.usedAt && !justRotated(record.usedAt))) {
    await revokeFamily(record.familyId);
    throw invalidSession();
  }
  const user = record.user;
  if (record.expiresAt < new Date() || !user.isActive || user.tokenVersion !== record.tokenVersion) {
    await revokeFamily(record.familyId);
    throw invalidSession();
  }

  const refreshToken = await prisma.$transaction(async (tx) => {
    // Of two concurrent refreshes with the same token only one claims it; the other is a replay inside the grace window.
    const claimed = await tx.refreshToken.updateMany({ where: { id: record.id, usedAt: null, revokedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) {
      const current = await tx.refreshToken.findUnique({ where: { id: record.id }, select: { usedAt: true, revokedAt: true } });
      if (!current || current.revokedAt || !justRotated(current.usedAt)) return null;
    }
    return createRefreshToken(tx, user, record.familyId, userAgent);
  });
  if (!refreshToken) {
    await revokeFamily(record.familyId);
    throw invalidSession();
  }
  return { user, accessToken: issueAccessToken(user), refreshToken };
};

export const revokeFamily = async (familyId: string) => {
  await prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
};

/** Logout on this device: revokes the family the presented refresh token belongs to. */
export const endSession = async (presented: string | undefined) => {
  if (!presented) return;
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(presented) }, select: { familyId: true } });
  if (record) await revokeFamily(record.familyId);
};

/**
 * Signs the user out everywhere: older access tokens stop working (tokenVersion) and every refresh
 * token is revoked. Pass `tx` to make it part of a larger change (password reset, role change).
 */
export const revokeAllSessions = async (userId: string, tx?: Tx) => {
  const db = tx ?? prisma;
  await db.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
};

/**
 * Removes expired refresh tokens. Used (rotated) tokens are kept until they expire, because they are
 * what makes reuse detection possible.
 */
export const pruneRefreshTokens = async () => {
  const res = await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - DAY_MS) } } });
  return res.count;
};
