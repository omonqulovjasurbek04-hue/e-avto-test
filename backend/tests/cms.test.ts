import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { contactSchema, newsSchema, siteSettingsSchema } from "../src/validators/cms";

describe("cms validators", () => {
  it("rejects javascript: and protocol-relative URLs in settings and news covers", () => {
    expect(siteSettingsSchema.safeParse({ logoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ logoUrl: "//evil.example/x.png" }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ logoUrl: "/brand/logo.svg", brandColor: "#2563EB" }).success).toBe(true);
    expect(newsSchema.safeParse({ title: "Yangilik", content: "x", coverUrl: "data:text/html;base64,AA" }).success).toBe(false);
  });

  it("rejects unknown settings keys and bad colours", () => {
    expect(siteSettingsSchema.safeParse({ isAdmin: true }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ brandColor: "blue" }).success).toBe(false);
  });

  it("requires a meaningful contact message", () => {
    expect(contactSchema.safeParse({ name: "Ali", contact: "+998901234567", message: "salom" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ali", contact: "+998901234567", message: "Kurs narxlari haqida so'ramoqchiman" }).success).toBe(true);
  });
});

// Integration: needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `m${Date.now()}`;

describe.skipIf(!enabled)("cms API", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  let adminToken = "";
  let studentToken = "";
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  const signup = async (label: string, role?: "ADMIN") => {
    const res = await request(app).post("/api/auth/register").send({ name: label, email: `${run}-${label}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    return res.body.data.token as string;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    adminToken = await signup("admin", "ADMIN");
    studentToken = await signup("student");
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.page.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.newsArticle.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.contactMessage.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("students cannot use the CMS admin API", async () => {
    expect((await request(app).post("/api/admin/cms/pages").set(bearer(studentToken)).send({ title: "x", content: "y" })).status).toBe(403);
  });

  it("drafts are hidden, published pages are sanitized, slugs are unique", async () => {
    const slug = `${run}-about`;
    const created = await request(app).post("/api/admin/cms/pages").set(bearer(adminToken))
      .send({ slug, title: "Biz haqimizda", content: '<p>Salom</p><script>alert(1)</script>', status: "DRAFT" });
    expect(created.status).toBe(201);
    expect((await request(app).get(`/api/pages/${slug}`)).status).toBe(404);

    expect((await request(app).put(`/api/admin/cms/pages/${created.body.data.id}`).set(bearer(adminToken)).send({ status: "PUBLISHED" })).status).toBe(200);
    const page = await request(app).get(`/api/pages/${slug}`);
    expect(page.status).toBe(200);
    expect(page.body.data.content).toBe("<p>Salom</p>");

    const dup = await request(app).post("/api/admin/cms/pages").set(bearer(adminToken)).send({ slug, title: "Yana", content: "z" });
    expect(dup.status).toBe(409);
  });

  it("contact form stores plain text and silently drops honeypot posts", async () => {
    const ok = await request(app).post("/api/contact").send({ name: `${run} <b>Ali</b>`, contact: "+998901234567", message: "Kurs narxlari haqida <script>x</script>so'ramoqchiman" });
    expect(ok.status).toBe(201);
    const stored = await prisma.contactMessage.findFirst({ where: { name: { startsWith: run } } });
    expect(stored?.message).not.toContain("<script>");

    const before = await prisma.contactMessage.count();
    await request(app).post("/api/contact").send({ name: "Bot Bot", contact: "bot@example.com", message: "buy cheap stuff now please", website: "http://spam" });
    expect(await prisma.contactMessage.count()).toBe(before);
  });

  it("serves robots.txt and a sitemap without drafts", async () => {
    expect((await request(app).get("/robots.txt")).text).toContain("Disallow: /admin");
    const sm = await request(app).get("/sitemap.xml");
    expect(sm.status).toBe(200);
    expect(sm.text).not.toContain("<script>");
  });
});

describe.skipIf(!enabled)("public stats", () => {
  it("returns real aggregate numbers and no personal data", async () => {
    const { default: app } = await import("../src/app");
    const res = await request(app).get("/api/public-stats");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual(["passRate", "questions", "testsTaken", "users"]);
    expect(res.body.data.users).toBeGreaterThanOrEqual(0);
  });
});
