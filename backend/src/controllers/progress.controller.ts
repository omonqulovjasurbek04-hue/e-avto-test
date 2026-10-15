import { Response } from "express";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";
import { success } from "../utils/apiResponse";
import { lessonProgressSchema } from "../validators/progress";
import * as progressService from "../services/progress.service";

export const listProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await progressService.getProgress(requireUserId(req)));
};

export const listCompleted = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await progressService.listCompletedLessonIds(requireUserId(req)));
};

export const getLessonProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const progress = await progressService.getLessonProgress(requireUserId(req), req.params.lessonId);
  success(res, progress ?? { percent: 0, completed: false });
};

export const updateLessonProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = lessonProgressSchema.parse(req.body);
  success(res, await progressService.updateLessonProgress(requireUserId(req), req.params.lessonId, input, req.user!.role));
};
