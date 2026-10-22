import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { rewritePlaylist } from "../src/lib/media/playlist";

describe("rewritePlaylist", () => {
  it("rewrites media lines only and keeps tags, blanks and unresolved lines", async () => {
    const text = "#EXTM3U\n#EXTINF:4.0,\nseg_0.ts\n\n#EXTINF:4.0,\nseg_1.ts\nweird.bin\n#EXT-X-ENDLIST";
    const out = await rewritePlaylist(text, async (uri) => (uri.startsWith("seg_") ? `https://cdn.example/${uri}?sig=1` : null));
    expect(out).toBe("#EXTM3U\n#EXTINF:4.0,\nhttps://cdn.example/seg_0.ts?sig=1\n\n#EXTINF:4.0,\nhttps://cdn.example/seg_1.ts?sig=1\nweird.bin\n#EXT-X-ENDLIST");
  });
});

// Integration: with an S3/R2 bucket the browser gets video bytes straight from the bucket through signed
// links; the API only checks access. The bucket is faked here (files on disk + a recognisable signed URL).
// Needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eavto-direct-"));
process.env.MEDIA_DIR = dir;
process.env.ENFORCE_ENROLLMENT = "true";
process.env.STORAGE_DRIVER = "s3";
process.env.S3_BUCKET = "test-bucket";
process.env.S3_ACCESS_KEY_ID = "test";
process.env.S3_SECRET_ACCESS_KEY = "test";
process.env.S3_ENDPOINT = "https://acct.r2.cloudflarestorage.com";
const run = `d${Date.now()}`;
const SIGNED = "https://acct.r2.cloudflarestorage.com/test-bucket/";

vi.mock("../src/lib/media/s3", async () => {
  const fsp = await import("fs/promises");
  const nodeFs = await import("fs");
  const nodePath = await import("path");
  const file = (key: string) => nodePath.join(process.env.MEDIA_DIR!, ...key.split("/"));
  return {
    s3Driver: () => ({
      name: "s3",
      async put(key: string, from: string) {
        await fsp.mkdir(nodePath.dirname(file(key)), { recursive: true });
        await fsp.rename(from, file(key));
      },
      async remove(key: string) {
        await fsp.rm(file(key), { force: true });
      },
      async stat(key: string) {
        try {
          return { size: (await fsp.stat(file(key))).size };
        } catch {
          return null;
        }
      },
      async openRange(key: string, start: number, end: number) {
        return nodeFs.createReadStream(file(key), { start, end });
      },
      async signedUrl(key: string, ttl: number) {
        return `${SIGNED}${key}?X-Amz-Expires=${ttl}&X-Amz-Signature=fake`;
      },
    }),
  };
});

describe.skipIf(!enabled)("direct delivery from the bucket", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let courseId = "";
  let hlsId = "";
  let mp4Id = "";
  let folder = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string) => {
    const res = await request(app).post("/api/auth/register").send({ name: k, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    tok[k] = res.body.data.token;
    return res.body.data.user.id as string;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    const storage = await import("../src/lib/media/storage");
    const paid = await signup("paid");
    await signup("free");
    courseId = (await prisma.course.create({ data: { title: `C ${run}`, description: "d" } })).id;
    const lessonId = (await prisma.lesson.create({ data: { courseId, title: "L" } })).id;
    await prisma.enrollment.create({ data: { userId: paid, courseId } });

    const work = await storage.makeTempDir();
    fs.mkdirSync(path.join(work, "360p"));
    fs.writeFileSync(path.join(work, "master.m3u8"), "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\n360p/index.m3u8\n");
    fs.writeFileSync(path.join(work, "360p", "index.m3u8"), "#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\nseg_0.ts\n#EXTINF:4,\nseg_1.ts\n#EXT-X-ENDLIST\n");
    fs.writeFileSync(path.join(work, "360p", "seg_0.ts"), Buffer.alloc(188, 0x47));
    fs.writeFileSync(path.join(work, "360p", "seg_1.ts"), Buffer.alloc(188, 0x47));
    fs.writeFileSync(path.join(work, "poster.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    ({ folder } = await storage.commitFolder(work, ["master.m3u8", "360p/index.m3u8", "360p/seg_0.ts", "360p/seg_1.ts", "poster.jpg"].map((rel) => ({ rel, contentType: "x" }))));
    hlsId = (await prisma.videoAsset.create({ data: { storageKey: folder, format: "HLS", lessonId, mimeType: "application/vnd.apple.mpegurl", sizeBytes: 1, durationSec: 8, createdById: paid } })).id;

    const mp4Key = `${"0".repeat(8)}-0000-4000-8000-${run.replace(/\D/g, "").slice(-12).padStart(12, "0")}.mp4`;
    fs.writeFileSync(path.join(dir, mp4Key), Buffer.alloc(64, 1));
    // An older plain-MP4 video of another lesson.
    const other = (await prisma.lesson.create({ data: { courseId, title: "L2" } })).id;
    mp4Id = (await prisma.videoAsset.create({ data: { storageKey: mp4Key, format: "MP4", lessonId: other, mimeType: "video/mp4", sizeBytes: 64, createdById: paid } })).id;
  });

  afterAll(async () => {
    if (enabled) {
      await prisma.videoAsset.deleteMany({ where: { id: { in: [hlsId, mp4Id] } } });
      await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("serves the master playlist itself, but the quality playlist points every segment at the bucket", async () => {
    const base = (await request(app).post(`/api/media/video/${hlsId}/access`).set(bearer("paid"))).body.data.url.replace("master.m3u8", "");
    const master = await request(app).get(`${base}master.m3u8`);
    expect(master.status).toBe(200);
    expect(master.text).toContain("360p/index.m3u8");

    const variant = await request(app).get(`${base}360p/index.m3u8`);
    expect(variant.status).toBe(200);
    expect(variant.headers["cache-control"]).toBe("private, no-store");
    const media = variant.text.split("\n").filter((l) => l && !l.startsWith("#"));
    expect(media).toEqual([`${SIGNED}${folder}/360p/seg_0.ts`, `${SIGNED}${folder}/360p/seg_1.ts`].map((u) => expect.stringContaining(u)));
    expect(variant.text).toContain("#EXT-X-ENDLIST");
  });

  it("sends segments, the poster and MP4 video to the bucket with a redirect, after the access check", async () => {
    const base = (await request(app).post(`/api/media/video/${hlsId}/access`).set(bearer("paid"))).body.data.url.replace("master.m3u8", "");
    for (const f of ["360p/seg_0.ts", "poster.jpg"]) {
      const r = await request(app).get(`${base}${f}`);
      expect(r.status).toBe(302);
      expect(r.headers.location).toContain(`${SIGNED}${folder}/${f}`);
      expect(r.headers["cache-control"]).toBe("private, no-store");
    }
    const mp4 = (await request(app).post(`/api/media/video/${mp4Id}/access`).set(bearer("paid"))).body.data;
    expect(mp4.type).toBe("file");
    const r = await request(app).get(mp4.url);
    expect(r.status).toBe(302);
    expect(r.headers.location).toMatch(new RegExp(`^${SIGNED}.+\\.mp4\\?`));

    // No course, no link: the bucket address is never revealed.
    expect((await request(app).post(`/api/media/video/${hlsId}/access`).set(bearer("free"))).status).toBe(404);
  });
});
