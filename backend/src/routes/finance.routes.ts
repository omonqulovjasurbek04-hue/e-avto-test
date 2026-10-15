import { Router, Response } from "express";
import { z } from "zod";
import * as finance from "../services/finance.service";
import * as refunds from "../services/refund.service";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { success, paginated } from "../utils/apiResponse";

const h = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => asyncHandler(fn as never);

/** Orders and revenue (orders:read — ADMIN, SUPERADMIN, FINANCE). */
const router = Router();
router.use(asyncHandler(authMiddleware));
router.use(requirePermission("orders:read"));

router.get("/orders", h(async (req, res) => {
  const q = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(["PENDING", "PAID", "CANCELLED", "EXPIRED", "REFUNDED"]).optional(),
    search: z.string().trim().max(100).optional(),
  }).parse(req.query);
  const { items, ...meta } = await finance.listOrders(q);
  paginated(res, items, meta);
}));

router.get("/summary", h(async (req, res) => {
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);
  const q = z.object({ from: z.coerce.date().default(monthAgo), to: z.coerce.date().default(() => new Date(Date.now() + 1000)) }).parse(req.query);
  if (q.to <= q.from) { res.status(400).json({ success: false, message: "to must be after from", errors: [] }); return; }
  success(res, await finance.summary(q.from, q.to));
}));

// Money movement needs payments:manage (FINANCE, SUPERADMIN) on top of reading orders.
const uuid = z.string().uuid();
router.get("/refunds", requirePermission("payments:manage"), h(async (_req, res) => success(res, await refunds.listRefunds())));
router.post("/payments/:id/refunds", requirePermission("payments:manage"), h(async (req, res) => {
  const body = z.object({ amount: z.number().int().min(1), reason: z.string().trim().min(3).max(300) }).parse(req.body);
  success(res, await refunds.createRefund(requireUserId(req), uuid.parse(req.params.id), body.amount, body.reason), 201);
}));
router.post("/refunds/:id/complete", requirePermission("payments:manage"), h(async (req, res) => success(res, await refunds.completeRefund(requireUserId(req), uuid.parse(req.params.id)))));
router.post("/refunds/:id/reject", requirePermission("payments:manage"), h(async (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body);
  success(res, await refunds.rejectRefund(requireUserId(req), uuid.parse(req.params.id), reason));
}));

export default router;
