import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as courseService from "../services/course.service";
import { success } from "../utils/apiResponse";

export const listCourses = async (_req: Request, res: Response): Promise<void> => {
  success(res, await courseService.listCourses());
};

export const getCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await courseService.getCourse(req.params.id, false, req.user));
};

/** Lessons of a published course, in order. */
export const listCourseLessons = async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await courseService.getCourse(req.params.id, false, req.user);
  success(res, course.lessons);
};
