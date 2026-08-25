import { Router } from "express";
import * as courseController from "../controllers/course.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/courses", asyncHandler(courseController.listCourses));
router.get("/courses/:id", asyncHandler(courseController.getCourse));

export default router;
