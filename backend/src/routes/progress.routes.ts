import { Router } from "express";
import * as progressController from "../controllers/progress.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.use(authMiddleware);
router.get("/progress", asyncHandler(progressController.listProgress));
router.get("/progress/:lessonId", asyncHandler(progressController.getLessonProgress));
router.put("/progress/:lessonId", asyncHandler(progressController.updateLessonProgress));

export default router;
