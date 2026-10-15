import { Router, Response } from "express";
import { z } from "zod";
import * as student from "../services/student.service";
import * as notifications from "../services/notification.service";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { success } from "../utils/apiResponse";

const router = Router();
router.use("/me", asyncHandler(authMiddleware));

router.get("/me/enrollments", asyncHandler(async (req: AuthRequest, res: Response) => {
  success(res, await student.listEnrollments(requireUserId(req)));
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
  const body = z.object({ inApp: z.boolean().optional(), email: z.boolean().optional(), attendance: z.boolean().optional() }).strict().parse(req.body);
  success(res, await notifications.savePreferences(requireUserId(req), body));
}));

export default router;
