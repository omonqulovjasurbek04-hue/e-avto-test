import { DiscountType } from "@prisma/client";

/** All amounts are integer minor units (tiyin). Nothing here uses floating-point money. */

export interface DiscountRule {
  type: DiscountType;
  value: number;
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
}

export interface CouponRule extends DiscountRule {
  minOrderAmount: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  packageId: string | null;
}

export type CouponRejection = "inactive" | "not_started" | "expired" | "exhausted" | "below_minimum" | "wrong_package";

export interface Quote {
  subtotal: number;
  discountTotal: number;
  total: number;
  couponApplied: boolean;
  couponRejection?: CouponRejection;
}

/** Discount amount for one rule, never more than the amount it applies to. */
export const discountAmount = (amount: number, type: DiscountType, value: number): number => {
  if (amount <= 0 || value <= 0) return 0;
  const raw = type === "PERCENT" ? Math.floor((amount * Math.min(value, 100)) / 100) : value;
  return Math.min(raw, amount);
};

const inWindow = (rule: DiscountRule, now: Date): boolean =>
  rule.isActive && rule.startsAt <= now && (rule.endsAt === null || rule.endsAt > now);

export const checkCoupon = (
  coupon: CouponRule,
  subtotal: number,
  packageId: string,
  now: Date
): CouponRejection | null => {
  if (!coupon.isActive) return "inactive";
  if (coupon.startsAt > now) return "not_started";
  if (coupon.endsAt !== null && coupon.endsAt <= now) return "expired";
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) return "exhausted";
  if (subtotal < coupon.minOrderAmount) return "below_minimum";
  if (coupon.packageId !== null && coupon.packageId !== packageId) return "wrong_package";
  return null;
};

/**
 * Server-side price calculation. The client never supplies amounts.
 * Order: best single automatic discount first, then the coupon on the remaining amount.
 */
export const computeQuote = (input: {
  unitAmount: number;
  packageId: string;
  discounts: DiscountRule[];
  coupon?: CouponRule | null;
  now?: Date;
}): Quote => {
  const now = input.now ?? new Date();
  const subtotal = input.unitAmount;

  const autoDiscount = input.discounts
    .filter((d) => inWindow(d, now))
    .reduce((best, d) => Math.max(best, discountAmount(subtotal, d.type, d.value)), 0);
  let remaining = subtotal - autoDiscount;

  let couponDiscount = 0;
  let couponRejection: CouponRejection | undefined;
  if (input.coupon) {
    // minOrderAmount is compared with the price before any discount.
    couponRejection = checkCoupon(input.coupon, subtotal, input.packageId, now) ?? undefined;
    if (!couponRejection) {
      couponDiscount = discountAmount(remaining, input.coupon.type, input.coupon.value);
      remaining -= couponDiscount;
    }
  }

  return {
    subtotal,
    discountTotal: autoDiscount + couponDiscount,
    total: remaining,
    couponApplied: Boolean(input.coupon) && !couponRejection,
    couponRejection,
  };
};
