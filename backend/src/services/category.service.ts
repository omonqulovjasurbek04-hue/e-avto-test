import { prisma } from "../config/database";
import { badRequest, conflict, notFound } from "../utils/errors";
import { slugify, toPlainText } from "../lib/sanitize";
import type { Language } from "../lib/languages";
import { writeAudit } from "./audit.service";
import { isUnique, localize, mergeTranslations } from "./cms.service";
import type { CategoryInput, CategoryUpdateInput } from "../validators/category";

const publicSelect = { id: true, slug: true, name: true, description: true, order: true, translations: true } as const;

/** Active categories with the number of published courses in each, in the visitor's language. */
export const listPublic = async (lang: Language) => {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { ...publicSelect, _count: { select: { courses: { where: { isPublished: true } } } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...localize(c, lang), courseCount: _count.courses }));
};

export const listAdmin = async () => {
  const rows = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { courses: true } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, courseCount: _count.courses }));
};

const cleanFields = <T extends { name?: string; description?: string | null }>(d: T): T => ({
  ...d,
  ...(d.name !== undefined && { name: toPlainText(d.name) }),
  ...(d.description != null && { description: toPlainText(d.description) || null }),
});

export const create = async (actorId: string, input: CategoryInput) => {
  const { translations, ...rest } = cleanFields(input);
  const slug = rest.slug ?? slugify(rest.name);
  if (!slug) throw badRequest("Could not derive a slug from the name; please provide one");
  try {
    const row = await prisma.category.create({ data: { ...rest, slug, translations: mergeTranslations({}, translations) } });
    await writeAudit({ actorId, action: "category.create", entity: "Category", entityId: row.id, after: { slug: row.slug, name: row.name } });
    return row;
  } catch (e) {
    if (isUnique(e)) throw conflict("A category with this slug already exists");
    throw e;
  }
};

export const update = async (actorId: string, id: string, input: CategoryUpdateInput) => {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound("Category not found");
  const { translations, ...rest } = cleanFields(input);
  try {
    const row = await prisma.category.update({
      where: { id },
      data: { ...rest, ...(translations !== undefined && { translations: mergeTranslations(existing.translations, translations) }) },
    });
    await writeAudit({ actorId, action: "category.update", entity: "Category", entityId: id, before: { slug: existing.slug, name: existing.name, isActive: existing.isActive }, after: { slug: row.slug, name: row.name, isActive: row.isActive } });
    return row;
  } catch (e) {
    if (isUnique(e)) throw conflict("A category with this slug already exists");
    throw e;
  }
};

/** Courses of a deleted category stay, just uncategorised (FK is ON DELETE SET NULL). */
export const remove = async (actorId: string, id: string) => {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound("Category not found");
  await prisma.category.delete({ where: { id } });
  await writeAudit({ actorId, action: "category.delete", entity: "Category", entityId: id, before: { slug: existing.slug, name: existing.name } });
  return { deleted: true };
};

export const resolveSlug = async (slug: string) => {
  const c = await prisma.category.findFirst({ where: { slug, isActive: true }, select: { id: true } });
  return c?.id ?? null;
};
