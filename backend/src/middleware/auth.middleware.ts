import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { error } from "../utils/apiResponse";

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      error(res, "Authentication required", 401);
      return;
    }

    const token = header.split(" ")[1];
    if (!token) {
      error(res, "Authentication required", 401);
      return;
    }

    const payload = verifyToken(token);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    error(res, "Invalid or expired token", 401);
  }
};

export default authMiddleware;
