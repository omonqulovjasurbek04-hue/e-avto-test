import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { error } from "../utils/apiResponse";
import { prisma } from "../config/database";

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

/**
 * Verifies the JWT and then checks the account in the database, so a deactivated user,
 * a demoted admin, or a token revoked by a password change loses access immediately.
 */
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    error(res, "Authentication required", 401);
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    error(res, "Invalid or expired token", 401);
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true, tokenVersion: true },
    });
    if (!user || user.tokenVersion !== payload.tv) {
      error(res, "Invalid or expired token", 401);
      return;
    }
    if (!user.isActive) {
      error(res, "Account is disabled", 403);
      return;
    }
    req.user = { userId: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * For public routes whose response depends on who is asking (e.g. locked vs. unlocked lessons).
 * A missing or invalid token simply means "guest"; it never errors.
 */
export const optionalAuthMiddleware = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();
  try {
    const payload = verifyToken(header.slice("Bearer ".length).trim());
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true, tokenVersion: true },
    });
    if (user && user.isActive && user.tokenVersion === payload.tv) req.user = { userId: user.id, role: user.role };
  } catch {
    // treated as guest
  }
  next();
};

/** Returns the authenticated user id. Only call after authMiddleware. */
export const requireUserId = (req: AuthRequest): string => {
  if (!req.user) throw new Error("authMiddleware must run before this handler");
  return req.user.userId;
};

export default authMiddleware;
