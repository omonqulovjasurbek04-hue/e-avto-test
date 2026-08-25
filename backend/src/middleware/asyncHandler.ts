import { RequestHandler } from "express";

/**
 * Sends rejected promises from async controllers to Express' error middleware.
 * Express 4 does not do this automatically.
 */
export const asyncHandler = (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export default asyncHandler;
