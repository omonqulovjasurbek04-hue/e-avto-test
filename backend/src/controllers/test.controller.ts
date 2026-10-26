import { Response } from "express";
import * as testService from "../services/test.service";
import { testStartSchema, testAnswerSchema, testFinishSchema, ticketListSchema } from "../validators/test";
import { success } from "../utils/apiResponse";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";

export const startTest = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = testStartSchema.parse(req.body);
  success(res, await testService.startTest(requireUserId(req), input, req.user!.role), 201);
};

export const answerQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = testAnswerSchema.parse(req.body);
  success(res, await testService.answerQuestion(req.params.id, requireUserId(req), input));
};

export const finishTest = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = testFinishSchema.parse(req.body ?? {});
  success(res, await testService.finishTest(req.params.id, requireUserId(req), input));
};

export const listTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  const { courseId } = ticketListSchema.parse(req.query);
  success(res, await testService.ticketStatuses(requireUserId(req), courseId, req.user!.role));
};
