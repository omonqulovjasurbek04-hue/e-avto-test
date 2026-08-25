import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "../validators/auth";
import { success, error } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth.middleware";

export const register = async (req: Request, res: Response): Promise<void> => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  success(res, result, 201);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  success(res, result, 200);
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    error(res, "Authentication required", 401);
    return;
  }
  const user = await authService.getMe(req.user.userId);
  success(res, user);
};

export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    error(res, "Authentication required", 401);
    return;
  }
  const user = await authService.getMe(req.user.userId);
  success(res, { user });
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    error(res, "Authentication required", 401);
    return;
  }
  const input = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user.userId, input);
  success(res, { user });
};

export default { register, login, me, getProfile, updateProfile };
