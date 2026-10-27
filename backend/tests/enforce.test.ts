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

  const signup = async (k: string, role?: "ADMIN" | "TEACHER") => {
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
    await signup("teacher", "TEACHER");

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

  it("opens every course, lesson and test to a teacher without buying", async () => {
    // The token was issued before the role change: sign in again so it carries TEACHER.
    const login = await request(app).post("/api/auth/login").send({ email: `${run}-teacher@example.com`, password: "Passw0rdOK" });
    tok.teacher = login.body.data.token;
    expect((await start("teacher", { courseId: courseA })).status).toBe(201);
    expect((await start("teacher", { courseId: courseB })).status).toBe(201);
    expect((await start("teacher", { courseId: courseA, lessonId: lessonA })).status).toBe(201);
    const access = await request(app).get("/api/me/course-access").set(bearer("teacher"));
    expect(access.body.data.all).toBe(true);
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
    // count = the maximum, so the draw covers the whole (small) pool and course B's questions must be in it.
    const res = await start("ownsB", { count: 100 });
    expect(res.status).toBe(201);
    const texts = (res.body.data.questions as { text: string }[]).map((q) => q.text);
    // Questions that belong to no course are open to everyone; the other course's questions must never appear.
    expect(texts.some((t) => t.startsWith(`${run}-B`))).toBe(true);
    expect(texts.some((t) => t.startsWith(`${run}-A`))).toBe(false);
    // Without any purchased course there is no test at all, not even a mixed one.
    expect((await start("nobody", { count: 100 })).status).toBe(403);
    expect((await start("expired", { count: 100 })).status).toBe(403);
  });

  it("tells the student which courses they can open", async () => {
    const access = (k: string) => request(app).get("/api/me/course-access").set(bearer(k));
    expect((await access("nobody")).body.data).toEqual({ all: false, courseIds: [] });
    expect((await access("expired")).body.data).toEqual({ all: false, courseIds: [] });
    expect((await access("ownsA")).body.data).toEqual({ all: false, courseIds: [courseA] });
    expect((await access("admin")).body.data).toEqual({ all: true, courseIds: [] });
    expect((await request(app).get("/api/me/course-access")).status).toBe(401);
  });

  it("deleting a course does not drop its questions into the open pool", async () => {
    const courseC = (await prisma.course.create({ data: { title: `C ${run}`, description: "d" } })).id;
    const lessonC = (await prisma.lesson.create({ data: { courseId: courseC, title: "LC" } })).id;
    await prisma.question.createMany({
      data: [
        { courseId: courseC, text: `${run}-C0`, options: ["x", "y"], correctIndex: 0 },
        { courseId: null, lessonId: lessonC, text: `${run}-CL0`, options: ["x", "y"], correctIndex: 0 },
      ],
    });
    const del = await request(app).delete(`/api/admin/courses/${courseC}`).set(bearer("admin"));
    expect(del.status).toBe(200);
    const left = await prisma.question.findMany({ where: { text: { startsWith: `${run}-C` } } });
    expect(left).toHaveLength(2);
    expect(left.every((q) => q.courseId === null && q.lessonId === null && !q.isPublished)).toBe(true);
    const res = await start("nobody", { count: 100 });
    if (res.status === 201) expect((res.body.data.questions as { text: string }[]).some((q) => q.text.startsWith(`${run}-C`))).toBe(false);
  });
});
