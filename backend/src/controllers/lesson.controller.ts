import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as lessonService from "../services/lesson.service";
import { success } from "../utils/apiResponse";

export const listLessons = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await lessonService.listLessons(req.user));
};

export const getLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await lessonService.getLesson(req.params.id, req.user));
};
