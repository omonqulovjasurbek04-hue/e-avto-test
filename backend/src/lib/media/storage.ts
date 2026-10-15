import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import { env } from "../../config/env";

/**
 * Local-disk private storage. The directory is outside any static/public folder and is never
 * served directly — files leave only through the authorised media endpoints.
 * A real object store (S3/R2) is NOT integrated; implement the same four functions to swap it in.
 */
const root = () => path.resolve(process.cwd(), env.MEDIA_DIR);

const KEY_RE = /^[a-f0-9-]{36}\.(mp4|webm|pdf|png|jpg)$/;

/** Keys are generated server-side; this guard makes path traversal impossible even if one leaks from the DB. */
const resolveKey = (key: string): string => {
  if (!KEY_RE.test(key)) throw new Error("Invalid storage key");
  return path.join(root(), key);
};

export class UploadTooLargeError extends Error {}

/** Streams `input` to a temp file, enforcing a byte limit while writing. Returns the temp path and size. */
export const writeTemp = async (input: Readable, maxBytes: number): Promise<{ tmpPath: string; size: number }> => {
  await fsp.mkdir(root(), { recursive: true });
  const tmpPath = path.join(root(), `.upload-${crypto.randomUUID()}`);
  let size = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > maxBytes) return cb(new UploadTooLargeError());
      cb(null, chunk);
    },
  });
  try {
    await pipeline(input, limiter, fs.createWriteStream(tmpPath, { mode: 0o600 }));
  } catch (err) {
    await fsp.rm(tmpPath, { force: true });
    throw err;
  }
  return { tmpPath, size };
};

export const readHead = async (filePath: string, bytes = 16): Promise<Buffer> => {
  const fh = await fsp.open(filePath, "r");
  try {
    const buf = Buffer.alloc(bytes);
    const { bytesRead } = await fh.read(buf, 0, bytes, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
};

export const discard = (filePath: string) => fsp.rm(filePath, { force: true });

/** Moves a verified temp file to its final, random, server-chosen key. */
export const commit = async (tmpPath: string, ext: string): Promise<string> => {
  const key = `${crypto.randomUUID()}.${ext}`;
  await fsp.rename(tmpPath, resolveKey(key));
  return key;
};

export const removeObject = (key: string) => fsp.rm(resolveKey(key), { force: true });

export const statObject = async (key: string): Promise<{ size: number } | null> => {
  try {
    return { size: (await fsp.stat(resolveKey(key))).size };
  } catch {
    return null;
  }
};

export const openRange = (key: string, start: number, end: number) => fs.createReadStream(resolveKey(key), { start, end });
