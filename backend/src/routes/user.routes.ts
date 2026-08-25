import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/profile", authMiddleware, asyncHandler(userController.getProfile));
router.put("/profile", authMiddleware, asyncHandler(userController.updateProfile));
router.get("/users/me", authMiddleware, asyncHandler(userController.getProfile));
router.put("/users/me", authMiddleware, asyncHandler(userController.updateProfile));
router.get("/users/me/statistics", authMiddleware, asyncHandler(userController.getStatistics));
router.get("/statistics", authMiddleware, asyncHandler(userController.getStatistics));
router.get("/leaderboard", asyncHandler(userController.getLeaderboard));

export default router;
