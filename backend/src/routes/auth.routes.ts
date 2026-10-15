import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authRateLimiter, passwordResetRateLimiter } from "../middleware/rateLimit.middleware";
import * as telegramController from "../controllers/telegram.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.post("/register", authRateLimiter, asyncHandler(authController.register));
router.post("/login", authRateLimiter, asyncHandler(authController.login));
router.get("/me", asyncHandler(authMiddleware), asyncHandler(authController.me));
router.put("/password", asyncHandler(authMiddleware), authRateLimiter, asyncHandler(authController.changePassword));
router.post("/logout-all", asyncHandler(authMiddleware), asyncHandler(authController.logoutAll));
router.post("/forgot-password", passwordResetRateLimiter, asyncHandler(authController.forgotPassword));
router.post("/reset-password", passwordResetRateLimiter, asyncHandler(authController.resetPassword));

router.post("/telegram/start", authRateLimiter, asyncHandler(telegramController.start));
router.post("/telegram/verify", authRateLimiter, asyncHandler(telegramController.verify));

export default router;
