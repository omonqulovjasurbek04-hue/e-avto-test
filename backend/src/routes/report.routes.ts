import { Router, Response } from "express";
import { z } from "zod";
import * as reports from "../services/report.service";
import { systemStatus } from "../services/system.service";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { success, error } from "../utils/apiResponse";

const h = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => asyncHandler(fn as never);

const period = z.object({
  from: z.coerce.date().default(() => new Date(Date.now() - 30 * 86_400_000)),
  to: z.coerce.date().default(() => new Date(Date.now() + 1000)),
  courseId: z.string().uuid().optional(),
});
const MAX_DAYS = 366;

const parsePeriod = (req: AuthRequest, res: Response) => {
  const q = period.parse(req.query);
  if (q.to <= q.from) return void error(res, "to must be after from", 400);
  if (q.to.getTime() - q.from.getTime() > MAX_DAYS * 86_400_000) return void error(res, `period must not exceed ${MAX_DAYS} days`, 400);
  return q;
};

/** Reports: reports:read (ADMIN, SUPERADMIN, FINANCE). */
export const reportRoutes = Router();
reportRoutes.use(asyncHandler(authMiddleware));
reportRoutes.use(requirePermission("reports:read"));
reportRoutes.get("/tests", h(async (req, res) => {
  const q = parsePeriod(req, res);
  if (q) success(res, await reports.testResults(q.from, q.to, q.courseId));
}));
reportRoutes.get("/teachers", h(async (req, res) => {
  const q = parsePeriod(req, res);
  if (q) success(res, await reports.teacherWorkload(q.from, q.to));
}));

/** Integration status: settings:manage (ADMIN, SUPERADMIN). */
export const systemRoutes = Router();
systemRoutes.use(asyncHandler(authMiddleware));
systemRoutes.use(requirePermission("settings:manage"));
systemRoutes.get("/", h(async (_req, res) => success(res, await systemStatus())));
