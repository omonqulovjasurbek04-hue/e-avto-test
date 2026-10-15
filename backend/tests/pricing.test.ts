import { describe, expect, it } from "vitest";
import { computeQuote, discountAmount, CouponRule, DiscountRule } from "../src/lib/pricing";

const now = new Date("2026-06-01T12:00:00Z");
const past = new Date("2026-01-01T00:00:00Z");
const future = new Date("2027-01-01T00:00:00Z");

const discount = (o: Partial<DiscountRule> = {}): DiscountRule => ({
  type: "PERCENT", value: 10, startsAt: past, endsAt: null, isActive: true, ...o,
});
const coupon = (o: Partial<CouponRule> = {}): CouponRule => ({
  ...discount({ value: 20 }), minOrderAmount: 0, maxRedemptions: null, redeemedCount: 0, packageId: null, ...o,
});
const base = { unitAmount: 100_000, packageId: "p1", now };

describe("discountAmount", () => {
  it("rounds percent down to whole minor units and caps at the amount", () => {
    expect(discountAmount(999, "PERCENT", 10)).toBe(99);
    expect(discountAmount(1000, "FIXED", 5000)).toBe(1000);
    expect(discountAmount(1000, "PERCENT", 150)).toBe(1000);
    expect(discountAmount(1000, "FIXED", -5)).toBe(0);
  });
});

describe("computeQuote", () => {
  it("returns the plain price without discounts", () => {
    expect(computeQuote({ ...base, discounts: [] })).toMatchObject({ subtotal: 100_000, discountTotal: 0, total: 100_000 });
  });

  it("uses only the best automatic discount, not a sum", () => {
    const q = computeQuote({ ...base, discounts: [discount({ value: 10 }), discount({ type: "FIXED", value: 15_000 })] });
    expect(q.discountTotal).toBe(15_000);
    expect(q.total).toBe(85_000);
  });

  it("ignores inactive, future and expired discounts", () => {
    const q = computeQuote({
      ...base,
      discounts: [discount({ isActive: false }), discount({ startsAt: future }), discount({ endsAt: past })],
    });
    expect(q.total).toBe(100_000);
  });

  it("applies the coupon after the automatic discount", () => {
    const q = computeQuote({ ...base, discounts: [discount({ value: 10 })], coupon: coupon({ value: 20 }) });
    expect(q.total).toBe(72_000); // 100000 -10% = 90000, -20% = 72000
    expect(q.couponApplied).toBe(true);
  });

  it.each([
    ["expired", coupon({ endsAt: past }), "expired"],
    ["not started", coupon({ startsAt: future }), "not_started"],
    ["inactive", coupon({ isActive: false }), "inactive"],
    ["exhausted", coupon({ maxRedemptions: 5, redeemedCount: 5 }), "exhausted"],
    ["below minimum", coupon({ minOrderAmount: 200_000 }), "below_minimum"],
    ["other package", coupon({ packageId: "p2" }), "wrong_package"],
  ])("rejects a %s coupon and charges full price", (_n, c, reason) => {
    const q = computeQuote({ ...base, discounts: [], coupon: c });
    expect(q.couponApplied).toBe(false);
    expect(q.couponRejection).toBe(reason);
    expect(q.total).toBe(100_000);
  });

  it("never produces a negative total", () => {
    const q = computeQuote({ ...base, discounts: [discount({ type: "FIXED", value: 90_000 })], coupon: coupon({ type: "FIXED", value: 90_000 }) });
    expect(q.total).toBe(0);
  });
});
