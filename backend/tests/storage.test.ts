import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eavto-media-"));
process.env.MEDIA_DIR = dir;

describe("private storage", () => {
  let storage: typeof import("../src/lib/media/storage");
  beforeAll(async () => {
    storage = await import("../src/lib/media/storage");
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("stores a file under a random server-chosen key and reads byte ranges", async () => {
    const { tmpPath, size } = await storage.writeTemp(Readable.from([Buffer.from("0123456789")]), 100);
    expect(size).toBe(10);
    const key = await storage.commit(tmpPath, "pdf", "application/pdf");
    expect(fs.existsSync(tmpPath)).toBe(false);
    expect(key).toMatch(/^[a-f0-9-]{36}\.pdf$/);
    const chunks: Buffer[] = [];
    for await (const c of await storage.openRange(key, 2, 4)) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe("234");
    await storage.removeObject(key);
    expect(await storage.statObject(key)).toBeNull();
  });

  it("aborts an upload that exceeds the limit and leaves no temp file behind", async () => {
    await expect(storage.writeTemp(Readable.from([Buffer.alloc(50), Buffer.alloc(50)]), 60)).rejects.toBeInstanceOf(storage.UploadTooLargeError);
    expect(fs.readdirSync(dir).filter((f) => f.startsWith(".upload-"))).toHaveLength(0);
  });

  it("refuses keys that could escape the storage directory", async () => {
    const BS = String.fromCharCode(92); // a backslash, built this way so tooling cannot mangle the escape
    for (const bad of ["../secret.pdf", `..${BS}secret.pdf`, `..${BS}..${BS}windows${BS}system32.pdf`, "/etc/passwd", "a.pdf", "x/../../y.mp4"]) {
      await expect(storage.statObject(bad)).resolves.toBeNull();
      await expect(storage.openRange(bad, 0, 1)).rejects.toThrow("Invalid storage key");
      await expect(storage.removeObject(bad)).rejects.toThrow("Invalid storage key");
    }
  });
});
