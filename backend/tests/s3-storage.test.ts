import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { Readable } from "stream";

// The S3 driver against a minimal in-memory S3 endpoint (path-style, like MinIO). It checks what
// the driver sends and what it does with the answers; a real bucket (S3/R2) is not used here.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eavto-s3-"));
const objects = new Map<string, { body: Buffer; type: string; cache: string }>();
const seen: { method: string; url: string; auth: boolean }[] = [];

const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://x");
    seen.push({ method: req.method ?? "", url: url.pathname, auth: String(req.headers.authorization ?? "").startsWith("AWS4-HMAC-SHA256") });
    const key = decodeURIComponent(url.pathname);
    const obj = objects.get(key);
    if (req.method === "PUT") {
      objects.set(key, { body: Buffer.concat(chunks), type: String(req.headers["content-type"]), cache: String(req.headers["cache-control"]) });
      res.writeHead(200, { ETag: '"1"' }).end();
    } else if (req.method === "HEAD") {
      if (!obj) return void res.writeHead(404).end();
      res.writeHead(200, { "Content-Length": obj.body.length, "Content-Type": obj.type }).end();
    } else if (req.method === "GET") {
      if (!obj) return void res.writeHead(404, { "Content-Type": "application/xml" }).end("<Error><Code>NoSuchKey</Code></Error>");
      const m = /^bytes=(\d+)-(\d+)$/.exec(String(req.headers.range ?? ""));
      const part = m ? obj.body.subarray(Number(m[1]), Number(m[2]) + 1) : obj.body;
      res.writeHead(m ? 206 : 200, { "Content-Length": part.length, "Content-Type": obj.type }).end(part);
    } else if (req.method === "DELETE") {
      objects.delete(key);
      res.writeHead(204).end();
    } else res.writeHead(405).end();
  });
});

describe("S3 storage driver", () => {
  let storage: typeof import("../src/lib/media/storage");

  beforeAll(async () => {
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const port = (server.address() as import("net").AddressInfo).port;
    Object.assign(process.env, {
      MEDIA_DIR: dir,
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "private-media",
      S3_REGION: "auto",
      S3_ENDPOINT: `http://127.0.0.1:${port}`,
      S3_FORCE_PATH_STYLE: "true",
      S3_ACCESS_KEY_ID: "test-key",
      S3_SECRET_ACCESS_KEY: "test-secret",
    });
    storage = await import("../src/lib/media/storage");
  });
  afterAll(() => {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
    for (const k of ["STORAGE_DRIVER", "S3_BUCKET", "S3_ENDPOINT", "S3_FORCE_PATH_STYLE", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_REGION"]) delete process.env[k];
  });

  it("uploads a committed file as a private object, removes the temp file, and reads byte ranges", async () => {
    expect(storage.driver().name).toBe("s3");
    const content = Buffer.from("%PDF-1.7 0123456789");
    const { tmpPath } = await storage.writeTemp(Readable.from([content]), 1000);
    const key = await storage.commit(tmpPath, "pdf", "application/pdf");

    expect(fs.existsSync(tmpPath)).toBe(false);
    const stored = objects.get(`/private-media/${key}`);
    expect(stored?.body.equals(content)).toBe(true);
    expect(stored?.type).toBe("application/pdf");
    expect(stored?.cache).toBe("private, no-store");
    expect(seen.every((r) => r.auth)).toBe(true); // every request is SigV4-signed

    expect(await storage.statObject(key)).toEqual({ size: content.length });
    const chunks: Buffer[] = [];
    for await (const c of await storage.openRange(key, 9, 12)) chunks.push(Buffer.from(c as Uint8Array));
    expect(Buffer.concat(chunks).toString()).toBe("0123");

    await storage.removeObject(key);
    expect(await storage.statObject(key)).toBeNull();
  });

  it("never sends a request for a key that fails the guard", async () => {
    const before = seen.length;
    await expect(storage.statObject("../etc/passwd")).rejects.toThrow("Invalid storage key");
    await expect(storage.openRange("a/../../b.pdf", 0, 1)).rejects.toThrow("Invalid storage key");
    expect(seen.length).toBe(before);
  });
});
