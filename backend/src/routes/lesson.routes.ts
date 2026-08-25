import { Router } from "express";
import * as lessonController from "../controllers/lesson.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/lessons/:id", asyncHandler(lessonController.getLesson));

export default router;
