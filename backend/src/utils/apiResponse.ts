import { Response } from "express";

export const success = (
  res: Response,
  data: any,
  status: number = 200
): Response => {
  return res.status(status).json({ success: true, data });
};

export const error = (
  res: Response,
  message: string,
  status: number = 400,
  errors: any[] = []
): Response => {
  return res.status(status).json({ success: false, message, errors });
};

export default { success, error };
