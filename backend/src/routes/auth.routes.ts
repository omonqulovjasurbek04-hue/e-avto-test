import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/rateLimit.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.post("/register", authRateLimiter, asyncHandler(authController.register));
router.post("/login", authRateLimiter, asyncHandler(authController.login));
router.get("/me", authMiddleware, asyncHandler(authController.me));

export default router;
