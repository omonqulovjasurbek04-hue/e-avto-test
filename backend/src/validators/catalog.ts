import { z } from "zod";

const id = z.string().uuid();
const money = z.number().int().min(0).max(2_000_000_000);
const optionalDate = z.coerce.date().nullable().optional();

export const packageSchema = z.object({
  courseId: id,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  durationDays: z.number().int().min(1).max(3650).nullable().optional(),
  order: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});
export const packageUpdateSchema = packageSchema.omit({ courseId: true }).partial();

export const priceSchema = z.object({
  amount: money,
  currency: z.string().length(3).toUpperCase().default("UZS"),
  validFrom: z.coerce.date().optional(),
  validTo: optionalDate,
  isSample: z.boolean().optional(),
});

const discountBase = z.object({
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().min(1).max(2_000_000_000),
  packageId: id.nullable().optional(),
  startsAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});
const percentCap = (d: { type: string; value: number }) => d.type !== "PERCENT" || d.value <= 100;

export const discountSchema = discountBase
  .extend({ name: z.string().trim().min(2).max(120), endsAt: optionalDate })
  .refine(percentCap, { message: "Percent discount cannot exceed 100", path: ["value"] });

export const couponSchema = discountBase
  .extend({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "3-32 chars: A-Z, 0-9, _ or -"),
    maxRedemptions: z.number().int().min(1).nullable().optional(),
    minOrderAmount: money.optional(),
    expiresAt: optionalDate,
  })
  .refine(percentCap, { message: "Percent discount cannot exceed 100", path: ["value"] });

export const quoteSchema = z.object({
  packageId: id,
  couponCode: z.string().trim().toUpperCase().max(32).optional(),
});
