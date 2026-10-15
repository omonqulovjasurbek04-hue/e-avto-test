import { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const success = <T>(res: Response, data: T, status: number = 200): Response => {
  return res.status(status).json({ success: true, data });
};

export const paginated = <T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number }
): Response => {
  const pagination: PaginationMeta = {
    ...meta,
    totalPages: Math.max(1, Math.ceil(meta.total / meta.limit)),
  };
  return res.status(200).json({ success: true, data, pagination });
};

export const error = (
  res: Response,
  message: string,
  status: number = 400,
  errors: unknown[] = []
): Response => {
  return res.status(status).json({ success: false, message, errors });
};

export default { success, paginated, error };
