import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import { env } from "../../config/env";
import { s3Driver } from "./s3";
import { assertKey } from "./keys";

/**
 * Private object storage. Uploads are always streamed to a local temp file first (size limit, type
 * sniffing and the antivirus scan need the whole file); only a verified file is committed to the
 * configured driver:
 *   - "local": MEDIA_DIR on disk, outside any static/public folder, never served directly.
 *   - "s3":    an S3-compatible bucket (AWS S3, Cloudflare R2, MinIO). The bucket must be private;
 *              files still leave only through the authorised media endpoints.
 */
export interface StorageDriver {
  name: "local" | "s3";
  put(key: string, filePath: string, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  stat(key: string): Promise<{ size: number } | null>;
  /** Inclusive byte range, like fs.createReadStream. */
  openRange(key: string, start: number, end: number): Promise<Readable>;
}

const tempRoot = () => path.resolve(process.cwd(), env.MEDIA_DIR);


const localDriver: StorageDriver = {
  name: "local",
  async put(key, filePath) {
    await fsp.rename(filePath, path.join(tempRoot(), assertKey(key)));
  },
  async remove(key) {
    await fsp.rm(path.join(tempRoot(), assertKey(key)), { force: true });
  },
  async stat(key) {
    try {
      return { size: (await fsp.stat(path.join(tempRoot(), assertKey(key)))).size };
    } catch {
      return null;
    }
  },
  async openRange(key, start, end) {
    return fs.createReadStream(path.join(tempRoot(), assertKey(key)), { start, end });
  },
};

export const driver = (): StorageDriver => (env.STORAGE_DRIVER === "s3" ? s3Driver() : localDriver);

export class UploadTooLargeError extends Error {}

/** Streams `input` to a temp file, enforcing a byte limit while writing. Returns the temp path and size. */
export const writeTemp = async (input: Readable, maxBytes: number): Promise<{ tmpPath: string; size: number }> => {
  await fsp.mkdir(tempRoot(), { recursive: true });
  const tmpPath = path.join(tempRoot(), `.upload-${crypto.randomUUID()}`);
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

/** Moves a verified temp file to its final, random, server-chosen key. The temp file is gone afterwards. */
export const commit = async (tmpPath: string, ext: string, contentType: string): Promise<string> => {
  const key = `${crypto.randomUUID()}.${ext}`;
  try {
    await driver().put(key, tmpPath, contentType);
  } finally {
    await fsp.rm(tmpPath, { force: true });
  }
  return key;
};

export const removeObject = (key: string) => driver().remove(key);

export const statObject = (key: string) => driver().stat(key);

export const openRange = (key: string, start: number, end: number) => driver().openRange(key, start, end);
