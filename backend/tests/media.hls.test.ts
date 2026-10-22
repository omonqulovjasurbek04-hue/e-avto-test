import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { assertKey, hlsFile } from "../src/lib/media/keys";

describe("HLS storage keys and ladder", () => {
  const id = "0b6f6a52-6f4a-4b6c-9a51-0c6a1f6b7f10";

  it("accepts only the files of an HLS folder, never a path out of it", () => {
    for (const f of ["master.m3u8", "poster.jpg", "720p/index.m3u8", "1080p/seg_12.ts"]) expect(assertKey(`${id}/${f}`)).toBe(`${id}/${f}`);
    for (const bad of [`${id}/../x.ts`, `${id}/720p/../../etc`, `${id}/720p/seg_1.mp4`, `${id}`, `../${id}/master.m3u8`]) expect(() => assertKey(bad)).toThrow();
    expect(hlsFile("720p/seg_3.ts")).toBe("720p/seg_3.ts");
    expect(hlsFile("../secret")).toBeNull();
  });

  it("never upscales: a 1072px source gets 1080p and below, a 480p source stops at 480p", async () => {
    // Imported here: lib/media/hls reads config/env, which must see the env set below for the integration tests.
    const { renditionsFor } = await import("../src/lib/media/hls");
    expect(renditionsFor(1072).map((r) => r.height)).toEqual([1080, 720, 480, 360]);
    expect(renditionsFor(480).map((r) => r.height)).toEqual([480, 360]);
    expect(renditionsFor(240).map((r) => r.height)).toEqual([360]);
  });
});

// Integration: adaptive lesson video behind the same access rules as MP4. Needs PostgreSQL (TEST_DATABASE_URL).
// The HLS folder is written by hand (no ffmpeg needed in CI).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eavto-hls-it-"));
process.env.MEDIA_DIR = dir;
process.env.ENFORCE_ENROLLMENT = "true";
const run = `h${Date.now()}`;

describe.skipIf(!enabled)("adaptive (HLS) lesson video", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let courseId = "";
  let lessonId = "";
  let videoId = "";
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
    lessonId = (await prisma.lesson.create({ data: { courseId, title: "L" } })).id;
    await prisma.enrollment.create({ data: { userId: paid, courseId } });

    const work = await storage.makeTempDir();
    fs.mkdirSync(path.join(work, "360p"));
    fs.writeFileSync(path.join(work, "master.m3u8"), "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\n360p/index.m3u8\n");
    fs.writeFileSync(path.join(work, "360p", "index.m3u8"), "#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\nseg_0.ts\n#EXT-X-ENDLIST\n");
    fs.writeFileSync(path.join(work, "360p", "seg_0.ts"), Buffer.alloc(188 * 4, 0x47));
    fs.writeFileSync(path.join(work, "poster.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    const { folder, bytes } = await storage.commitFolder(work, [
      { rel: "master.m3u8", contentType: "application/vnd.apple.mpegurl" },
      { rel: "360p/index.m3u8", contentType: "application/vnd.apple.mpegurl" },
      { rel: "360p/seg_0.ts", contentType: "video/mp2t" },
      { rel: "poster.jpg", contentType: "image/jpeg" },
    ]);
    videoId = (
      await prisma.videoAsset.create({
        data: { storageKey: folder, format: "HLS", lessonId, mimeType: "application/vnd.apple.mpegurl", sizeBytes: bytes, durationSec: 4, createdById: paid },
      })
    ).id;
  });

  afterAll(async () => {
    if (enabled) {
      await prisma.videoAsset.deleteMany({ where: { id: videoId } });
      await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("the lesson shows its video to a buyer, and the access call hands out an HLS link with a poster", async () => {
    const lesson = await request(app).get(`/api/lessons/${lessonId}`).set(bearer("paid"));
    expect(lesson.body.data.privateVideoId).toBe(videoId);
    const res = await request(app).post(`/api/media/video/${videoId}/access`).set(bearer("paid"));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ type: "hls" });
    expect(res.body.data.url).toMatch(/^\/api\/media\/hls\/[^/]+\/master\.m3u8$/);
    expect(res.body.data.poster).toMatch(/\/poster\.jpg$/);
  });

  it("streams the playlists, the segments and the poster with the right types; segments may be cached privately", async () => {
    const base = (await request(app).post(`/api/media/video/${videoId}/access`).set(bearer("paid"))).body.data.url.replace("master.m3u8", "");
    const master = await request(app).get(`${base}master.m3u8`);
    expect(master.status).toBe(200);
    expect(master.headers["content-type"]).toContain("application/vnd.apple.mpegurl");
    expect(master.headers["cache-control"]).toBe("private, no-store");
    const seg = await request(app).get(`${base}360p/seg_0.ts`);
    expect(seg.status).toBe(200);
    expect(seg.headers["content-type"]).toBe("video/mp2t");
    expect(seg.headers["cache-control"]).toContain("immutable");
    expect((await request(app).get(`${base}poster.jpg`)).headers["content-type"]).toBe("image/jpeg");
    // Nothing outside the folder's known files, and no forged token.
    expect((await request(app).get(`${base}360p/seg_9.mp4`)).status).toBe(404);
    expect((await request(app).get(`${base}..%2F..%2Fpackage.json`)).status).toBe(404);
    expect((await request(app).get("/api/media/hls/forged.token/master.m3u8")).status).toBe(401);
  });

  it("someone without the course gets nothing, and a buyer who loses access loses the playlists", async () => {
    expect((await request(app).post(`/api/media/video/${videoId}/access`).set(bearer("free"))).status).toBe(404);

    const base = (await request(app).post(`/api/media/video/${videoId}/access`).set(bearer("paid"))).body.data.url.replace("master.m3u8", "");
    await prisma.enrollment.deleteMany({ where: { courseId } });
    expect((await request(app).get(`${base}master.m3u8`)).status).toBe(404);
  });
});
