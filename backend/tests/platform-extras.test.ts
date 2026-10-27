import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import request from "supertest";

// Integration (PostgreSQL): CMS image library with antivirus, course categories, metrics endpoint.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eavto-extras-"));
const METRICS_TOKEN = "m".repeat(32);
process.env.MEDIA_DIR = dir;
process.env.METRICS_TOKEN = METRICS_TOKEN;
process.env.PUBLIC_API_ORIGIN = "https://api.example.uz";
process.env.STORAGE_DRIVER = "local";
const run = `x${Date.now()}`;

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const EICAR_MARK = Buffer.from("EICAR-MARK");
const INFECTED_PNG = Buffer.concat([PNG, EICAR_MARK]);

// Fake clamd: flags any stream that contains EICAR-MARK.
let scans = 0;
const clamd = net.createServer((sock) => {
  let buf = Buffer.alloc(0);
  sock.on("data", (d) => {
    buf = Buffer.concat([buf, d]);
    if (buf.length >= 4 && buf.subarray(buf.length - 4).equals(Buffer.alloc(4))) {
      scans += 1;
      sock.end(buf.includes(EICAR_MARK) ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0");
    }
  });
});

describe.skipIf(!enabled)("platform extras", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "ADMIN" | "MODERATOR") => {
    const res = await request(app).post("/api/auth/register").send({ name: k, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    tok[k] = res.body.data.token;
  };

  beforeAll(async () => {
    await new Promise<void>((r) => clamd.listen(0, "127.0.0.1", () => r()));
    process.env.CLAMAV_HOST = "127.0.0.1";
    process.env.CLAMAV_PORT = String((clamd.address() as net.AddressInfo).port);
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("admin", "ADMIN");
    await signup("moder", "MODERATOR");
    await signup("student");
  });

  afterAll(async () => {
    if (enabled) {
      await prisma.course.deleteMany({ where: { title: { startsWith: `C ${run}` } } });
      await prisma.category.deleteMany({ where: { slug: { startsWith: run } } });
      await prisma.fileAsset.deleteMany({ where: { createdById: { in: ids } } });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
    clamd.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe("question clips", () => {
    // "....ftyp…": what an MP4 file starts with.
    const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(200, 7)]);
    let clipPath = "";

    it("a question editor uploads a scanned clip and gets a public URL", async () => {
      const before = scans;
      const res = await request(app).put("/api/teacher/clips").set(bearer("moder")).set("Content-Type", "application/octet-stream").send(MP4);
      expect(res.status).toBe(201);
      expect(scans).toBe(before + 1);
      expect(res.body.data.url).toMatch(/^https:\/\/api\.example\.uz\/api\/clips\/[a-f0-9-]{36}\.mp4$/);
      clipPath = res.body.data.path;
    });

    it("plays from any point (Range) for anyone", async () => {
      const res = await request(app).get(clipPath).set("Range", "bytes=0-3");
      expect(res.status).toBe(206);
      expect(res.headers["content-range"]).toBe(`bytes 0-3/${MP4.length}`);
      expect(res.headers["content-type"]).toBe("video/mp4");
      expect((await request(app).get(clipPath)).status).toBe(200);
    });

    it("accepts only video, and only from question editors", async () => {
      expect((await request(app).put("/api/teacher/clips").set(bearer("moder")).set("Content-Type", "application/octet-stream").send(PNG)).status).toBe(415);
      expect((await request(app).put("/api/teacher/clips").set(bearer("student")).set("Content-Type", "application/octet-stream").send(MP4)).status).toBe(403);
      expect((await request(app).get("/api/clips/not-a-clip.mp4")).status).toBe(404);
    });
  });

  describe("CMS images", () => {
    let imageId = "";
    let imagePath = "";

    it("a content editor uploads a scanned image and gets an absolute public URL", async () => {
      const before = scans;
      const res = await request(app).put("/api/admin/cms/images?filename=cover.png").set(bearer("moder")).set("Content-Type", "application/octet-stream").send(PNG);
      expect(res.status).toBe(201);
      expect(scans).toBe(before + 1);
      expect(res.body.data.url).toMatch(/^https:\/\/api\.example\.uz\/api\/images\/[a-f0-9-]{36}\.png$/);
      expect(res.body.data).not.toHaveProperty("storageKey");
      imageId = res.body.data.id;
      imagePath = res.body.data.path;
    });

    it("anyone can fetch it, with immutable caching and the real type", async () => {
      const res = await request(app).get(imagePath).buffer(true).parse((r, cb) => {
        const parts: Buffer[] = [];
        r.on("data", (c: Buffer) => parts.push(c));
        r.on("end", () => cb(null, Buffer.concat(parts)));
      });
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["cache-control"]).toContain("immutable");
      expect((res.body as Buffer).equals(PNG)).toBe(true);
    });

    it("rejects an infected image and stores nothing", async () => {
      const count = await prisma.fileAsset.count();
      const res = await request(app).put("/api/admin/cms/images").set(bearer("admin")).set("Content-Type", "application/octet-stream").send(INFECTED_PNG);
      expect(res.status).toBe(422);
      expect(await prisma.fileAsset.count()).toBe(count);
      expect(fs.readdirSync(dir).filter((f) => f.startsWith(".upload-"))).toHaveLength(0);
      expect(await prisma.auditLog.count({ where: { action: "media.rejected_malware", actorId: ids[0] } })).toBe(1);
    });

    it("refuses uploads when the scanner is configured but unreachable (503)", async () => {
      const port = process.env.CLAMAV_PORT;
      const { env } = await import("../src/config/env");
      env.CLAMAV_PORT = 1; // nothing listens there
      try {
        const res = await request(app).put("/api/admin/cms/images").set(bearer("admin")).set("Content-Type", "application/octet-stream").send(PNG);
        expect(res.status).toBe(503);
      } finally {
        env.CLAMAV_PORT = Number(port);
      }
    });

    it("rejects non-images and students", async () => {
      expect((await request(app).put("/api/admin/cms/images").set(bearer("admin")).set("Content-Type", "application/octet-stream").send(Buffer.from("%PDF-1.7 x"))).status).toBe(415);
      expect((await request(app).put("/api/admin/cms/images").set(bearer("student")).set("Content-Type", "application/octet-stream").send(PNG)).status).toBe(403);
    });

    it("private files are never served by the public image route", async () => {
      const f = await prisma.fileAsset.create({ data: { storageKey: `${crypto.randomUUID()}.png`, filename: "p.png", mimeType: "image/png", sizeBytes: 1, isPublic: false, createdById: ids[0] } });
      expect((await request(app).get(`/api/images/${f.id}.png`)).status).toBe(404);
      expect((await request(app).get(`/api/images/${imageId}.jpg`)).status).toBe(404); // wrong extension
      expect((await request(app).get("/api/images/..%2F..%2Fetc%2Fpasswd")).status).toBe(404);
    });

    it("lists and deletes images", async () => {
      const list = await request(app).get("/api/admin/cms/images").set(bearer("moder"));
      expect(list.body.data.some((i: { id: string }) => i.id === imageId)).toBe(true);
      expect((await request(app).delete(`/api/admin/cms/images/${imageId}`).set(bearer("moder"))).status).toBe(200);
      expect((await request(app).get(imagePath)).status).toBe(404);
    });
  });

  describe("course price, period and section from the course form", () => {
    it("sets, changes and removes the main package price, keeping history and an audit trail", async () => {
      const created = await request(app).post("/api/admin/courses").set(bearer("admin")).send({ title: `C ${run} priced`, description: "d", studyPeriod: "2 oy", section: "COMBINED", price: 1_500_000 });
      expect(created.status).toBe(201);
      const id = created.body.data.id;
      const publicOf = async () => (await request(app).get("/api/courses")).body.data.find((c: { id: string }) => c.id === id);

      expect(await publicOf()).toMatchObject({ studyPeriod: "2 oy", section: "COMBINED", price: { amount: 150_000_000, currency: "UZS", isSample: false } });

      expect((await request(app).put(`/api/admin/courses/${id}`).set(bearer("admin")).send({ price: 1_700_000 })).status).toBe(200);
      expect((await publicOf()).price.amount).toBe(170_000_000);
      const pkg = await prisma.coursePackage.findFirstOrThrow({ where: { courseId: id }, include: { prices: true } });
      expect(pkg.prices).toHaveLength(2); // old price closed, not deleted
      expect(pkg.prices.filter((p) => p.isActive)).toHaveLength(1);

      // Saving other fields without "price" leaves the price alone.
      await request(app).put(`/api/admin/courses/${id}`).set(bearer("admin")).send({ title: `C ${run} priced 2` });
      expect((await publicOf()).price.amount).toBe(170_000_000);

      await request(app).put(`/api/admin/courses/${id}`).set(bearer("admin")).send({ price: null });
      expect((await publicOf()).price).toBeNull();
      expect(await prisma.auditLog.count({ where: { action: "price.set", entityId: pkg.id } })).toBe(3);

      expect((await request(app).put(`/api/admin/courses/${id}`).set(bearer("admin")).send({ price: -5 })).status).toBe(422);
      expect((await request(app).put(`/api/admin/courses/${id}`).set(bearer("moder")).send({ price: 1 })).status).toBe(403);
    });
  });

  describe("course categories", () => {
    let categoryId = "";
    let courseId = "";

    it("catalog managers create a category with translations; moderators cannot", async () => {
      const body = { slug: `${run}-signs`, name: "Yo‘l belgilari", description: "<b>Belgilar</b>", translations: { ru: { name: "Дорожные знаки" } } };
      expect((await request(app).post("/api/admin/categories").set(bearer("moder")).send(body)).status).toBe(403);
      const res = await request(app).post("/api/admin/categories").set(bearer("admin")).send(body);
      expect(res.status).toBe(201);
      expect(res.body.data.description).toBe("Belgilar"); // tags stripped
      categoryId = res.body.data.id;
      expect((await request(app).post("/api/admin/categories").set(bearer("admin")).send(body)).status).toBe(409);
    });

    it("courses are assigned to a category and filtered by its slug, in the visitor's language", async () => {
      const course = await request(app).post("/api/admin/courses").set(bearer("admin")).send({ title: `C ${run}`, description: "d", categoryId });
      expect(course.status).toBe(201);
      courseId = course.body.data.id;
      await prisma.course.create({ data: { title: `C ${run} other`, description: "d" } });

      const filtered = await request(app).get(`/api/courses?category=${run}-signs`).set("Accept-Language", "ru");
      expect(filtered.body.data.map((c: { id: string }) => c.id)).toEqual([courseId]);
      expect(filtered.body.data[0].category.name).toBe("Дорожные знаки");

      const cats = await request(app).get("/api/categories?lang=uz");
      const mine = cats.body.data.find((c: { id: string }) => c.id === categoryId);
      expect(mine).toMatchObject({ name: "Yo‘l belgilari", courseCount: 1 });
      expect(mine).not.toHaveProperty("translations");

      expect((await request(app).get("/api/courses?category=no-such-category")).body.data).toEqual([]);
      expect((await request(app).post("/api/admin/courses").set(bearer("admin")).send({ title: `C ${run} bad`, description: "d", categoryId: crypto.randomUUID() })).status).toBe(400);
    });

    it("inactive categories disappear from the public list", async () => {
      await request(app).put(`/api/admin/categories/${categoryId}`).set(bearer("admin")).send({ isActive: false });
      expect((await request(app).get("/api/categories")).body.data.some((c: { id: string }) => c.id === categoryId)).toBe(false);
      expect((await request(app).get(`/api/courses?category=${run}-signs`)).body.data).toEqual([]);
    });

    it("deleting a category keeps its courses, uncategorised", async () => {
      expect((await request(app).delete(`/api/admin/categories/${categoryId}`).set(bearer("admin"))).status).toBe(200);
      expect((await prisma.course.findUnique({ where: { id: courseId } }))?.categoryId).toBeNull();
    });
  });

  describe("metrics endpoint", () => {
    it("is hidden without the token and serves Prometheus text with it", async () => {
      expect((await request(app).get("/api/metrics")).status).toBe(404);
      expect((await request(app).get("/api/metrics").set("Authorization", "Bearer wrong")).status).toBe(404);
      const res = await request(app).get("/api/metrics").set("Authorization", `Bearer ${METRICS_TOKEN}`);
      expect(res.status).toBe(200);
      expect(res.text).toContain("http_requests_total");
      expect(res.text).toContain("app_database_up 1");
    });

    it("system status reports the new integrations without secrets", async () => {
      const res = await request(app).get("/api/admin/system").set(bearer("admin"));
      expect(res.status).toBe(200);
      const keys = res.body.data.checks.map((c: { key: string }) => c.key);
      expect(keys).toEqual(expect.arrayContaining(["antivirus", "rateLimit", "monitoring", "media"]));
      expect(JSON.stringify(res.body)).not.toContain(METRICS_TOKEN);
      expect(JSON.stringify(res.body)).not.toContain("127.0.0.1");
    });
  });
});
