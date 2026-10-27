import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import * as avatar from "../services/avatar.service";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";
import { success } from "../utils/apiResponse";

const router = Router();

router.get("/profile", asyncHandler(authMiddleware), asyncHandler(userController.getProfile));
router.put("/profile", asyncHandler(authMiddleware), asyncHandler(userController.updateProfile));
router.get("/users/me", asyncHandler(authMiddleware), asyncHandler(userController.getProfile));
router.put("/users/me", asyncHandler(authMiddleware), asyncHandler(userController.updateProfile));
router.get("/users/me/statistics", asyncHandler(authMiddleware), asyncHandler(userController.getStatistics));
router.get("/statistics", asyncHandler(authMiddleware), asyncHandler(userController.getStatistics));
router.get("/leaderboard", asyncHandler(optionalAuthMiddleware), asyncHandler(userController.getLeaderboard));
// Profile photo: the image itself is the request body (PNG, JPEG or WebP, at most 2 MB).
router.put("/users/me/avatar", asyncHandler(authMiddleware), asyncHandler(async (req: AuthRequest, res) => {
  const length = Number(req.headers["content-length"]);
  success(res, await avatar.setAvatar({ userId: requireUserId(req), role: req.user!.role }, req, Number.isFinite(length) && length > 0 ? length : undefined));
}));
router.delete("/users/me/avatar", asyncHandler(authMiddleware), asyncHandler(async (req: AuthRequest, res) => {
  success(res, await avatar.removeAvatar(requireUserId(req)));
}));
// The student decides whether to appear (as "First L.") in the public list.
router.put("/users/me/leaderboard", asyncHandler(authMiddleware), asyncHandler(userController.setLeaderboardVisibility));

export default router;
