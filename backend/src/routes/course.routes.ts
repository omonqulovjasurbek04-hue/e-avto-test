import { Router } from "express";
import * as courseController from "../controllers/course.controller";
import { optionalAuthMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/courses", asyncHandler(courseController.listCourses));
router.get("/courses/:id", asyncHandler(optionalAuthMiddleware), asyncHandler(courseController.getCourse));
router.get("/courses/:id/lessons", asyncHandler(optionalAuthMiddleware), asyncHandler(courseController.listCourseLessons));

export default router;
