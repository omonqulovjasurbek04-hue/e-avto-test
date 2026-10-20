import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";

// Integration: "max mistakes" exam rule, practice on own mistakes and on saved questions. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `p${Date.now()}`;

type Served = { id: string; options: string[] };

describe.skipIf(!enabled)("practice modes", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let courseId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "ADMIN") => {
    const res = await request(app).post("/api/auth/register").send({ name: k, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    tok[k] = res.body.data.token;
  };

  // Every seeded question has "OK" as its correct option; the served order is shuffled.
  const answer = (q: Served, correct: boolean) => ({ questionId: q.id, selectedIndex: q.options.findIndex((o) => (o === "OK") === correct) });

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("admin", "ADMIN");
    await signup("student");
    courseId = (await prisma.course.create({ data: { title: `Practice ${run}`, description: "d" } })).id;
    await prisma.question.createMany({ data: Array.from({ length: 4 }, (_, i) => ({ courseId, text: `${run} q${i}`, options: ["OK", "No", "Never"], correctIndex: 0 })) });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.test.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.question.deleteMany({ where: { text: { startsWith: run } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("fails an exam with too many mistakes even when the percentage is enough", async () => {
    const save = await request(app).put(`/api/admin/exam/courses/${courseId}/config`).set(bearer("admin"))
      .send({ questionCount: 4, passScore: 50, maxAttempts: 1, maxMistakes: 1 });
    expect(save.status).toBe(200);
    expect(save.body.data.maxMistakes).toBe(1);

    const start = await request(app).post("/api/tests/start").set(bearer("student")).send({ courseId });
    expect(start.status).toBe(201);
    expect(start.body.data.test.mode).toBe("EXAM");
    expect(start.body.data.test.maxMistakes).toBe(1);
    const qs: Served[] = start.body.data.questions;

    const finish = await request(app).post(`/api/tests/${start.body.data.test.id}/finish`).set(bearer("student"))
      .send({ answers: qs.map((q, i) => answer(q, i < 2)) });
    expect(finish.status).toBe(200);
    expect(finish.body.data.score).toBe(50);
    expect(finish.body.data.passed).toBe(false);
  });

  it("practises own mistakes until they are fixed, without using exam attempts", async () => {
    const summary = await request(app).get("/api/me/practice").set(bearer("student"));
    expect(summary.status).toBe(200);
    expect(summary.body.data.mistakes).toBe(2);

    // The exam limit (1) is used up, practice still starts and ignores the exam rules.
    const start = await request(app).post("/api/tests/start").set(bearer("student")).send({ courseId, mode: "MISTAKES" });
    expect(start.status).toBe(201);
    expect(start.body.data.test.mode).toBe("MISTAKES");
    expect(start.body.data.test.totalQuestions).toBe(2);
    const qs: Served[] = start.body.data.questions;

    const finish = await request(app).post(`/api/tests/${start.body.data.test.id}/finish`).set(bearer("student"))
      .send({ answers: qs.map((q) => answer(q, true)) });
    expect(finish.body.data.passed).toBe(true);
    expect(finish.body.data.mode).toBe("MISTAKES");

    expect((await request(app).get("/api/me/practice").set(bearer("student"))).body.data.mistakes).toBe(0);
    expect((await request(app).post("/api/tests/start").set(bearer("student")).send({ courseId, mode: "MISTAKES" })).status).toBe(400);
    expect((await request(app).post("/api/tests/start").set(bearer("student")).send({ courseId })).status).toBe(409);
  });

  it("saves questions and builds a practice test from them", async () => {
    const question = await prisma.question.findFirstOrThrow({ where: { courseId } });
    expect((await request(app).put(`/api/me/saved-questions/${randomUUID()}`).set(bearer("student"))).status).toBe(404);
    expect((await request(app).put(`/api/me/saved-questions/${question.id}`).set(bearer("student"))).status).toBe(200);
    // Saving twice is harmless.
    expect((await request(app).put(`/api/me/saved-questions/${question.id}`).set(bearer("student"))).status).toBe(200);

    const summary = await request(app).get("/api/me/practice").set(bearer("student"));
    expect(summary.body.data.saved).toBe(1);
    expect(summary.body.data.savedIds).toEqual([question.id]);

    const start = await request(app).post("/api/tests/start").set(bearer("student")).send({ mode: "SAVED" });
    expect(start.status).toBe(201);
    expect(start.body.data.questions.map((q: Served) => q.id)).toEqual([question.id]);

    expect((await request(app).delete(`/api/me/saved-questions/${question.id}`).set(bearer("student"))).status).toBe(200);
    expect((await request(app).get("/api/me/practice").set(bearer("student"))).body.data.saved).toBe(0);
    expect((await request(app).post("/api/tests/start").set(bearer("student")).send({ mode: "SAVED" })).status).toBe(400);
  });

  it("needs a login", async () => {
    expect((await request(app).get("/api/me/practice")).status).toBe(401);
  });
});
