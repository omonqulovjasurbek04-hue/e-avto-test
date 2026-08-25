import { Request, Response } from "express";
import { prisma } from "../config/database";
import {
  updateProfile as updateUserProfile,
  getMe,
} from "../services/auth.service";
import { updateProfileSchema } from "../validators/auth";
import { success } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth.middleware";
import * as userService from "../services/user.service";

export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    success(res, { message: "Unauthorized" }, 401);
    return;
  }

  const base = await getMe(req.user.userId);

  const full = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { progress: true },
  });

  success(res, {
    user: {
      id: base.id,
      name: base.name,
      email: base.email,
      role: base.role,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      progress: full?.progress ?? [],
    },
  });
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    success(res, { message: "Unauthorized" }, 401);
    return;
  }
  const input = updateProfileSchema.parse(req.body);
  const user = await updateUserProfile(req.user.userId, input);
  success(res, { user });
};

export const getStatistics = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const statistics = await userService.getStatistics(req.user!.userId);
  success(res, statistics);
};

export const getLeaderboard = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const leaderboard = await userService.getLeaderboard();
  success(res, leaderboard);
};

export default { getProfile, updateProfile, getStatistics, getLeaderboard };
