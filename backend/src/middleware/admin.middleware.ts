import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { error } from "../utils/apiResponse";

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    error(res, "Authentication required", 401);
    return;
  }

  if (req.user.role !== "ADMIN") {
    error(res, "Admin access required", 403);
    return;
  }

  next();
};

export default adminMiddleware;
