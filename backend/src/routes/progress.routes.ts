import { Router } from "express";
import * as progressController from "../controllers/progress.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use("/progress", asyncHandler(authMiddleware));
router.get("/progress", asyncHandler(progressController.listProgress));
router.get("/progress/completed", asyncHandler(progressController.listCompleted));
router.get("/progress/:lessonId", asyncHandler(progressController.getLessonProgress));
router.put("/progress/:lessonId", asyncHandler(progressController.updateLessonProgress));
// Video lessons: heartbeats from the player; the server decides when the video counts as watched.
router.post("/progress/:lessonId/watch", asyncHandler(progressController.recordVideoWatch));

export default router;
