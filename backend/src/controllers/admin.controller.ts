import { Request, Response } from "express";
import * as adminService from "../services/admin.service";
import * as courseService from "../services/course.service";
import {
  courseCreateSchema,
  courseUpdateSchema,
  questionCreateSchema,
  questionUpdateSchema,
} from "../validators/course";
import { success } from "../utils/apiResponse";

export const listUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const users = await adminService.listUsers();
  success(res, users);
};

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

export const createCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  const input = courseCreateSchema.parse(req.body);
  const course = await courseService.createCourse(input);
  success(res, course, 201);
};

export const updateCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  const input = courseUpdateSchema.parse(req.body);
  const course = await courseService.updateCourse(req.params.id, input);
  success(res, course);
};

export const deleteCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await courseService.deleteCourse(req.params.id);
  success(res, result);
};

export const listQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const questions = await courseService.listQuestions();
  success(res, questions);
};

export const createQuestion = async (
  req: Request,
  res: Response
): Promise<void> => {
  const input = questionCreateSchema.parse(req.body);
  const question = await courseService.createQuestion(input);
  success(res, question, 201);
};

export const updateQuestion = async (
  req: Request,
  res: Response
): Promise<void> => {
  const input = questionUpdateSchema.parse(req.body);
  const question = await courseService.updateQuestion(req.params.id, input);
  success(res, question);
};

export const deleteQuestion = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await courseService.deleteQuestion(req.params.id);
  success(res, result);
};

export const getStatistics = async (
  req: Request,
  res: Response
): Promise<void> => {
  const statistics = await adminService.getStatistics();
  success(res, statistics);
};

export default {
  listUsers,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getStatistics,
};
