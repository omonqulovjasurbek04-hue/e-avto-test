import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth";
import { success } from "../utils/apiResponse";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";

export const register = async (req: Request, res: Response): Promise<void> => {
  const result = await authService.register(registerSchema.parse(req.body));
  success(res, result, 201);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  success(res, await authService.login(loginSchema.parse(req.body)));
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await authService.getMe(requireUserId(req)));
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = updateProfileSchema.parse(req.body);
  success(res, await authService.updateProfile(requireUserId(req), input));
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = changePasswordSchema.parse(req.body);
  success(res, await authService.changePassword(requireUserId(req), input));
};

export const logoutAll = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await authService.logoutEverywhere(requireUserId(req)));
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(email);
  // Same answer whether or not the account exists.
  success(res, { sent: true });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  success(res, await authService.resetPassword(resetPasswordSchema.parse(req.body)));
};
