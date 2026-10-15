import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { paginated } from "../utils/apiResponse";
import { getPagination } from "../utils/pagination";

/** Read-only audit trail (audit:read — ADMIN, SUPERADMIN). The log itself is append-only: no update/delete endpoints exist. */
const router = Router();
router.use(asyncHandler(authMiddleware));
router.use(requirePermission("audit:read"));

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const q = z
      .object({
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        entity: z.string().trim().max(60).optional(),
        action: z.string().trim().max(80).optional(),
        actorId: z.string().uuid().optional(),
      })
      .parse(req.query);
    const { page, limit, skip, take } = getPagination(q.page, q.limit ?? 25);
    const where = {
      ...(q.entity ? { entity: q.entity } : {}),
      ...(q.action ? { action: { contains: q.action, mode: "insensitive" as const } } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.auditLog.count({ where }),
    ]);
    const actorIds = [...new Set(rows.map((r) => r.actorId).filter((x): x is string => Boolean(x)))];
    const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, role: true } });
    const byId = new Map(actors.map((a) => [a.id, a]));
    paginated(res, rows.map((r) => ({ ...r, actor: r.actorId ? byId.get(r.actorId) ?? null : null })), { page, limit, total });
  })
);

export default router;
