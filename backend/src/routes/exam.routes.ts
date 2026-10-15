import { Router, Response } from "express";
import { z } from "zod";
import * as exam from "../services/exam.service";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { success } from "../utils/apiResponse";

const uuid = z.string().uuid();
const h = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => asyncHandler(fn as never);

/** Exam rules and question-bank import/export (tests:manage — ADMIN, SUPERADMIN, MODERATOR). */
const router = Router();
router.use(asyncHandler(authMiddleware));
router.use(requirePermission("tests:manage"));

router.get("/courses/:id/config", h(async (req, res) => success(res, await exam.getConfig(uuid.parse(req.params.id)))));
router.put("/courses/:id/config", h(async (req, res) => success(res, await exam.saveConfig(requireUserId(req), uuid.parse(req.params.id), exam.testConfigSchema.parse(req.body)))));

router.post("/questions/import", h(async (req, res) => {
  const { questions } = z.object({ questions: z.array(z.unknown()) }).parse(req.body);
  success(res, await exam.importQuestions(requireUserId(req), questions), 201);
}));
router.get("/questions/export", h(async (req, res) => {
  const rows = await exam.exportQuestions(z.string().uuid().optional().parse(req.query.courseId));
  success(res, { questions: rows });
}));

export default router;
