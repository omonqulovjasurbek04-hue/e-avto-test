import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { badRequest, conflict, notFound } from "../utils/errors";
import { computeQuote, CouponRule, DiscountRule } from "../lib/pricing";
import { writeAudit } from "./audit.service";

const now = () => new Date();

/** Current price: active, inside its validity window, newest first. */
export const currentPrice = (prices: { amount: number; currency: string; validFrom: Date; validTo: Date | null; isActive: boolean; isSample: boolean }[]) =>
  prices
    .filter((p) => p.isActive && p.validFrom <= now() && (!p.validTo || p.validTo > now()))
    .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0] ?? null;

// ───────────── public ─────────────

export const listPublicPackages = async (courseId?: string) => {
  const packages = await prisma.coursePackage.findMany({
    where: { isActive: true, archivedAt: null, course: { isPublished: true, archivedAt: null }, ...(courseId ? { courseId } : {}) },
    orderBy: [{ courseId: "asc" }, { order: "asc" }],
    include: { prices: true, course: { select: { id: true, title: true } } },
  });
  return packages
    .map(({ prices, ...p }) => ({ ...p, price: currentPrice(prices) }))
    .filter((p) => p.price !== null);
};

const toCouponRule = (c: { type: "PERCENT" | "FIXED"; value: number; startsAt: Date; expiresAt: Date | null; isActive: boolean; minOrderAmount: number; maxRedemptions: number | null; redeemedCount: number; packageId: string | null }): CouponRule => ({
  type: c.type, value: c.value, startsAt: c.startsAt, endsAt: c.expiresAt, isActive: c.isActive,
  minOrderAmount: c.minOrderAmount, maxRedemptions: c.maxRedemptions, redeemedCount: c.redeemedCount, packageId: c.packageId,
});

/** Loads the package, its current price and discounts, and computes the amount entirely on the server. */
export const quote = async (packageId: string, couponCode?: string) => {
  const pkg = await prisma.coursePackage.findFirst({
    where: { id: packageId, isActive: true, archivedAt: null, course: { isPublished: true, archivedAt: null } },
    include: { prices: true, discounts: true },
  });
  if (!pkg) throw notFound("Package not found");
  const price = currentPrice(pkg.prices);
  if (!price) throw badRequest("This package has no active price");

  const globalDiscounts = await prisma.discount.findMany({ where: { packageId: null, isActive: true } });
  const discounts: DiscountRule[] = [...pkg.discounts, ...globalDiscounts].map((d) => ({
    type: d.type, value: d.value, startsAt: d.startsAt, endsAt: d.endsAt, isActive: d.isActive,
  }));

  const coupon = couponCode ? await prisma.coupon.findUnique({ where: { code: couponCode } }) : null;
  if (couponCode && !coupon) {
    // Same shape as any other rejected coupon, so valid codes cannot be enumerated by timing/shape.
    return { packageId, currency: price.currency, isSample: price.isSample, ...computeQuote({ unitAmount: price.amount, packageId, discounts }), couponApplied: false, couponRejection: "inactive" as const, couponId: undefined as string | undefined };
  }
  const result = computeQuote({ unitAmount: price.amount, packageId, discounts, coupon: coupon ? toCouponRule(coupon) : null });
  return { packageId, currency: price.currency, isSample: price.isSample, ...result, couponId: result.couponApplied ? coupon?.id : undefined };
};

// ───────────── admin ─────────────

export const listAdminPackages = (courseId?: string) =>
  prisma.coursePackage.findMany({
    where: courseId ? { courseId } : {},
    orderBy: [{ courseId: "asc" }, { order: "asc" }],
    include: { prices: { orderBy: { validFrom: "desc" } }, course: { select: { id: true, title: true } } },
  });

export const createPackage = async (actorId: string, data: Prisma.CoursePackageUncheckedCreateInput) => {
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) throw notFound("Course not found");
  return prisma.$transaction(async (tx) => {
    const created = await tx.coursePackage.create({ data });
    await writeAudit({ actorId, action: "package.create", entity: "CoursePackage", entityId: created.id, after: created }, tx);
    return created;
  });
};

