import crypto from "crypto";
import path from "path";
import { Readable } from "stream";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { signMediaToken, verifyMediaToken, MediaKind } from "../lib/media/signing";
import { detectType } from "../lib/media/sniff";
import * as storage from "../lib/media/storage";
import { scanFile, ScannerUnavailableError } from "../lib/media/antivirus";
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
 * type comes from the file's first bytes and must match the requested kind. With CLAMAV_HOST set, every
 * file is scanned before it is stored (infected or unscannable files are rejected) — see docs/SECURITY.md.
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

  await scanOrReject(actor, tmp.tmpPath, kind);

  const storageKey = await storage.commit(tmp.tmpPath, detected.ext, detected.mime);
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

/** Runs the antivirus scan; the temp file is removed when the upload is rejected. */
const scanOrReject = async (actor: Viewer, tmpPath: string, kind: MediaKind | "IMAGE") => {
  let result;
  try {
    result = await scanFile(tmpPath);
  } catch (err) {
    await storage.discard(tmpPath);
    if (err instanceof ScannerUnavailableError) {
      console.error(err.message);
      throw new HttpError(503, "Antivirus check is unavailable, the file was not stored. Try again later");
    }
    throw err;
  }
  if (result.status === "infected") {
    await storage.discard(tmpPath);
    await writeAudit({ actorId: actor.userId, action: "media.rejected_malware", entity: kind === "VIDEO" ? "VideoAsset" : "FileAsset", after: { signature: result.signature } });
    throw new HttpError(422, "The file failed the antivirus check and was not stored");
  }
};

// ───────────── public images (CMS covers, page pictures, question images) ─────────────

const IMAGE_EXT = /^([a-f0-9-]{36})\.(png|jpg|webp)$/;

/**
 * Small public images for CMS content. Stored like private files (same drivers, scanned), flagged
 * isPublic, and served by GET /api/images/:id.:ext with a long cache. Not gated by MEDIA_UPLOAD_ENABLED:
 * that switch is about large private video files.
 */
export const uploadImage = async (actor: Viewer, body: Readable, meta: { contentLength: number | undefined; filename?: string }) => {
  const maxBytes = env.MAX_IMAGE_MB * 1024 * 1024;
  if (!meta.contentLength) throw new HttpError(411, "Content-Length is required");
  if (meta.contentLength > maxBytes) throw new HttpError(413, "Image is too large");

  let tmp;
  try {
    tmp = await storage.writeTemp(body, maxBytes);
  } catch (err) {
    if (err instanceof storage.UploadTooLargeError) throw new HttpError(413, "Image is too large");
    throw badRequest("Upload failed");
  }
  const detected = detectType(await storage.readHead(tmp.tmpPath));
  if (!detected || detected.kind !== "image") {
    await storage.discard(tmp.tmpPath);
    throw new HttpError(415, "Only PNG, JPEG or WebP images are accepted");
  }
  await scanOrReject(actor, tmp.tmpPath, "IMAGE");

  const storageKey = await storage.commit(tmp.tmpPath, detected.ext, detected.mime);
  try {
    const asset = await prisma.fileAsset.create({
      data: { storageKey, filename: safeFilename(meta.filename ?? `image.${detected.ext}`), mimeType: detected.mime, sizeBytes: tmp.size, isPublic: true, createdById: actor.userId },
    });
    await writeAudit({ actorId: actor.userId, action: "media.image_upload", entity: "FileAsset", entityId: asset.id, after: { mime: detected.mime, size: tmp.size } });
    const path = `/api/images/${asset.id}.${detected.ext}`;
    return { id: asset.id, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, filename: asset.filename, path, url: `${env.PUBLIC_API_ORIGIN}${path}` };
  } catch (err) {
    await storage.removeObject(storageKey);
    throw err;
  }
};

export const listImages = async () => {
  const rows = await prisma.fileAsset.findMany({
    where: { isPublic: true, mimeType: { startsWith: "image/" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, filename: true, mimeType: true, sizeBytes: true, createdAt: true, storageKey: true },
  });
  return rows.map(({ storageKey, ...r }) => {
    const path = `/api/images/${r.id}.${storageKey.split(".").pop()}`;
    return { ...r, path, url: `${env.PUBLIC_API_ORIGIN}${path}` };
  });
};

export const deleteImage = async (actor: Viewer, id: string) => {
  const f = await prisma.fileAsset.findFirst({ where: { id, isPublic: true, mimeType: { startsWith: "image/" } } });
  if (!f) throw notFound("Image not found");
  await prisma.fileAsset.delete({ where: { id } });
  await storage.removeObject(f.storageKey).catch(() => undefined);
  await writeAudit({ actorId: actor.userId, action: "media.image_delete", entity: "FileAsset", entityId: id });
  return { deleted: true };
};

/** Public, cacheable: only files explicitly flagged isPublic and of an image type are ever served here. */
export const openPublicImage = async (name: string): Promise<StreamPlan> => {
  const m = IMAGE_EXT.exec(name);
  if (!m) throw notFound("Image not found");
  const f = await prisma.fileAsset.findFirst({ where: { id: m[1], isPublic: true, mimeType: { startsWith: "image/" } } });
  if (!f || !f.storageKey.endsWith(`.${m[2]}`)) throw notFound("Image not found");
  const stat = await storage.statObject(f.storageKey);
  if (!stat) throw notFound("Image not found");
  return {
    status: 200,
    headers: {
      "Content-Type": f.mimeType,
      "Content-Length": String(stat.size),
      // Keys never change content (a new upload gets a new id), so the image is immutable.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
    stream: await storage.openRange(f.storageKey, 0, Math.max(stat.size - 1, 0)),
  };
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
  return { status, headers, stream: await storage.openRange(asset.storageKey, start, end) };
};
