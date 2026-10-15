import { Response } from "express";
import * as resultService from "../services/result.service";
import { success } from "../utils/apiResponse";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";

export const listResults = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await resultService.listResults(requireUserId(req)));
};

export const getResult = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await resultService.getResult(req.params.id, requireUserId(req)));
};
