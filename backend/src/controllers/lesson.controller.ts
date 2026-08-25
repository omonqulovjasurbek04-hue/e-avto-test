import { Request, Response } from "express";
import * as lessonService from "../services/lesson.service";
import { success } from "../utils/apiResponse";

export const getLesson = async (
  req: Request,
  res: Response
): Promise<void> => {
  const lesson = await lessonService.getLesson(req.params.id);
  success(res, lesson);
};

export default { getLesson };
