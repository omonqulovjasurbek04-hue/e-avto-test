import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { badRequest, conflict, notFound } from "../utils/errors";
import { sanitizeRichText, slugify, toPlainText } from "../lib/sanitize";
import { writeAudit } from "./audit.service";
import { env } from "../config/env";
import { ttlCache } from "../utils/ttlCache";
import { BASE_LANGUAGE, EXTRA_LANGUAGES, type ExtraLanguage, type Language } from "../lib/languages";

const resolveSlug = (slug: string | undefined, title: string): string => {
  const value = slug ?? slugify(title);
  if (!value) throw badRequest("Could not derive a slug from the title; please provide one");
  return value;
};

export const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

type Cleanable = { title?: string; content?: string; summary?: string | null; seoTitle?: string | null; seoDescription?: string | null; question?: string; answer?: string };

/** Every stored text field is cleaned on write, so readers never need to trust the database. */
const clean = <T extends Cleanable>(d: T): T => ({
  ...d,
  ...(d.title !== undefined && { title: toPlainText(d.title) }),
  ...(d.content !== undefined && { content: sanitizeRichText(d.content) }),
  ...(d.summary != null && { summary: toPlainText(d.summary) }),
  ...(d.seoTitle != null && { seoTitle: toPlainText(d.seoTitle) }),
  ...(d.seoDescription != null && { seoDescription: toPlainText(d.seoDescription) }),
  ...(d.question !== undefined && { question: toPlainText(d.question) }),
  ...(d.answer !== undefined && { answer: sanitizeRichText(d.answer) }),
});

// ───────────── translations ─────────────

type TrFields = Record<string, string | undefined>;
type TrPatch = Partial<Record<ExtraLanguage, TrFields | null | undefined>>;
type TrStored = Partial<Record<ExtraLanguage, Record<string, string>>>;

const RICH_FIELDS = new Set(["content", "answer"]);

/** Same cleaning as the uz columns; empty fields are dropped so they fall back to uz. */
const cleanTranslation = (fields: TrFields): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v !== "string") continue;
    const value = RICH_FIELDS.has(k) ? sanitizeRichText(v).trim() : toPlainText(v);
    if (value) out[k] = value;
  }
  return out;
};

/** Applies a patch per language: given → replaced, null → removed, omitted → kept. */
export const mergeTranslations = (stored: unknown, patch: TrPatch | undefined): TrStored => {
  const result: TrStored = { ...((stored && typeof stored === "object" ? stored : {}) as TrStored) };
  if (!patch) return result;
  for (const lang of EXTRA_LANGUAGES) {
    const value = patch[lang];
    if (value === undefined) continue;
    const cleaned = value === null ? {} : cleanTranslation(value);
    if (Object.keys(cleaned).length === 0) delete result[lang];
    else result[lang] = cleaned;
  }
  return result;
};

/** The visitor's version of a row: each translated field replaces the uz one; missing fields stay uz. */
export const localize = <T extends { translations?: unknown }>(row: T, lang: Language): Omit<T, "translations"> => {
  const { translations, ...base } = row;
  if (lang === BASE_LANGUAGE) return base;
  const tr = ((translations as TrStored | null) ?? {})[lang] ?? {};
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(tr)) if (k in base && v) out[k] = v;
  return out as Omit<T, "translations">;
};

// ───────────── public ─────────────

/** Drafts are indistinguishable from missing pages. Draft/published is shared by all language versions. */
export const getPublishedPage = async (slug: string, lang: Language = BASE_LANGUAGE) => {
  const page = await prisma.page.findFirst({ where: { slug, status: "PUBLISHED" }, select: { slug: true, title: true, content: true, seoTitle: true, seoDescription: true, translations: true, updatedAt: true } });
  if (!page) throw notFound("Page not found");
  return localize(page, lang);
};

export const listPublishedNews = async (page: number, limit: number, lang: Language = BASE_LANGUAGE) => {
  const where = { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
  const [items, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * limit, take: limit,
      select: { slug: true, title: true, summary: true, coverUrl: true, publishedAt: true, translations: true },
    }),
    prisma.newsArticle.count({ where }),
  ]);
  return { items: items.map((n) => localize(n, lang)), page, limit, total };
};

export const getPublishedNews = async (slug: string, lang: Language = BASE_LANGUAGE) => {
  const article = await prisma.newsArticle.findFirst({
    where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    select: { slug: true, title: true, summary: true, content: true, coverUrl: true, seoTitle: true, seoDescription: true, publishedAt: true, translations: true },
  });
  if (!article) throw notFound("Article not found");
  return localize(article, lang);
};

export const listPublishedFaq = async (lang: Language = BASE_LANGUAGE) =>
  (await prisma.faqItem.findMany({ where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, question: true, answer: true, translations: true } })).map((f) => localize(f, lang));

