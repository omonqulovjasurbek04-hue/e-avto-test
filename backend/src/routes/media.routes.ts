import { Router, Request, Response } from "express";
import { pipeline } from "stream/promises";
import { z } from "zod";
import * as media from "../services/media.service";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { testRateLimiter } from "../middleware/rateLimit.middleware";
import { success } from "../utils/apiResponse";
import { MediaKind } from "../lib/media/signing";
import { env } from "../config/env";

const uuid = z.string().uuid();
const h = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => asyncHandler(fn as never);
const viewer = (req: AuthRequest) => ({ userId: requireUserId(req), role: req.user!.role });
const kindOf = (v: string): MediaKind => z.enum(["video", "file"]).transform((x) => (x === "video" ? "VIDEO" : "FILE") as MediaKind).parse(v);

// ───────────── student side ─────────────
export const mediaRoutes = Router();

/** Step 1: authenticated request returns a short-lived URL (or 404 if not allowed). */
mediaRoutes.post("/media/:kind/:id/access", asyncHandler(authMiddleware), testRateLimiter, h(async (req, res) => {
  success(res, await media.issueAccess(viewer(req), kindOf(req.params.kind), uuid.parse(req.params.id)));
}));

/** Step 2: the media element fetches the URL; the signed token is the credential. */
mediaRoutes.get("/media/stream/:token", asyncHandler(async (req: Request, res: Response) => {
  const plan = await media.openStream(req.params.token, req.headers.range);
  res.status(plan.status).set(plan.headers);
  await pipeline(plan.stream, res).catch(() => undefined); // client aborted (seeking) is normal
}));

/** Public CMS images: GET /api/images/<id>.<ext> */
mediaRoutes.get("/images/:name", asyncHandler(async (req: Request, res: Response) => {
  const plan = await media.openPublicImage(req.params.name);
  res.status(plan.status).set(plan.headers);
  await pipeline(plan.stream, res).catch(() => undefined);
}));

// ───────────── admin side (media:manage) ─────────────
export const adminMediaRoutes = Router();
adminMediaRoutes.use(asyncHandler(authMiddleware));
adminMediaRoutes.use(requirePermission("media:manage"));

/** Lets the admin page explain why uploading is unavailable instead of failing on the first try. */
adminMediaRoutes.get("/config", h(async (_req, res) => success(res, { uploadEnabled: env.MEDIA_UPLOAD_ENABLED, maxVideoMb: env.MAX_VIDEO_MB, maxFileMb: env.MAX_FILE_MB })));

adminMediaRoutes.get("/", h(async (_req, res) => success(res, await media.listAssets())));

/**
 * Raw binary upload (no multipart parser): send the file as the request body.
 * e.g. PUT /api/admin/media/video?lessonId=<uuid>&title=Dars+1   Content-Type: application/octet-stream
 */
adminMediaRoutes.put("/:kind", h(async (req, res) => {
  const q = z.object({ lessonId: uuid.optional(), courseId: uuid.optional(), title: z.string().max(160).optional(), filename: z.string().max(160).optional() }).parse(req.query);
  const length = Number(req.headers["content-length"]);
  const asset = await media.uploadAsset(viewer(req), kindOf(req.params.kind), req, { contentLength: Number.isFinite(length) && length > 0 ? length : undefined, ...q });
  success(res, asset, 201);
}));
/** CMS image library (content editors). Mounted under /api/admin/cms/images. */
export const adminImageRoutes = Router();
adminImageRoutes.use(asyncHandler(authMiddleware));
adminImageRoutes.use(requirePermission("content:manage"));
adminImageRoutes.get("/", h(async (_req, res) => success(res, await media.listImages())));
adminImageRoutes.get("/config", h(async (_req, res) => success(res, { maxImageMb: env.MAX_IMAGE_MB })));
adminImageRoutes.put("/", h(async (req, res) => {
  const q = z.object({ filename: z.string().max(160).optional() }).parse(req.query);
  const length = Number(req.headers["content-length"]);
  success(res, await media.uploadImage(viewer(req), req, { contentLength: Number.isFinite(length) && length > 0 ? length : undefined, ...q }), 201);
}));
adminImageRoutes.delete("/:id", h(async (req, res) => success(res, await media.deleteImage(viewer(req), uuid.parse(req.params.id)))));

adminMediaRoutes.delete("/video/:id", h(async (req, res) => success(res, await media.archiveVideo(viewer(req), uuid.parse(req.params.id)))));
