import { Router, Request, Response, NextFunction } from "express";
import * as authController from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  authRateLimiter, telegramCodeRateLimiter,
  passwordResetRateLimiter,
  refreshRateLimiter,
  verificationRateLimiter,
} from "../middleware/rateLimit.middleware";
import * as telegramController from "../controllers/telegram.controller";
import * as googleController from "../controllers/google.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { error } from "../utils/apiResponse";

const router = Router();

/**
 * Endpoints driven by the refresh cookie must not be callable from a plain cross-site form or link:
 * a custom header forces a CORS preflight, which only the allowed origins pass.
 */
const requireXhr = (req: Request, res: Response, next: NextFunction) => {
  if (req.get("x-requested-with") !== "XMLHttpRequest") {
    error(res, "Missing X-Requested-With header", 403);
    return;
  }
  next();
};

router.post("/register", authRateLimiter, asyncHandler(authController.register));
router.post("/login", authRateLimiter, asyncHandler(authController.login));
router.post("/2fa/login", authRateLimiter, asyncHandler(authController.loginTwoFactor));
router.post("/refresh", requireXhr, refreshRateLimiter, asyncHandler(authController.refresh));
router.post("/logout", requireXhr, asyncHandler(authController.logout));
router.get("/me", asyncHandler(authMiddleware), asyncHandler(authController.me));
// After the Telegram code: name, phone and password for the new account (once).
router.post("/complete-registration", asyncHandler(authMiddleware), authRateLimiter, asyncHandler(authController.completeRegistration));
router.put("/password", asyncHandler(authMiddleware), authRateLimiter, asyncHandler(authController.changePassword));
router.post("/logout-all", asyncHandler(authMiddleware), asyncHandler(authController.logoutAll));
// Connected devices. Under /api/auth so the refresh cookie (path /api/auth) tells which device is asking.
router.get("/devices", asyncHandler(authMiddleware), asyncHandler(authController.listDevices));
router.post("/devices/sign-out-others", asyncHandler(authMiddleware), requireXhr, asyncHandler(authController.revokeOtherDevices));
router.delete("/devices/:id", asyncHandler(authMiddleware), requireXhr, asyncHandler(authController.revokeDevice));
// Continue with Google: start -> Google -> callback -> the site's /auth/google page.
router.get("/google/config", googleController.config);
router.get("/google/start", authRateLimiter, asyncHandler(googleController.start));
router.get("/google/callback", authRateLimiter, asyncHandler(googleController.callback));
router.post("/forgot-password", passwordResetRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/reset-password", passwordResetRateLimiter, asyncHandler(authController.resetPassword));

router.post("/verify-email", authRateLimiter, asyncHandler(authController.verifyEmail));
router.post("/verify-email/resend", asyncHandler(authMiddleware), verificationRateLimiter, asyncHandler(authController.resendVerification));

router.get("/2fa", asyncHandler(authMiddleware), asyncHandler(authController.twoFactorStatus));
router.post("/2fa/setup", asyncHandler(authMiddleware), authRateLimiter, asyncHandler(authController.twoFactorSetup));
router.post("/2fa/enable", asyncHandler(authMiddleware), authRateLimiter, asyncHandler(authController.twoFactorEnable));
router.post("/2fa/disable", asyncHandler(authMiddleware), authRateLimiter, asyncHandler(authController.twoFactorDisable));
router.post("/2fa/recovery-codes", asyncHandler(authMiddleware), authRateLimiter, asyncHandler(authController.twoFactorRecoveryCodes));

router.post("/telegram/start", authRateLimiter, asyncHandler(telegramController.start));
router.post("/telegram/verify", authRateLimiter, telegramCodeRateLimiter, asyncHandler(telegramController.verify));
// Linked accounts in Settings: link Telegram with a bot code; unlink Google or Telegram.
router.post("/telegram/link", asyncHandler(authMiddleware), telegramCodeRateLimiter, asyncHandler(telegramController.link));
router.delete("/telegram", asyncHandler(authMiddleware), asyncHandler(telegramController.unlink));
router.delete("/google", asyncHandler(authMiddleware), asyncHandler(googleController.unlink));

export default router;
