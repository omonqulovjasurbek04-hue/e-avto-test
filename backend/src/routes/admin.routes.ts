import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/users", asyncHandler(adminController.listUsers));
router.get("/courses", asyncHandler(adminController.listCourses));
router.post("/courses", asyncHandler(adminController.createCourse));
router.put("/courses/:id", asyncHandler(adminController.updateCourse));
router.delete("/courses/:id", asyncHandler(adminController.deleteCourse));
router.get("/questions", asyncHandler(adminController.listQuestions));
router.post("/questions", asyncHandler(adminController.createQuestion));
router.put("/questions/:id", asyncHandler(adminController.updateQuestion));
router.delete("/questions/:id", asyncHandler(adminController.deleteQuestion));
router.get("/statistics", asyncHandler(adminController.getStatistics));

export default router;
