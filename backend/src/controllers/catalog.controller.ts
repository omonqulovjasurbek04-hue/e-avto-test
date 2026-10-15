import { Request, Response } from "express";
import { z } from "zod";
import * as catalog from "../services/catalog.service";
import { success } from "../utils/apiResponse";
import { requireUserId, AuthRequest } from "../middleware/auth.middleware";
import {
  couponSchema, discountSchema, packageSchema, packageUpdateSchema, priceSchema, quoteSchema,
} from "../validators/catalog";

const idParam = (req: Request) => z.string().uuid().parse(req.params.id);
const activeBody = (req: Request) => z.object({ isActive: z.boolean() }).parse(req.body).isActive;

// public
export const listPackages = async (req: Request, res: Response): Promise<void> => {
  const courseId = z.string().uuid().optional().parse(req.query.courseId);
  success(res, await catalog.listPublicPackages(courseId));
};

export const quote = async (req: Request, res: Response): Promise<void> => {
  const { packageId, couponCode } = quoteSchema.parse(req.body);
  success(res, await catalog.quote(packageId, couponCode));
};

// admin
export const adminListPackages = async (req: Request, res: Response): Promise<void> => {
  success(res, await catalog.listAdminPackages(z.string().uuid().optional().parse(req.query.courseId)));
};
export const adminCreatePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await catalog.createPackage(requireUserId(req), packageSchema.parse(req.body)), 201);
};
export const adminUpdatePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await catalog.updatePackage(requireUserId(req), idParam(req), packageUpdateSchema.parse(req.body)));
};
export const adminArchivePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await catalog.archivePackage(requireUserId(req), idParam(req)));
};
export const adminSetPrice = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await catalog.setPrice(requireUserId(req), idParam(req), priceSchema.parse(req.body)), 201);
};
export const adminListDiscounts = async (_req: Request, res: Response): Promise<void> => {
  success(res, await catalog.listDiscounts());
};
export const adminCreateDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await catalog.createDiscount(requireUserId(req), discountSchema.parse(req.body)), 201);
};
export const adminToggleDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await catalog.setDiscountActive(requireUserId(req), idParam(req), activeBody(req)));
};
export const adminListCoupons = async (_req: Request, res: Response): Promise<void> => {
  success(res, await catalog.listCoupons());
};
export const adminCreateCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await catalog.createCoupon(requireUserId(req), couponSchema.parse(req.body)), 201);
};
export const adminToggleCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await catalog.setCouponActive(requireUserId(req), idParam(req), activeBody(req)));
};
