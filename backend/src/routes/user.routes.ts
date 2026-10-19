import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/profile", asyncHandler(authMiddleware), asyncHandler(userController.getProfile));
router.put("/profile", asyncHandler(authMiddleware), asyncHandler(userController.updateProfile));
router.get("/users/me", asyncHandler(authMiddleware), asyncHandler(userController.getProfile));
router.put("/users/me", asyncHandler(authMiddleware), asyncHandler(userController.updateProfile));
router.get("/users/me/statistics", asyncHandler(authMiddleware), asyncHandler(userController.getStatistics));
router.get("/statistics", asyncHandler(authMiddleware), asyncHandler(userController.getStatistics));
router.get("/leaderboard", asyncHandler(optionalAuthMiddleware), asyncHandler(userController.getLeaderboard));
// The student decides whether to appear (as "First L.") in the public list.
router.put("/users/me/leaderboard", asyncHandler(authMiddleware), asyncHandler(userController.setLeaderboardVisibility));

export default router;
