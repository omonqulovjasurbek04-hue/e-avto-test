import { Router } from "express";
import * as lessonController from "../controllers/lesson.controller";
import { optionalAuthMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/lessons", asyncHandler(optionalAuthMiddleware), asyncHandler(lessonController.listLessons));
router.get("/lessons/:id", asyncHandler(optionalAuthMiddleware), asyncHandler(lessonController.getLesson));

export default router;
