import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { error } from "../utils/apiResponse";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    error(res, "Validation failed", 400, errors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[]) || [];
      error(res, `Unique constraint failed: ${target.join(", ")}`, 409);
      return;
    }
    if (err.code === "P2025") {
      error(res, "Record not found", 404);
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    error(res, "Invalid data provided", 400);
    return;
  }

  const status = err.status || 500;
  const message = err.message || "Internal server error";
  error(res, message, status);
};

export default errorMiddleware;
