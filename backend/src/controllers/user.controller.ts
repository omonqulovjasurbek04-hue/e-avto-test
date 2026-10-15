import { Request, Response } from "express";
import { updateProfileSchema } from "../validators/auth";
import { success } from "../utils/apiResponse";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";
import * as authService from "../services/auth.service";
import * as userService from "../services/user.service";

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await userService.getProfile(requireUserId(req)));
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = updateProfileSchema.parse(req.body);
  success(res, { user: await authService.updateProfile(requireUserId(req), input) });
};

export const getStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await userService.getStatistics(requireUserId(req)));
};

export const getLeaderboard = async (_req: Request, res: Response): Promise<void> => {
  success(res, await userService.getLeaderboard());
};
