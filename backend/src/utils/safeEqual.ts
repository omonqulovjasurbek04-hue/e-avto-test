import crypto from "crypto";

/** Constant-time string comparison (hashing first makes the lengths equal). */
export const safeEqual = (a: string, b: string): boolean =>
  crypto.timingSafeEqual(crypto.createHash("sha256").update(a).digest(), crypto.createHash("sha256").update(b).digest());
