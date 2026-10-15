import crypto from "crypto";
import path from "path";
import { Readable } from "stream";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { signMediaToken, verifyMediaToken, MediaKind } from "../lib/media/signing";
import { detectType } from "../lib/media/sniff";
import * as storage from "../lib/media/storage";
import { hasPermission } from "../lib/permissions";
import { badRequest, forbidden, HttpError, notFound, unauthorized } from "../utils/errors";
import { canAccessCourse } from "./access.service";
import { writeAudit } from "./audit.service";

interface Viewer {
  userId: string;
  role: string;
}

const secret = () => env.MEDIA_SIGNING_SECRET || crypto.createHmac("sha256", env.JWT_SECRET).update("media-signing-v1").digest("hex");

const safeFilename = (name: string) => path.basename(name).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";

// ───────────── upload (admin, media:manage) ─────────────

/**
 * Streams the request body to private storage. Declared type and extension are ignored: the real
 * type comes from the file's first bytes and must match the requested kind. No malware scanner is
 * integrated — see docs/SECURITY.md.
 */
export const uploadAsset = async (
  actor: Viewer,
  kind: MediaKind,
  body: Readable,
  meta: { contentLength: number | undefined; filename?: string; title?: string; lessonId?: string; courseId?: string }
) => {
  if (!env.MEDIA_UPLOAD_ENABLED) throw forbidden("Media uploads are disabled on this server (MEDIA_UPLOAD_ENABLED=false)");
  const maxBytes = (kind === "VIDEO" ? env.MAX_VIDEO_MB : env.MAX_FILE_MB) * 1024 * 1024;
  if (!meta.contentLength) throw new HttpError(411, "Content-Length is required");
  if (meta.contentLength > maxBytes) throw new HttpError(413, "File is too large");

  if (kind === "VIDEO" && meta.lessonId && !(await prisma.lesson.findUnique({ where: { id: meta.lessonId }, select: { id: true } }))) throw notFound("Lesson not found");
  if (kind === "FILE" && meta.courseId && !(await prisma.course.findUnique({ where: { id: meta.courseId }, select: { id: true } }))) throw notFound("Course not found");

  let tmp;
  try {
    tmp = await storage.writeTemp(body, maxBytes);
  } catch (err) {
    if (err instanceof storage.UploadTooLargeError) throw new HttpError(413, "File is too large");
    throw badRequest("Upload failed");
  }

  const detected = detectType(await storage.readHead(tmp.tmpPath));
  const allowed = kind === "VIDEO" ? detected?.kind === "video" : detected?.kind === "document" || detected?.kind === "image";
  if (!detected || !allowed) {
    await storage.discard(tmp.tmpPath);
    throw new HttpError(415, kind === "VIDEO" ? "Only MP4 or WebM video is accepted" : "Only PDF, PNG or JPEG files are accepted");
  }

  const storageKey = await storage.commit(tmp.tmpPath, detected.ext);
  try {
    const asset =
      kind === "VIDEO"
        ? await prisma.videoAsset.create({
            data: { storageKey, lessonId: meta.lessonId ?? null, title: meta.title ?? null, mimeType: detected.mime, sizeBytes: tmp.size, createdById: actor.userId },
          })
        : await prisma.fileAsset.create({
            data: { storageKey, filename: safeFilename(meta.filename ?? `file.${detected.ext}`), mimeType: detected.mime, sizeBytes: tmp.size, courseId: meta.courseId ?? null, createdById: actor.userId },
          });
    await writeAudit({ actorId: actor.userId, action: "media.upload", entity: kind === "VIDEO" ? "VideoAsset" : "FileAsset", entityId: asset.id, after: { mime: detected.mime, size: tmp.size } });
    const { storageKey: _hidden, ...publicView } = asset;
    return publicView;
  } catch (err) {
    await storage.removeObject(storageKey);
    throw err;
  }
};

export const archiveVideo = async (actor: Viewer, id: string) => {
  const res = await prisma.videoAsset.updateMany({ where: { id, isArchived: false }, data: { isArchived: true } });
  if (res.count === 0) throw notFound("Video not found");
  await writeAudit({ actorId: actor.userId, action: "media.archive", entity: "VideoAsset", entityId: id });
  return { archived: true };
};

