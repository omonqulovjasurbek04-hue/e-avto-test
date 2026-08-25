import { rateLimit } from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts, please try again later",
    errors: [],
  },
});

export const testRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many test submissions, please try again shortly",
    errors: [],
  },
});

export default authRateLimiter;
