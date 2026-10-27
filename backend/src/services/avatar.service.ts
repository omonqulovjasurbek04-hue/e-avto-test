import { Readable } from "stream";
import { prisma } from "../config/database";
import * as storage from "../lib/media/storage";
import { HttpError } from "../utils/errors";
import { toPublicUser } from "./auth.service";
import { AVATAR_PREFIX, uploadImage } from "./media.service";

/** The browser sends a small square (it crops and shrinks the photo first); this is the hard limit. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const OWN_IMAGE = /^\/api\/images\/([a-f0-9-]{36})\.(?:png|jpg|webp)$/;

/** Deletes a photo the user uploaded earlier (a Google picture or any other URL is left alone). */
const dropOwnPhoto = async (avatarUrl: string | null) => {
  const id = avatarUrl ? OWN_IMAGE.exec(avatarUrl)?.[1] : undefined;
  if (!id) return;
  const file = await prisma.fileAsset.findFirst({ where: { id, filename: { startsWith: AVATAR_PREFIX } } });
  if (!file) return;
  await prisma.fileAsset.delete({ where: { id } });
  await storage.removeObject(file.storageKey).catch(() => undefined);
};

/** Stores a new profile photo (PNG, JPEG or WebP, checked like every upload) and replaces the old one. */
export const setAvatar = async (viewer: { userId: string; role: string }, body: Readable, contentLength: number | undefined) => {
  if (contentLength && contentLength > AVATAR_MAX_BYTES) throw new HttpError(413, "Image is too large");
  const before = await prisma.user.findUnique({ where: { id: viewer.userId }, select: { avatarUrl: true } });
  const image = await uploadImage(viewer, body, { contentLength, filename: `${AVATAR_PREFIX}${viewer.userId}`, maxBytes: AVATAR_MAX_BYTES });
  // Same-site path: the site serves /api/* itself, so the photo loads without another origin.
  const user = await prisma.user.update({ where: { id: viewer.userId }, data: { avatarUrl: image.path } });
  await dropOwnPhoto(before?.avatarUrl ?? null);
  return toPublicUser(user);
};

export const removeAvatar = async (userId: string) => {
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
  await dropOwnPhoto(before?.avatarUrl ?? null);
  return toPublicUser(user);
};
