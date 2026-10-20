import { Router, Response } from "express";
import { z } from "zod";
import * as student from "../services/student.service";
import * as notifications from "../services/notification.service";
import * as practice from "../services/practice.service";
import { courseAccessSummary } from "../services/access.service";
import { studentGroups } from "../services/group.service";
import { recordStudyTime, weekStudyTime } from "../services/studyTime.service";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { success } from "../utils/apiResponse";
import { languageSchema } from "../lib/languages";

const router = Router();
router.use("/me", asyncHandler(authMiddleware));

router.get("/me/enrollments", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await student.listEnrollments(requireUserId(req)));
}));

// Which courses the student may open (purchased and active); the UI locks lessons and tests of the rest.
router.get("/me/course-access", asyncHandler(async (req: AuthRequest, res: Response) => {
  requireUserId(req);
  success(res, await courseAccessSummary(req.user!));
}));

// The student's groups with their rhythm (juft/toq kunlar) and lesson time, for the dashboard.
router.get("/me/groups", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await studentGroups(requireUserId(req)));
}));

// Study time: the lesson/test page reports what it counted; the server credits only real elapsed time.
const studyBeatSchema = z.object({ kind: z.enum(["lesson", "test"]), seconds: z.number().int().min(1).max(600) }).strict();
router.post("/me/study-time", asyncHandler(async (req: AuthRequest, res: Response) => {
  const { kind, seconds } = studyBeatSchema.parse(req.body);
  success(res, await recordStudyTime(requireUserId(req), kind, seconds));
}));
router.get("/me/study-time/week", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await weekStudyTime(requireUserId(req)));
}));

router.get("/me/notifications", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await student.listNotifications(requireUserId(req)));
}));

router.post("/me/notifications/read-all", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await student.markAllNotificationsRead(requireUserId(req)));
}));

router.post("/me/notifications/:id/read", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await student.markNotificationRead(requireUserId(req), z.string().uuid().parse(req.params.id)));
}));

router.get("/me/notification-preferences", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await notifications.getPreferences(requireUserId(req)));
}));

router.put("/me/notification-preferences", asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = z.object({ inApp: z.boolean().optional(), email: z.boolean().optional(), attendance: z.boolean().optional(), language: languageSchema.optional() }).strict().parse(req.body);
  success(res, await notifications.savePreferences(requireUserId(req), body));
}));

// Practice lists: own mistakes (derived from answers) and bookmarked questions.
router.get("/me/practice", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await practice.practiceSummary(requireUserId(req)));
}));

router.put("/me/saved-questions/:questionId", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await practice.saveQuestion(requireUserId(req), z.string().uuid().parse(req.params.questionId)));
}));

router.delete("/me/saved-questions/:questionId", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await practice.unsaveQuestion(requireUserId(req), z.string().uuid().parse(req.params.questionId)));
}));

export default router;