/** Other-language setting texts are stored under this key as { uz_cyrl: {...}, ru: {...} }. */
const SETTINGS_I18N_KEY = "i18n";

/** Settings for the editor: uz values plus `translations`. */
export const getAdminSettings = async () => {
  const rows = await prisma.siteSetting.findMany();
  const all = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  const { [SETTINGS_I18N_KEY]: translations, ...values } = all;
  return { ...values, translations: (translations as TrStored | undefined) ?? {} };
};

export const getPublicSettings = async (lang: Language = BASE_LANGUAGE) => {
  const { translations, ...values } = await getAdminSettings();
  return { ...values, ...(lang === BASE_LANGUAGE ? {} : translations[lang]) };
};

export const submitContact = async (input: { name: string; contact: string; message: string; website?: string }) => {
  // Bots fill the hidden field; answer "ok" without storing so they learn nothing.
  if (input.website) return { received: true };
  await prisma.contactMessage.create({
    data: { name: toPlainText(input.name), contact: toPlainText(input.contact), message: toPlainText(input.message) },
  });
  return { received: true };
};

export const sitemapEntries = async () => {
  const [pages, news, courses] = await Promise.all([
    prisma.page.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.newsArticle.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
    prisma.course.findMany({ where: { isPublished: true, archivedAt: null }, select: { id: true, updatedAt: true } }),
  ]);
  return [
    { path: "/", lastmod: undefined as Date | undefined },
    { path: "/courses", lastmod: undefined },
    { path: "/faq", lastmod: undefined },
    { path: "/news", lastmod: undefined },
    ...pages.map((p) => ({ path: `/p/${p.slug}`, lastmod: p.updatedAt })),
    ...news.map((n) => ({ path: `/news/${n.slug}`, lastmod: n.updatedAt })),
    ...courses.map((c) => ({ path: `/courses/${c.id}`, lastmod: c.updatedAt })),
  ];
};

// ───────────── admin ─────────────

export const adminList = {
  pages: () => prisma.page.findMany({ orderBy: { updatedAt: "desc" } }),
  news: () => prisma.newsArticle.findMany({ orderBy: { createdAt: "desc" } }),
  faq: () => prisma.faqItem.findMany({ orderBy: { order: "asc" } }),
  messages: (status?: string) => prisma.contactMessage.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200 }),
};

type WithTr = { translations?: TrPatch };

export const createPage = async (actorId: string, { translations, ...input }: { slug?: string; title: string; content: string; seoTitle?: string | null; seoDescription?: string | null; status: "DRAFT" | "PUBLISHED" } & WithTr) => {
  const data = { ...clean({ ...input, slug: resolveSlug(input.slug, input.title) }), translations: mergeTranslations({}, translations) };
  try {
    return await prisma.$transaction(async (tx) => {
      const page = await tx.page.create({ data: data as Prisma.PageUncheckedCreateInput });
      await writeAudit({ actorId, action: "page.create", entity: "Page", entityId: page.id, after: { slug: page.slug, status: page.status } }, tx);
      return page;
    });
  } catch (e) {
    if (isUnique(e)) throw conflict("Slug already exists");
    throw e;
  }
};

export const updatePage = async (actorId: string, id: string, { translations, ...input }: Omit<Prisma.PageUpdateInput, "translations"> & { title?: string; content?: string } & WithTr) => {
  const before = await prisma.page.findUnique({ where: { id } });
  if (!before) throw notFound("Page not found");
  try {
    return await prisma.$transaction(async (tx) => {
      const data = { ...(clean(input as Cleanable) as Prisma.PageUpdateInput), ...(translations && { translations: mergeTranslations(before.translations, translations) }) };
      const page = await tx.page.update({ where: { id }, data });
      await writeAudit({ actorId, action: "page.update", entity: "Page", entityId: id, before: { slug: before.slug, status: before.status }, after: { slug: page.slug, status: page.status } }, tx);
      return page;
    });
  } catch (e) {
    if (isUnique(e)) throw conflict("Slug already exists");
    throw e;
  }
};

export const createNews = async (actorId: string, { translations, ...input }: { slug?: string; title: string; summary?: string | null; content: string; coverUrl?: string | null; seoTitle?: string | null; seoDescription?: string | null; status: "DRAFT" | "PUBLISHED" } & WithTr) => {
  const data = { ...clean({ ...input, slug: resolveSlug(input.slug, input.title) }), translations: mergeTranslations({}, translations) };
  try {
    return await prisma.$transaction(async (tx) => {
      const article = await tx.newsArticle.create({ data: { ...(data as Prisma.NewsArticleUncheckedCreateInput), publishedAt: input.status === "PUBLISHED" ? new Date() : null } });
      await writeAudit({ actorId, action: "news.create", entity: "NewsArticle", entityId: article.id, after: { slug: article.slug, status: article.status } }, tx);
      return article;
    });
  } catch (e) {
    if (isUnique(e)) throw conflict("Slug already exists");
    throw e;
  }
};

