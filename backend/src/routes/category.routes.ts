import { Router, Response } from "express";
import { z } from "zod";
import * as categories from "../services/category.service";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { requireAnyPermission, requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { success } from "../utils/apiResponse";
import { requestLanguage } from "../lib/languages";
import { categorySchema, categoryUpdateSchema } from "../validators/category";

const uuid = z.string().uuid();
const h = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => asyncHandler(fn as never);

export const publicCategoryRoutes = Router();
publicCategoryRoutes.get("/categories", h(async (req, res) => {
  res.vary("Accept-Language");
  success(res, await categories.listPublic(requestLanguage(req)));
}));

export const adminCategoryRoutes = Router();
adminCategoryRoutes.use(asyncHandler(authMiddleware));
// Question editors pick a course by category too, but only catalog managers change categories.
adminCategoryRoutes.get("/", requireAnyPermission("catalog:manage", "tests:manage"), h(async (_req, res) => success(res, await categories.listAdmin())));
adminCategoryRoutes.post("/", requirePermission("catalog:manage"), h(async (req, res) => success(res, await categories.create(requireUserId(req), categorySchema.parse(req.body)), 201)));
adminCategoryRoutes.put("/:id", requirePermission("catalog:manage"), h(async (req, res) => success(res, await categories.update(requireUserId(req), uuid.parse(req.params.id), categoryUpdateSchema.parse(req.body)))));
adminCategoryRoutes.delete("/:id", requirePermission("catalog:manage"), h(async (req, res) => success(res, await categories.remove(requireUserId(req), uuid.parse(req.params.id)))));
