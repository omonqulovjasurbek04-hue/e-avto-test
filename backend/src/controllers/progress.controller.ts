import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { success } from "../utils/apiResponse";
import { lessonProgressSchema } from "../validators/progress";
import * as progressService from "../services/progress.service";

export const listProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const progress = await progressService.getProgress(req.user!.userId);
  success(res, progress);
};

export const getLessonProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const progress = await progressService.getLessonProgress(req.user!.userId, req.params.lessonId);
  success(res, progress ?? { percent: 0, completed: false });
};

export const updateLessonProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = lessonProgressSchema.parse(req.body);
  const progress = await progressService.updateLessonProgress(req.user!.userId, req.params.lessonId, input);
  success(res, progress);
};