export const listAssets = async () => {
  const [videos, files] = await Promise.all([
    prisma.videoAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, lessonId: true, title: true, mimeType: true, sizeBytes: true, isArchived: true, createdAt: true } }),
    prisma.fileAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, courseId: true, filename: true, mimeType: true, sizeBytes: true, isPublic: true, createdAt: true } }),
  ]);
  return { videos, files };
};

// ───────────── access ─────────────

interface AssetView {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  filename: string | null;
  authorized: (viewer: Viewer) => Promise<boolean>;
}

const loadAsset = async (kind: MediaKind, id: string): Promise<AssetView | null> => {
  if (kind === "VIDEO") {
    const v = await prisma.videoAsset.findFirst({ where: { id, isArchived: false } });
    if (!v) return null;
    const lesson = v.lessonId ? await prisma.lesson.findUnique({ where: { id: v.lessonId }, select: { courseId: true } }) : null;
    return {
      storageKey: v.storageKey, mimeType: v.mimeType, sizeBytes: v.sizeBytes, filename: null,
      // A video that is not attached to a lesson is visible to staff only.
      authorized: async (viewer) => (lesson ? canAccessCourse(viewer, lesson.courseId) : hasPermission(viewer.role, "media:manage")),
    };
  }
  const f = await prisma.fileAsset.findUnique({ where: { id } });
  if (!f) return null;
  return {
    storageKey: f.storageKey, mimeType: f.mimeType, sizeBytes: f.sizeBytes, filename: f.filename,
    authorized: async (viewer) => (f.isPublic ? true : f.courseId ? canAccessCourse(viewer, f.courseId) : hasPermission(viewer.role, "media:manage")),
  };
};

/** Step 1 (needs the normal Authorization header): decide, log, and hand out a short-lived URL. */
export const issueAccess = async (viewer: Viewer, kind: MediaKind, id: string) => {
  const asset = await loadAsset(kind, id);
  // Not found and not allowed look the same, so ids cannot be probed.
  if (!asset || !(await asset.authorized(viewer))) throw notFound("Media not found");
  await prisma.mediaAccessLog.create({ data: { userId: viewer.userId, assetType: kind, assetId: id } });
  const exp = Math.floor(Date.now() / 1000) + env.MEDIA_URL_TTL_SECONDS;
  const token = signMediaToken(secret(), { kind, assetId: id, userId: viewer.userId, exp });
  return { url: `/api/media/stream/${token}`, expiresAt: new Date(exp * 1000).toISOString() };
};

export interface StreamPlan {
  status: 200 | 206;
  headers: Record<string, string>;
  stream: Readable;
}

/**
 * Step 2 (browser media element, no custom headers): the token proves step 1 happened. Access is
 * re-checked here, so a blocked account or a revoked enrollment loses the stream before the token expires.
 */
export const openStream = async (token: string, rangeHeader: string | undefined): Promise<StreamPlan> => {
  const claims = verifyMediaToken(secret(), token);
  if (!claims) throw unauthorized("Link expired or invalid");

  const user = await prisma.user.findUnique({ where: { id: claims.userId }, select: { id: true, role: true, isActive: true } });
  if (!user || !user.isActive) throw unauthorized("Link expired or invalid");
  const asset = await loadAsset(claims.kind, claims.assetId);
  if (!asset || !(await asset.authorized({ userId: user.id, role: user.role }))) throw notFound("Media not found");

  const stat = await storage.statObject(asset.storageKey);
  if (!stat) throw notFound("Media not found");

  let start = 0;
  let end = stat.size - 1;
  let status: 200 | 206 = 200;
  if (rangeHeader) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!m || (m[1] === "" && m[2] === "")) throw new HttpError(416, "Invalid range");
    if (m[1] === "") {
      start = Math.max(stat.size - parseInt(m[2], 10), 0); // suffix range: last N bytes
    } else {
      start = parseInt(m[1], 10);
      if (m[2] !== "") end = Math.min(parseInt(m[2], 10), end);
    }
    if (start > end || start >= stat.size) throw new HttpError(416, "Range not satisfiable");
    status = 206;
  }

  const headers: Record<string, string> = {
    "Content-Type": asset.mimeType,
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    // Private content must never be stored by shared caches or CDNs.
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    // Helmet defaults to same-origin; the SPA lives on another origin and embeds this stream.
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Disposition": `inline; filename="${asset.filename ? safeFilename(asset.filename) : "media"}"`,
  };
  if (status === 206) headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
  return { status, headers, stream: storage.openRange(asset.storageKey, start, end) };
};
