import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/profile", asyncHandler(authMiddleware), asyncHandler(userController.getProfile));
router.put("/profile", asyncHandler(authMiddleware), asyncHandler(userController.updateProfile));
router.get("/users/me", asyncHandler(authMiddleware), asyncHandler(userController.getProfile));
router.put("/users/me", asyncHandler(authMiddleware), asyncHandler(userController.updateProfile));
router.get("/users/me/statistics", asyncHandler(authMiddleware), asyncHandler(userController.getStatistics));
router.get("/statistics", asyncHandler(authMiddleware), asyncHandler(userController.getStatistics));
router.get("/leaderboard", asyncHandler(userController.getLeaderboard));

export default router;
