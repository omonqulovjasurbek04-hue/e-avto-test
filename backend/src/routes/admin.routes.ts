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
// Question editors (MODERATOR) need the course/lesson lists to file questions, and group planners (MANAGER)
// need the course list to open a group, but neither may change them.
const readCatalog = requireAnyPermission("catalog:manage", "tests:manage", "groups:manage");
// The front desk (users:read) picks teachers and students for groups from this list; changes still need users:manage.
const readUsers = requireAnyPermission("users:manage", "users:read");

router.get("/users", readUsers, asyncHandler(adminController.listUsers));
router.patch("/users/:id/role", users, asyncHandler(adminController.updateUserRole));
router.patch("/users/:id/status", users, asyncHandler(adminController.updateUserStatus));
router.delete("/users/:id/two-factor", users, asyncHandler(adminController.resetUserTwoFactor));
// Number history (user/student/teacher) and courses of one account; opening a course without payment.
router.get("/users/:id/identifiers", readUsers, asyncHandler(adminController.userIdentifiers));
router.get("/users/:id/enrollments", readUsers, asyncHandler(adminController.userEnrollments));
router.post("/users/:id/enrollments", requirePermission("enrollments:grant"), asyncHandler(adminController.grantEnrollment));

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
