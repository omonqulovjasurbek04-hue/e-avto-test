import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { badRequest, conflict, notFound } from "../utils/errors";
import { sanitizeRichText, slugify, toPlainText } from "../lib/sanitize";
import { writeAudit } from "./audit.service";
import { env } from "../config/env";
import { ttlCache } from "../utils/ttlCache";

const resolveSlug = (slug: string | undefined, title: string): string => {
  const value = slug ?? slugify(title);
  if (!value) throw badRequest("Could not derive a slug from the title; please provide one");
  return value;
};

const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

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

// ───────────── public ─────────────

/** Drafts are indistinguishable from missing pages. */
export const getPublishedPage = async (slug: string) => {
  const page = await prisma.page.findFirst({ where: { slug, status: "PUBLISHED" }, select: { slug: true, title: true, content: true, seoTitle: true, seoDescription: true, updatedAt: true } });
  if (!page) throw notFound("Page not found");
  return page;
};

export const listPublishedNews = async (page: number, limit: number) => {
  const where = { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
  const [items, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * limit, take: limit,
      select: { slug: true, title: true, summary: true, coverUrl: true, publishedAt: true },
    }),
    prisma.newsArticle.count({ where }),
  ]);
  return { items, page, limit, total };
};

export const getPublishedNews = async (slug: string) => {
  const article = await prisma.newsArticle.findFirst({
    where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    select: { slug: true, title: true, summary: true, content: true, coverUrl: true, seoTitle: true, seoDescription: true, publishedAt: true },
  });
  if (!article) throw notFound("Article not found");
  return article;
};

export const listPublishedFaq = () =>
  prisma.faqItem.findMany({ where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, question: true, answer: true } });

export const getPublicSettings = async () => {
  const rows = await prisma.siteSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
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

export const createPage = async (actorId: string, input: { slug?: string; title: string; content: string; seoTitle?: string | null; seoDescription?: string | null; status: "DRAFT" | "PUBLISHED" }) => {
  const data = clean({ ...input, slug: resolveSlug(input.slug, input.title) });
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

export const updatePage = async (actorId: string, id: string, input: Prisma.PageUpdateInput & { title?: string; content?: string }) => {
  const before = await prisma.page.findUnique({ where: { id } });
  if (!before) throw notFound("Page not found");
  try {
    return await prisma.$transaction(async (tx) => {
      const page = await tx.page.update({ where: { id }, data: clean(input as Cleanable) as Prisma.PageUpdateInput });
      await writeAudit({ actorId, action: "page.update", entity: "Page", entityId: id, before: { slug: before.slug, status: before.status }, after: { slug: page.slug, status: page.status } }, tx);
      return page;
    });
  } catch (e) {
    if (isUnique(e)) throw conflict("Slug already exists");
    throw e;
  }
};

export const createNews = async (actorId: string, input: { slug?: string; title: string; summary?: string | null; content: string; coverUrl?: string | null; seoTitle?: string | null; seoDescription?: string | null; status: "DRAFT" | "PUBLISHED" }) => {
  const data = clean({ ...input, slug: resolveSlug(input.slug, input.title) });
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

export const updateNews = async (actorId: string, id: string, input: Prisma.NewsArticleUpdateInput & { status?: "DRAFT" | "PUBLISHED" }) => {
  const before = await prisma.newsArticle.findUnique({ where: { id } });
  if (!before) throw notFound("Article not found");
  // First publication stamps the date; unpublishing keeps it so re-publishing does not reorder the feed.
  const publishedAt = input.status === "PUBLISHED" && !before.publishedAt ? new Date() : undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      const article = await tx.newsArticle.update({ where: { id }, data: { ...(clean(input as Cleanable) as Prisma.NewsArticleUpdateInput), ...(publishedAt && { publishedAt }) } });
      await writeAudit({ actorId, action: "news.update", entity: "NewsArticle", entityId: id, before: { slug: before.slug, status: before.status }, after: { slug: article.slug, status: article.status } }, tx);
      return article;
    });
  } catch (e) {
    if (isUnique(e)) throw conflict("Slug already exists");
    throw e;
  }
};

export const createFaq = async (actorId: string, input: { question: string; answer: string; order?: number; isPublished?: boolean }) => {
  const faq = await prisma.faqItem.create({ data: clean(input) });
  await writeAudit({ actorId, action: "faq.create", entity: "FaqItem", entityId: faq.id });
  return faq;
};

export const updateFaq = async (actorId: string, id: string, input: { question?: string; answer?: string; order?: number; isPublished?: boolean }) => {
  if (!(await prisma.faqItem.findUnique({ where: { id }, select: { id: true } }))) throw notFound("FAQ item not found");
  const faq = await prisma.faqItem.update({ where: { id }, data: clean(input) });
  await writeAudit({ actorId, action: "faq.update", entity: "FaqItem", entityId: id });
  return faq;
};

export const deleteFaq = async (actorId: string, id: string) => {
  const res = await prisma.faqItem.deleteMany({ where: { id } });
  if (res.count === 0) throw notFound("FAQ item not found");
  await writeAudit({ actorId, action: "faq.delete", entity: "FaqItem", entityId: id });
  return { deleted: true };
};

export const saveSettings = async (actorId: string, values: Record<string, unknown>) => {
  const entries = Object.entries(values).filter(([, v]) => v !== undefined);
  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      const v = typeof value === "string" && !key.endsWith("Url") ? toPlainText(value) : (value as Prisma.InputJsonValue);
      await tx.siteSetting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
    }
    await writeAudit({ actorId, action: "settings.update", entity: "SiteSetting", after: { keys: entries.map(([k]) => k) } }, tx);
  });
  return getPublicSettings();
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