export const updateNews = async (actorId: string, id: string, { translations, ...input }: Omit<Prisma.NewsArticleUpdateInput, "translations"> & { status?: "DRAFT" | "PUBLISHED" } & WithTr) => {
  const before = await prisma.newsArticle.findUnique({ where: { id } });
  if (!before) throw notFound("Article not found");
  // First publication stamps the date; unpublishing keeps it so re-publishing does not reorder the feed.
  const publishedAt = input.status === "PUBLISHED" && !before.publishedAt ? new Date() : undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      const article = await tx.newsArticle.update({ where: { id }, data: { ...(clean(input as Cleanable) as Prisma.NewsArticleUpdateInput), ...(publishedAt && { publishedAt }), ...(translations && { translations: mergeTranslations(before.translations, translations) }) } });
      await writeAudit({ actorId, action: "news.update", entity: "NewsArticle", entityId: id, before: { slug: before.slug, status: before.status }, after: { slug: article.slug, status: article.status } }, tx);
      return article;
    });
  } catch (e) {
    if (isUnique(e)) throw conflict("Slug already exists");
    throw e;
  }
};

export const createFaq = async (actorId: string, { translations, ...input }: { question: string; answer: string; order?: number; isPublished?: boolean } & WithTr) => {
  const faq = await prisma.faqItem.create({ data: { ...clean(input), translations: mergeTranslations({}, translations) } });
  await writeAudit({ actorId, action: "faq.create", entity: "FaqItem", entityId: faq.id });
  return faq;
};

export const updateFaq = async (actorId: string, id: string, { translations, ...input }: { question?: string; answer?: string; order?: number; isPublished?: boolean } & WithTr) => {
  const before = await prisma.faqItem.findUnique({ where: { id }, select: { translations: true } });
  if (!before) throw notFound("FAQ item not found");
  const faq = await prisma.faqItem.update({ where: { id }, data: { ...clean(input), ...(translations && { translations: mergeTranslations(before.translations, translations) }) } });
  await writeAudit({ actorId, action: "faq.update", entity: "FaqItem", entityId: id });
  return faq;
};

export const deleteFaq = async (actorId: string, id: string) => {
  const res = await prisma.faqItem.deleteMany({ where: { id } });
  if (res.count === 0) throw notFound("FAQ item not found");
  await writeAudit({ actorId, action: "faq.delete", entity: "FaqItem", entityId: id });
  return { deleted: true };
};

export const saveSettings = async (actorId: string, { translations, ...values }: Record<string, unknown> & WithTr) => {
  const entries = Object.entries(values).filter(([, v]) => v !== undefined);
  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      const v = typeof value === "string" && !key.endsWith("Url") ? toPlainText(value) : (value as Prisma.InputJsonValue);
      await tx.siteSetting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
    }
    if (translations) {
      const stored = await tx.siteSetting.findUnique({ where: { key: SETTINGS_I18N_KEY } });
      const value = mergeTranslations(stored?.value, translations) as Prisma.InputJsonValue;
      await tx.siteSetting.upsert({ where: { key: SETTINGS_I18N_KEY }, create: { key: SETTINGS_I18N_KEY, value }, update: { value } });
    }
    const keys = [...entries.map(([k]) => k), ...Object.keys(translations ?? {}).map((l) => `${SETTINGS_I18N_KEY}.${l}`)];
    await writeAudit({ actorId, action: "settings.update", entity: "SiteSetting", after: { keys } }, tx);
  });
  return getAdminSettings();
};

export const setMessageStatus = async (actorId: string, id: string, status: string) => {
  const res = await prisma.contactMessage.updateMany({ where: { id }, data: { status } });
  if (res.count === 0) throw notFound("Message not found");
  await writeAudit({ actorId, action: "contact.status", entity: "ContactMessage", entityId: id, after: { status } });
  return { id, status };
};

/** Real aggregate numbers for the landing page (no personal data), cached briefly: it is public and cheap to abuse. */
const computeStats = async () => {
  const [users, questions, finished, passed] = await Promise.all([
    prisma.user.count({ where: { role: "USER", isActive: true } }),
    prisma.question.count({ where: { isPublished: true } }),
    prisma.test.count({ where: { finishedAt: { not: null } } }),
    prisma.test.count({ where: { finishedAt: { not: null }, passed: true } }),
  ]);
  return { users, questions, testsTaken: finished, passRate: finished > 0 ? Math.round((passed / finished) * 100) : null };
};
export const getPublicStats = ttlCache(computeStats, () => env.LEADERBOARD_CACHE_SECONDS * 1000);
export const resetStatsCache = () => getPublicStats.clear();
