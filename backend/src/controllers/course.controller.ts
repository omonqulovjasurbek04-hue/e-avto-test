import { Request, Response } from "express";
import * as courseService from "../services/course.service";
import { success, error } from "../utils/apiResponse";

export const listCourses = async (
  req: Request,
  res: Response
): Promise<void> => {
  const courses = await courseService.listCourses();
  success(
    res,
    courses.map((c) => ({ ...c, lessonCount: c._count.lessons }))
  );
};

export const getCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  const course = await courseService.getCourse(req.params.id);
  success(res, course);
};

export default { listCourses, getCourse };
