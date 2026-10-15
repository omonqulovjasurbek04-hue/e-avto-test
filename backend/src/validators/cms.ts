import { z } from "zod";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits and dashes").max(80);
const status = z.enum(["DRAFT", "PUBLISHED"]);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
/** Only http(s) or a site-relative path; blocks javascript:/data: in logo, cover and similar fields. */
const safeUrl = z.string().trim().max(500).refine((v) => /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v), "Must be an http(s) URL or a /path");

export const pageSchema = z.object({
  slug: slug.optional(),
  title: z.string().trim().min(2).max(160),
  content: z.string().max(100_000),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  status: status.default("DRAFT"),
});
export const pageUpdateSchema = pageSchema.partial();

export const newsSchema = z.object({
  slug: slug.optional(),
  title: z.string().trim().min(2).max(160),
  summary: optionalText(400),
  content: z.string().max(100_000),
  coverUrl: safeUrl.nullable().optional(),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  status: status.default("DRAFT"),
});
export const newsUpdateSchema = newsSchema.partial();

export const faqSchema = z.object({
  question: z.string().trim().min(3).max(300),
  answer: z.string().max(10_000),
  order: z.number().int().min(1).max(1000).optional(),
  isPublished: z.boolean().optional(),
});
export const faqUpdateSchema = faqSchema.partial();

/** Whitelist of editable, public site settings. Unknown keys are rejected (strict). */
export const siteSettingsSchema = z
  .object({
    siteName: z.string().trim().min(1).max(80),
    tagline: z.string().trim().max(160),
    logoUrl: safeUrl,
    faviconUrl: safeUrl,
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB"),
    phone: z.string().trim().max(40),
    email: z.string().email().max(120),
    address: z.string().trim().max(240),
    workingHours: z.string().trim().max(120),
    heroTitle: z.string().trim().max(160),
    heroSubtitle: z.string().trim().max(300),
    social: z.object({ telegram: safeUrl.optional(), instagram: safeUrl.optional(), youtube: safeUrl.optional(), facebook: safeUrl.optional() }).strict(),
  })
  .partial()
  .strict();

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(5).max(120),
  message: z.string().trim().min(10).max(2000),
  // Honeypot: real users never see or fill this field.
  website: z.string().max(200).optional(),
});

export const contactStatusSchema = z.object({ status: z.enum(["NEW", "READ", "ARCHIVED"]) });
