import { Request, Response } from "express";
import * as testService from "../services/test.service";
import {
  testStartSchema,
  testAnswerSchema,
  testFinishSchema,
} from "../validators/test";
import { success } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth.middleware";

export const startTest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) return;
  const input = testStartSchema.parse(req.body);
  const result = await testService.startTest(req.user.userId, input);
  success(res, result, 201);
};

export const answerQuestion = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) return;
  const input = testAnswerSchema.parse(req.body);
  const result = await testService.answerQuestion(
    req.params.id,
    req.user.userId,
    input
  );
  success(res, result);
};

export const finishTest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) return;
  const input = testFinishSchema.parse(req.body);
  const result = await testService.finishTest(
    req.params.id,
    req.user.userId,
    input
  );
  success(res, result);
};

export default { startTest, answerQuestion, finishTest };
