import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";

// Integration: private media access control. Needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eavto-media-it-"));
process.env.MEDIA_DIR = dir;
process.env.MEDIA_UPLOAD_ENABLED = "true";
process.env.ENFORCE_ENROLLMENT = "true";
const run = `v${Date.now()}`;
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]), Buffer.alloc(100, 7)]);

describe.skipIf(!enabled)("private media", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let courseId = "";
  let videoId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "ADMIN") => {
    const res = await request(app).post("/api/auth/register").send({ name: k, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    tok[k] = res.body.data.token;
    return res.body.data.user.id as string;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("admin", "ADMIN");
    const paid = await signup("paid");
    await signup("free");
    const course = await prisma.course.create({ data: { title: `C ${run}`, description: "d" } });
    courseId = course.id;
    const lesson = await prisma.lesson.create({ data: { courseId, title: "L" } });
    await prisma.enrollment.create({ data: { userId: paid, courseId } });

    const up = await request(app).put(`/api/admin/media/video?lessonId=${lesson.id}`).set(bearer("admin")).set("Content-Type", "application/octet-stream").send(MP4);
    expect(up.status).toBe(201);
    expect(up.body.data).not.toHaveProperty("storageKey");
    videoId = up.body.data.id;
  });

  afterAll(async () => {
    if (enabled) {
      await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
      await prisma.videoAsset.deleteMany({ where: { id: videoId } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects non-video content uploaded as video", async () => {
    const res = await request(app).put("/api/admin/media/video").set(bearer("admin")).set("Content-Type", "application/octet-stream").send(Buffer.from("<html><script>alert(1)</script></html>"));
    expect(res.status).toBe(415);
  });

  it("students cannot upload", async () => {
    expect((await request(app).put("/api/admin/media/video").set(bearer("paid")).send(MP4)).status).toBe(403);
  });

  it("guests and non-enrolled users get no access URL", async () => {
    expect((await request(app).post(`/api/media/video/${videoId}/access`)).status).toBe(401);
    expect((await request(app).post(`/api/media/video/${videoId}/access`).set(bearer("free"))).status).toBe(404);
  });

  it("an enrolled student streams with range support, and the stream is never cacheable", async () => {
    const access = await request(app).post(`/api/media/video/${videoId}/access`).set(bearer("paid"));
    expect(access.status).toBe(200);
    const full = await request(app).get(access.body.data.url);
    expect(full.status).toBe(200);
    expect(full.headers["cache-control"]).toContain("no-store");
    const part = await request(app).get(access.body.data.url).set("Range", "bytes=0-9");
    expect(part.status).toBe(206);
    expect(part.headers["content-range"]).toMatch(/^bytes 0-9\//);
  });

  it("a tampered token and a revoked enrollment both stop the stream", async () => {
    const url = (await request(app).post(`/api/media/video/${videoId}/access`).set(bearer("paid"))).body.data.url as string;
    expect((await request(app).get(`${url}x`)).status).toBe(401);
    await prisma.enrollment.updateMany({ where: { courseId }, data: { status: "REVOKED" } });
    expect((await request(app).get(url)).status).toBe(404);
  });
});
