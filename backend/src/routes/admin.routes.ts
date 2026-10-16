import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAnyPermission, requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

/** Every route names the permission it needs; the role matrix lives in lib/permissions.ts. */
const router = Router();
router.use(asyncHandler(authMiddleware));

const users = requirePermission("users:manage");
const catalog = requirePermission("catalog:manage");
const tests = requirePermission("tests:manage");
// Question editors (MODERATOR) need the course/lesson lists to file questions, but may not change them.
const readCatalog = requireAnyPermission("catalog:manage", "tests:manage");

router.get("/users", users, asyncHandler(adminController.listUsers));
router.patch("/users/:id/role", users, asyncHandler(adminController.updateUserRole));
router.patch("/users/:id/status", users, asyncHandler(adminController.updateUserStatus));
router.delete("/users/:id/two-factor", users, asyncHandler(adminController.resetUserTwoFactor));

router.get("/courses", readCatalog, asyncHandler(adminController.listCourses));
router.post("/courses", catalog, asyncHandler(adminController.createCourse));
router.put("/courses/:id", catalog, asyncHandler(adminController.updateCourse));
router.delete("/courses/:id", catalog, asyncHandler(adminController.deleteCourse));

router.get("/lessons", readCatalog, asyncHandler(adminController.listLessons));
router.post("/lessons", catalog, asyncHandler(adminController.createLesson));
router.put("/lessons/:id", catalog, asyncHandler(adminController.updateLesson));
router.delete("/lessons/:id", catalog, asyncHandler(adminController.deleteLesson));

router.get("/questions", tests, asyncHandler(adminController.listQuestions));
router.post("/questions", tests, asyncHandler(adminController.createQuestion));
router.put("/questions/:id", tests, asyncHandler(adminController.updateQuestion));
router.delete("/questions/:id", tests, asyncHandler(adminController.deleteQuestion));

router.get("/statistics", users, asyncHandler(adminController.getStatistics));

export default router;
