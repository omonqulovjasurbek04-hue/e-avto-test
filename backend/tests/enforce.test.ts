import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: with ENFORCE_ENROLLMENT=true a test needs the same access as the course content. Needs PostgreSQL.
process.env.ENFORCE_ENROLLMENT = "true";
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `e${Date.now()}`;

describe.skipIf(!enabled)("tests respect course access", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let courseA = "";
  let courseB = "";
  let lessonA = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });
  const start = (k: string, body: object) => request(app).post("/api/tests/start").set(bearer(k)).send(body);

  const signup = async (k: string, role?: "ADMIN") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run}-${k}`, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    tok[k] = res.body.data.token;
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("nobody");
    await signup("ownsA");
    await signup("ownsB");
    await signup("expired");
    await signup("admin", "ADMIN");

    courseA = (await prisma.course.create({ data: { title: `A ${run}`, description: "d" } })).id;
    courseB = (await prisma.course.create({ data: { title: `B ${run}`, description: "d" } })).id;
    lessonA = (await prisma.lesson.create({ data: { courseId: courseA, title: "LA" } })).id;
    for (const [cid, tag] of [[courseA, "A"], [courseB, "B"]] as const) {
      await prisma.question.createMany({ data: Array.from({ length: 3 }, (_, i) => ({ courseId: cid, text: `${run}-${tag}${i}`, options: ["x", "y"], correctIndex: 0 })) });
    }
    await prisma.question.createMany({ data: Array.from({ length: 2 }, (_, i) => ({ courseId: courseA, lessonId: lessonA, text: `${run}-AL${i}`, options: ["x", "y"], correctIndex: 0 })) });
    await prisma.enrollment.create({ data: { userId: uid.ownsA, courseId: courseA } });
    await prisma.enrollment.create({ data: { userId: uid.ownsB, courseId: courseB } });
    await prisma.enrollment.create({ data: { userId: uid.expired, courseId: courseA, expiresAt: new Date(Date.now() - 1000) } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.test.deleteMany({ where: { userId: { in: ids } } });
    await prisma.question.deleteMany({ where: { text: { startsWith: run } } });
    await prisma.course.deleteMany({ where: { id: { in: [courseA, courseB] } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("refuses a course test (and a lesson test) without access", async () => {
    expect((await start("nobody", { courseId: courseA })).status).toBe(403);
    expect((await start("nobody", { lessonId: lessonA })).status).toBe(403);
    expect((await start("ownsB", { courseId: courseA })).status).toBe(403);
    expect((await start("expired", { courseId: courseA })).status).toBe(403);
  });

  it("allows it with an active enrollment, and for staff", async () => {
    expect((await start("ownsA", { courseId: courseA })).status).toBe(201);
    expect((await start("ownsA", { lessonId: lessonA })).status).toBe(201);
    expect((await start("admin", { courseId: courseA })).status).toBe(201);
  });

  it("a mixed test draws only from courses the user may open", async () => {
    const res = await start("ownsB", { count: 50 });
    expect(res.status).toBe(201);
    const texts = (res.body.data.questions as { text: string }[]).map((q) => q.text);
    // Questions that belong to no course are open to everyone; the other course's questions must never appear.
    expect(texts.some((t) => t.startsWith(`${run}-B`))).toBe(true);
    expect(texts.some((t) => t.startsWith(`${run}-A`))).toBe(false);
    const nobody = await start("nobody", { count: 100 });
    expect([201, 400]).toContain(nobody.status);
    if (nobody.status === 201) expect((nobody.body.data.questions as { text: string }[]).some((q) => q.text.startsWith(run))).toBe(false);
  });
});
