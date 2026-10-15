import { Response, NextFunction, RequestHandler } from "express";
import { AuthRequest } from "./auth.middleware";
import { error } from "../utils/apiResponse";
import { hasPermission, Permission } from "../lib/permissions";

/** Runs after authMiddleware, which already loaded the current role from the database. */
export const requirePermission =
  (permission: Permission): RequestHandler =>
  (req, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      error(res, "Authentication required", 401);
      return;
    }
    if (!hasPermission(user.role, permission)) {
      error(res, "You do not have permission to do this", 403);
      return;
    }
    next();
  };

/** Passes when the user has at least one of the permissions (e.g. read-only lists shared by two roles). */
export const requireAnyPermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      error(res, "Authentication required", 401);
      return;
    }
    if (!permissions.some((p) => hasPermission(user.role, p))) {
      error(res, "You do not have permission to do this", 403);
      return;
    }
    next();
  };

/** Full back-office access (ADMIN and SUPERADMIN). Narrower roles use requirePermission per route. */
export const adminMiddleware = requirePermission("users:manage");

export default adminMiddleware;
