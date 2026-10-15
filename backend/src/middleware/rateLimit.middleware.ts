import { rateLimit } from "express-rate-limit";

const limiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Integration tests fire far more requests than a real client would.
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message, errors: [] },
  });

export const authRateLimiter = limiter(60 * 1000, 20, "Too many attempts, please try again later");
export const passwordResetRateLimiter = limiter(15 * 60 * 1000, 5, "Too many reset requests, please try again later");
export const testRateLimiter = limiter(60 * 1000, 120, "Too many test requests, please try again shortly");

export const contactRateLimiter = limiter(60 * 60 * 1000, 5, "Too many messages, please try again later");

export default authRateLimiter;
