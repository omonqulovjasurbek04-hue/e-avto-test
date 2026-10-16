import { z } from "zod";
import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as courseService from "../services/course.service";
import { success } from "../utils/apiResponse";
import * as categoryService from "../services/category.service";
import { requestLanguage } from "../lib/languages";

const categoryParam = z.string().regex(/^[a-z0-9-]{1,80}$/).optional();

/** ?category=<slug> filters by category; an unknown or inactive slug gives an empty list. */
export const listCourses = async (req: Request, res: Response): Promise<void> => {
  const slug = categoryParam.parse(req.query.category);
  res.vary("Accept-Language");
  const lang = requestLanguage(req);
  if (slug) {
    const categoryId = await categoryService.resolveSlug(slug);
    success(res, categoryId ? await courseService.listCourses(false, { categoryId, lang }) : []);
    return;
  }
  success(res, await courseService.listCourses(false, { lang }));
};

export const getCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await courseService.getCourse(req.params.id, false, req.user));
};

/** Lessons of a published course, in order. */
export const listCourseLessons = async (req: AuthRequest, res: Response): Promise<void> => {
  const course = await courseService.getCourse(req.params.id, false, req.user);
  success(res, course.lessons);
};
