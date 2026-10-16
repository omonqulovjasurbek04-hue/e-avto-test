import fs from "fs";
import fsp from "fs/promises";
import { Readable } from "stream";
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../config/env";
import type { StorageDriver } from "./storage";
import { assertKey } from "./keys";

let client: S3Client | null = null;

const s3 = () => {
  if (!client) {
    client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
      // Newer SDKs add CRC checksums (aws-chunked uploads) by default; R2 and MinIO do not all accept them.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
};

const isNotFound = (err: unknown) => {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NotFound" || e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404;
};

/** S3-compatible bucket (AWS S3, Cloudflare R2, MinIO). Objects are private; the API streams them after its own access check. */
export const s3Driver = (): StorageDriver => ({
  name: "s3",
  async put(key, filePath, contentType) {
    const { size } = await fsp.stat(filePath);
    await s3().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: assertKey(key),
        Body: fs.createReadStream(filePath),
        ContentLength: size,
        ContentType: contentType,
        CacheControl: "private, no-store",
      })
    );
  },
  async remove(key) {
    await s3().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: assertKey(key) }));
  },
  async stat(key) {
    try {
      const head = await s3().send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: assertKey(key) }));
      return { size: Number(head.ContentLength ?? 0) };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  },
  async openRange(key, start, end) {
    const res = await s3().send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: assertKey(key), Range: `bytes=${start}-${end}` }));
    if (!res.Body) throw new Error("Empty object body");
    return res.Body as Readable;
  },
});
