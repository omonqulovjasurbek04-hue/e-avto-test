import { z } from "zod";
import { slug, translations, trText } from "./cms";

const categoryTranslation = { name: trText(120), description: trText(1000) };

export const categorySchema = z.object({
  slug: slug.optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  order: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
  translations: translations(categoryTranslation).optional(),
});

export const categoryUpdateSchema = categorySchema.partial();

export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
