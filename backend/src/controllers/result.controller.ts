import { Request, Response } from "express";
import * as resultService from "../services/result.service";
import { success } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth.middleware";

export const listResults = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) return;
  const results = await resultService.listResults(req.user.userId);
  success(res, results);
};

export const getResult = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) return;
  const result = await resultService.getResult(
    req.params.id,
    req.user.userId
  );
  success(res, result);
};

export default { listResults, getResult };
