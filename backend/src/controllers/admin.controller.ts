import { Request, Response } from "express";
import * as adminService from "../services/admin.service";
import * as courseService from "../services/course.service";
import {
  courseCreateSchema,
  courseUpdateSchema,
  lessonCreateSchema,
  lessonUpdateSchema,
  questionCreateSchema,
  questionUpdateSchema,
  userRoleSchema,
  userStatusSchema,
  listQuerySchema,
} from "../validators/course";
import { success, paginated } from "../utils/apiResponse";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const { items, ...meta } = await adminService.listUsers(listQuerySchema.parse(req.query));
  paginated(res, items, meta);
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role } = userRoleSchema.parse(req.body);
  success(res, await adminService.updateUserRole(requireUserId(req), req.user!.role, req.params.id, role));
};

export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { isActive } = userStatusSchema.parse(req.body);
  success(res, await adminService.updateUserStatus(requireUserId(req), req.user!.role, req.params.id, isActive));
};

export const resetUserTwoFactor = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await adminService.resetTwoFactor(requireUserId(req), req.user!.role, req.params.id));
};

export const listCourses = async (_req: Request, res: Response): Promise<void> => {
  success(res, await courseService.listCourses(true));
};

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  success(res, await courseService.createCourse(courseCreateSchema.parse(req.body), (req as AuthRequest).user?.userId ?? null), 201);
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  success(res, await courseService.updateCourse(req.params.id, courseUpdateSchema.parse(req.body), (req as AuthRequest).user?.userId ?? null));
};

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  success(res, await courseService.deleteCourse(req.params.id));
};

export const listLessons = async (req: Request, res: Response): Promise<void> => {
  const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
  success(res, await courseService.listAdminLessons(courseId));
};

export const createLesson = async (req: Request, res: Response): Promise<void> => {
  success(res, await courseService.createLesson(lessonCreateSchema.parse(req.body)), 201);
};

export const updateLesson = async (req: Request, res: Response): Promise<void> => {
  success(res, await courseService.updateLesson(req.params.id, lessonUpdateSchema.parse(req.body)));
};

export const deleteLesson = async (req: Request, res: Response): Promise<void> => {
  success(res, await courseService.deleteLesson(req.params.id));
};

export const listQuestions = async (req: Request, res: Response): Promise<void> => {
  const { items, ...meta } = await courseService.listQuestions(listQuerySchema.parse(req.query));
  paginated(res, items, meta);
};

export const createQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await courseService.createQuestion(questionCreateSchema.parse(req.body), requireUserId(req)), 201);
};

export const updateQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await courseService.updateQuestion(req.params.id, questionUpdateSchema.parse(req.body), requireUserId(req)));
};

export const deleteQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await courseService.deleteQuestion(req.params.id, requireUserId(req)));
};

export const getStatistics = async (_req: Request, res: Response): Promise<void> => {
  success(res, await adminService.getStatistics());
};
