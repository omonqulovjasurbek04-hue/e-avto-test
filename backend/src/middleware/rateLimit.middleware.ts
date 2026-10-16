import { rateLimit, Store } from "express-rate-limit";
import { rateCounter } from "../lib/redis";
import { RedisRateStore } from "../lib/redisRateStore";

/**
 * With REDIS_URL set, counters live in Redis and are shared by every API process; otherwise each
 * process keeps its own in-memory counters (correct only for a single instance).
 */
const storeFor = (name: string): Store | undefined => {
  const counter = rateCounter();
  return counter ? new RedisRateStore(counter, `rl:${name}:`) : undefined;
};

const limiter = (name: string, windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: storeFor(name),
    // A Redis outage must not lock every user out of the site; the request goes through and the error is logged.
    passOnStoreError: true,
    // Integration tests fire far more requests than a real client would.
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message, errors: [] },
  });

export const authRateLimiter = limiter("auth", 60 * 1000, 20, "Too many attempts, please try again later");
export const passwordResetRateLimiter = limiter("reset", 15 * 60 * 1000, 5, "Too many reset requests, please try again later");
export const verificationRateLimiter = limiter("verify", 15 * 60 * 1000, 5, "Too many verification e-mails, please try again later");
export const refreshRateLimiter = limiter("refresh", 60 * 1000, 60, "Too many session refreshes, please try again shortly");
export const testRateLimiter = limiter("test", 60 * 1000, 120, "Too many test requests, please try again shortly");

export const contactRateLimiter = limiter("contact", 60 * 60 * 1000, 5, "Too many messages, please try again later");

export default authRateLimiter;
