import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { error } from "../utils/apiResponse";
import { HttpError } from "../utils/errors";
import { env } from "../config/env";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    error(res, "Validation failed", 422, errors);
    return;
  }

  if (err instanceof HttpError) {
    error(res, err.message, err.status, err.details ?? []);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      error(res, "Record with the same unique value already exists", 409);
      return;
    }
    if (err.code === "P2025") {
      error(res, "Record not found", 404);
      return;
    }
    if (err.code === "P2003") {
      error(res, "Referenced record does not exist", 400);
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    error(res, "Invalid data provided", 400);
    return;
  }

  // body-parser failures (too large, wrong charset, aborted upload...) are client errors, not server errors.
  const parserErr = err as { type?: string; status?: number };
  if (typeof parserErr?.type === "string" && parserErr.type.startsWith("entity.") && parserErr.status && parserErr.status < 500) {
    const message =
      parserErr.status === 413 ? "Request body is too large" : parserErr.type === "entity.parse.failed" ? "Malformed JSON body" : "Invalid request body";
    error(res, message, parserErr.status);
    return;
  }

  if (env.NODE_ENV !== "production") {
    console.error(err);
  } else {
    console.error("Unhandled error:", err instanceof Error ? err.message : "unknown");
  }
  error(res, "Internal server error", 500);
};

export default errorMiddleware;