export const updatePackage = async (actorId: string, id: string, data: Prisma.CoursePackageUpdateInput) => {
  const before = await prisma.coursePackage.findUnique({ where: { id } });
  if (!before) throw notFound("Package not found");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.coursePackage.update({ where: { id }, data });
    await writeAudit({ actorId, action: "package.update", entity: "CoursePackage", entityId: id, before, after: updated }, tx);
    return updated;
  });
};

/** Packages that were ever ordered are archived, never deleted, so order history stays intact. */
export const archivePackage = async (actorId: string, id: string) => {
  const before = await prisma.coursePackage.findUnique({ where: { id } });
  if (!before) throw notFound("Package not found");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.coursePackage.update({ where: { id }, data: { archivedAt: new Date(), isActive: false } });
    await writeAudit({ actorId, action: "package.archive", entity: "CoursePackage", entityId: id, before, after: updated }, tx);
    return updated;
  });
};

/** Adds a new price and closes the previous open one; old orders keep their own snapshot. */
export const setPrice = async (
  actorId: string,
  packageId: string,
  data: { amount: number; currency: string; validFrom?: Date; validTo?: Date | null; isSample?: boolean }
) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw notFound("Package not found");
  const validFrom = data.validFrom ?? new Date();
  if (data.validTo && data.validTo <= validFrom) throw badRequest("validTo must be after validFrom");
  return prisma.$transaction(async (tx) => {
    await tx.price.updateMany({ where: { packageId, isActive: true, validTo: null }, data: { validTo: validFrom } });
    const price = await tx.price.create({ data: { packageId, ...data, validFrom } });
    await writeAudit({ actorId, action: "price.set", entity: "CoursePackage", entityId: packageId, after: price }, tx);
    return price;
  });
};

export const listDiscounts = () => prisma.discount.findMany({ orderBy: { createdAt: "desc" } });

export const createDiscount = async (actorId: string, data: Prisma.DiscountUncheckedCreateInput) => {
  if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) throw badRequest("endsAt must be after startsAt");
  return prisma.$transaction(async (tx) => {
    const d = await tx.discount.create({ data });
    await writeAudit({ actorId, action: "discount.create", entity: "Discount", entityId: d.id, after: d }, tx);
    return d;
  });
};

export const setDiscountActive = async (actorId: string, id: string, isActive: boolean) => {
  const before = await prisma.discount.findUnique({ where: { id } });
  if (!before) throw notFound("Discount not found");
  return prisma.$transaction(async (tx) => {
    const d = await tx.discount.update({ where: { id }, data: { isActive } });
    await writeAudit({ actorId, action: "discount.toggle", entity: "Discount", entityId: id, before, after: d }, tx);
    return d;
  });
};

export const listCoupons = () => prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

export const createCoupon = async (actorId: string, data: Prisma.CouponUncheckedCreateInput) => {
  if (await prisma.coupon.findUnique({ where: { code: data.code } })) throw conflict("Coupon code already exists");
  return prisma.$transaction(async (tx) => {
    const c = await tx.coupon.create({ data });
    await writeAudit({ actorId, action: "coupon.create", entity: "Coupon", entityId: c.id, after: c }, tx);
    return c;
  });
};

export const setCouponActive = async (actorId: string, id: string, isActive: boolean) => {
  const before = await prisma.coupon.findUnique({ where: { id } });
  if (!before) throw notFound("Coupon not found");
  return prisma.$transaction(async (tx) => {
    const c = await tx.coupon.update({ where: { id }, data: { isActive } });
    await writeAudit({ actorId, action: "coupon.toggle", entity: "Coupon", entityId: id, before, after: c }, tx);
    return c;
  });
};

/**
 * Race-safe coupon redemption for order creation (stage 07): a single conditional UPDATE
 * increments the counter only while a slot remains, so parallel requests cannot exceed the limit.
 */
export const reserveCouponSlot = async (tx: Prisma.TransactionClient, couponId: string): Promise<boolean> => {
  const rows = await tx.$executeRaw`
    UPDATE "coupons" SET "redeemedCount" = "redeemedCount" + 1
    WHERE "id" = ${couponId} AND "isActive" = true
      AND ("maxRedemptions" IS NULL OR "redeemedCount" < "maxRedemptions")`;
  return rows === 1;
};
