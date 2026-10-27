import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: "readiness for the state exam" in GET /api/statistics. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `rd${Date.now()}`;

describe.skipIf(!enabled)("exam readiness", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let userId = "";
  let token = "";
  let courseId = "";

  const stats = async () => (await request(app).get("/api/statistics").set({ Authorization: `Bearer ${token}` })).body.data.readiness;
  const finished = (score: number, mode: "EXAM" | "MISTAKES" = "EXAM", minutesAgo = 1) =>
    prisma.test.create({ data: { userId, courseId, score, passed: score >= 70, mode, finishedAt: new Date(Date.now() - minutesAgo * 60_000) } });

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    const res = await request(app).post("/api/auth/register").send({ name: "Ready student", email: `${run}@example.com`, password: "Passw0rdOK" });
    userId = res.body.data.user.id;
    token = res.body.data.token;
    courseId = (await prisma.course.create({ data: { title: `Readiness ${run}`, description: "d" } })).id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("is 0 before anything is bought or done", async () => {
    expect(await stats()).toMatchObject({ percent: 0, level: "notYet", lessons: { completed: 0, total: 0 }, recentTests: 0, courses: [] });
  });

  it("weighs completed lessons, the recent exam average and how many passed", async () => {
    await prisma.enrollment.create({ data: { userId, courseId } });
    const lessons = await Promise.all(Array.from({ length: 10 }, (_, i) => prisma.lesson.create({ data: { courseId, title: `L${i}` } })));
    await prisma.lessonProgress.createMany({ data: lessons.slice(0, 5).map((l) => ({ userId, lessonId: l.id, completed: true, percent: 100 })) });
    await finished(90, "EXAM", 2);
    await finished(80, "EXAM", 1);
    await finished(0, "MISTAKES"); // practice does not count

    const r = await stats();
    expect(r.lessons).toEqual({ completed: 5, total: 10, percent: 50 });
    expect(r).toMatchObject({ recentTests: 2, recentAverage: 85, recentPassRate: 100 });
    // 0.4 * 50 + 0.4 * 85 + 0.2 * 100
    expect(r.percent).toBe(74);
    expect(r.level).toBe("almost");
    expect(r.courses).toEqual([{ title: `Readiness ${run}`, category: null }]);
  });

  it("follows only the latest five exams and reaches 'ready'", async () => {
    const lessons = await prisma.lesson.findMany({ where: { courseId } });
    await prisma.lessonProgress.createMany({ data: lessons.map((l) => ({ userId, lessonId: l.id, completed: true, percent: 100 })), skipDuplicates: true });
    await prisma.lessonProgress.updateMany({ where: { userId }, data: { completed: true } });
    for (let i = 0; i < 5; i++) await finished(95);
    const r = await stats();
    expect(r).toMatchObject({ recentTests: 5, recentAverage: 95, recentPassRate: 100, level: "ready" });
    expect(r.percent).toBe(98);
  });
});
