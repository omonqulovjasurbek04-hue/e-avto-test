import { Response } from "express";
import { updateProfileSchema } from "../validators/auth";
import { success } from "../utils/apiResponse";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";
import * as authService from "../services/auth.service";
import * as userService from "../services/user.service";
import * as leaderboard from "../services/leaderboard.service";
import { z } from "zod";

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

const leaderboardQuery = z.object({
  courseId: z.string().uuid().optional(),
  sort: z.enum(["points", "accuracy", "tests"]).optional(),
});

/** Public; with a valid token the viewer's own (private) position is included. */
export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const q = leaderboardQuery.parse(req.query);
  success(res, await leaderboard.publicLeaderboard({ ...q, viewerId: req.user?.userId }));
};

export const setLeaderboardVisibility = async (req: AuthRequest, res: Response): Promise<void> => {
  const { visible } = z.object({ visible: z.boolean() }).parse(req.body);
  success(res, await leaderboard.setOptIn(requireUserId(req), visible));
};
