import { Router, Request, Response } from "express";
import { z } from "zod";
import * as cms from "../services/cms.service";
import * as notifications from "../services/notification.service";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { contactRateLimiter } from "../middleware/rateLimit.middleware";
import { success, paginated } from "../utils/apiResponse";
import { env } from "../config/env";
import {
  contactSchema, contactStatusSchema, faqSchema, faqUpdateSchema, newsSchema, newsUpdateSchema,
  pageSchema, pageUpdateSchema, siteSettingsSchema,
} from "../validators/cms";

const uuid = z.string().uuid();
const slugParam = z.string().regex(/^[a-z0-9-]{1,80}$/);
const h = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => asyncHandler(fn as never);
const actor = (req: AuthRequest) => requireUserId(req);

// ───────────── public (read-only; drafts never appear) ─────────────
export const publicCmsRoutes = Router();

publicCmsRoutes.get("/pages/:slug", h(async (req, res) => success(res, await cms.getPublishedPage(slugParam.parse(req.params.slug)))));
publicCmsRoutes.get("/news", h(async (req, res) => {
  const { page, limit } = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10) }).parse(req.query);
  const data = await cms.listPublishedNews(page, limit);
  paginated(res, data.items, { page, limit, total: data.total });
}));
publicCmsRoutes.get("/news/:slug", h(async (req, res) => success(res, await cms.getPublishedNews(slugParam.parse(req.params.slug)))));
publicCmsRoutes.get("/faq", h(async (_req, res) => success(res, await cms.listPublishedFaq())));
publicCmsRoutes.get("/public-stats", h(async (_req, res) => success(res, await cms.getPublicStats())));
publicCmsRoutes.get("/site-settings", h(async (_req, res) => success(res, await cms.getPublicSettings())));
publicCmsRoutes.post("/contact", contactRateLimiter, h(async (req, res) => success(res, await cms.submitContact(contactSchema.parse(req.body)), 201)));

// ───────────── crawler files (served by the API host; point the site's proxy at them) ─────────────
const siteOrigin = () => env.CLIENT_URL.split(",")[0].trim().replace(/\/$/, "");
const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const crawlerRoutes = Router();
crawlerRoutes.get("/robots.txt", (_req: Request, res: Response) => {
  res.type("text/plain").send(["User-agent: *", "Disallow: /admin", "Disallow: /student", "Disallow: /teacher", "Disallow: /api/", `Sitemap: ${siteOrigin()}/sitemap.xml`, ""].join("\n"));
});
crawlerRoutes.get("/sitemap.xml", asyncHandler(async (_req: Request, res: Response) => {
  const entries = await cms.sitemapEntries();
  const body = entries
    .map((e) => `<url><loc>${xmlEscape(siteOrigin() + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.toISOString()}</lastmod>` : ""}</url>`)
    .join("");
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
}));

// ───────────── admin / moderator (content:manage) ─────────────
export const adminCmsRoutes = Router();
adminCmsRoutes.use(asyncHandler(authMiddleware));
adminCmsRoutes.use(requirePermission("content:manage"));

adminCmsRoutes.get("/pages", h(async (_req, res) => success(res, await cms.adminList.pages())));
adminCmsRoutes.post("/pages", h(async (req, res) => success(res, await cms.createPage(actor(req), pageSchema.parse(req.body)), 201)));
adminCmsRoutes.put("/pages/:id", h(async (req, res) => success(res, await cms.updatePage(actor(req), uuid.parse(req.params.id), pageUpdateSchema.parse(req.body)))));

adminCmsRoutes.get("/news", h(async (_req, res) => success(res, await cms.adminList.news())));
adminCmsRoutes.post("/news", h(async (req, res) => success(res, await cms.createNews(actor(req), newsSchema.parse(req.body)), 201)));
adminCmsRoutes.put("/news/:id", h(async (req, res) => success(res, await cms.updateNews(actor(req), uuid.parse(req.params.id), newsUpdateSchema.parse(req.body)))));

adminCmsRoutes.get("/faq", h(async (_req, res) => success(res, await cms.adminList.faq())));
adminCmsRoutes.post("/faq", h(async (req, res) => success(res, await cms.createFaq(actor(req), faqSchema.parse(req.body)), 201)));
adminCmsRoutes.put("/faq/:id", h(async (req, res) => success(res, await cms.updateFaq(actor(req), uuid.parse(req.params.id), faqUpdateSchema.parse(req.body)))));
adminCmsRoutes.delete("/faq/:id", h(async (req, res) => success(res, await cms.deleteFaq(actor(req), uuid.parse(req.params.id)))));

adminCmsRoutes.put("/site-settings", requirePermission("settings:manage"), h(async (req, res) => success(res, await cms.saveSettings(actor(req), siteSettingsSchema.parse(req.body)))));

const announceSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(1000),
  audience: z.discriminatedUnion("type", [
    z.object({ type: z.literal("all") }),
    z.object({ type: z.literal("group"), groupId: uuid }),
    z.object({ type: z.literal("course"), courseId: uuid }),
  ]),
});
adminCmsRoutes.post("/announcements", h(async (req, res) => success(res, await notifications.announce(actor(req), announceSchema.parse(req.body)), 201)));

adminCmsRoutes.get("/messages", h(async (req, res) => success(res, await cms.adminList.messages(z.enum(["NEW", "READ", "ARCHIVED"]).optional().parse(req.query.status)))));
adminCmsRoutes.patch("/messages/:id", h(async (req, res) => success(res, await cms.setMessageStatus(actor(req), uuid.parse(req.params.id), contactStatusSchema.parse(req.body).status))));
