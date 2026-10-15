import { Router } from "express";
import * as c from "../controllers/catalog.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { authRateLimiter } from "../middleware/rateLimit.middleware";

/** Public pricing: packages and a server-computed quote (the client never sends an amount). */
export const publicCatalogRoutes = Router();
publicCatalogRoutes.get("/packages", asyncHandler(c.listPackages));
// Rate limited so coupon codes cannot be brute-forced.
publicCatalogRoutes.post("/quote", authRateLimiter, asyncHandler(c.quote));

export const adminCatalogRoutes = Router();
adminCatalogRoutes.use(asyncHandler(authMiddleware));
adminCatalogRoutes.use(requirePermission("catalog:manage"));

adminCatalogRoutes.get("/packages", asyncHandler(c.adminListPackages));
adminCatalogRoutes.post("/packages", asyncHandler(c.adminCreatePackage));
adminCatalogRoutes.put("/packages/:id", asyncHandler(c.adminUpdatePackage));
adminCatalogRoutes.delete("/packages/:id", asyncHandler(c.adminArchivePackage));
adminCatalogRoutes.post("/packages/:id/prices", asyncHandler(c.adminSetPrice));

adminCatalogRoutes.get("/discounts", asyncHandler(c.adminListDiscounts));
adminCatalogRoutes.post("/discounts", asyncHandler(c.adminCreateDiscount));
adminCatalogRoutes.patch("/discounts/:id", asyncHandler(c.adminToggleDiscount));

adminCatalogRoutes.get("/coupons", asyncHandler(c.adminListCoupons));
adminCatalogRoutes.post("/coupons", asyncHandler(c.adminCreateCoupon));
adminCatalogRoutes.patch("/coupons/:id", asyncHandler(c.adminToggleCoupon));
