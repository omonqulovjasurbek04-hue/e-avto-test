import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: exam rules, question import/export, drafts and audit trail. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `x${Date.now()}`;

const q = (text: string, extra: Record<string, unknown> = {}) => ({ text, options: ["A", "B", "C"], correctIndex: 1, ...extra });

describe.skipIf(!enabled)("exam module", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let courseId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "ADMIN" | "MODERATOR") => {
    const res = await request(app).post("/api/auth/register").send({ name: k, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    tok[k] = res.body.data.token;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("admin", "ADMIN");
    await signup("moderator", "MODERATOR");
    await signup("student");
    courseId = (await prisma.course.create({ data: { title: `Exam ${run}`, description: "d" } })).id;
    await prisma.question.createMany({ data: Array.from({ length: 6 }, (_, i) => ({ courseId, text: `${run} q${i}`, options: ["A", "B", "C"], correctIndex: 0 })) });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.test.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.question.deleteMany({ where: { text: { startsWith: run } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("students cannot touch exam settings or imports; moderators can", async () => {
    expect((await request(app).put(`/api/admin/exam/courses/${courseId}/config`).set(bearer("student")).send({ questionCount: 5, passScore: 60 })).status).toBe(403);
    expect((await request(app).post("/api/admin/exam/questions/import").set(bearer("student")).send({ questions: [] })).status).toBe(403);
    expect((await request(app).get(`/api/admin/exam/courses/${courseId}/config`).set(bearer("moderator"))).status).toBe(200);
  });

  it("applies the course config: question count, duration, pass mark and attempt limit", async () => {
    const save = await request(app).put(`/api/admin/exam/courses/${courseId}/config`).set(bearer("admin")).send({ questionCount: 4, durationSeconds: 600, passScore: 100, maxAttempts: 2 });
    expect(save.status).toBe(200);

    // The client asks for 50 questions; the course rule wins.
    const start = await request(app).post("/api/tests/start").set(bearer("student")).send({ courseId, count: 50 });
    expect(start.status).toBe(201);
    expect(start.body.data.test.totalQuestions).toBe(4);
    expect(start.body.data.test.duration).toBe(600);

    // Pass mark 100% -> answering nothing fails.
    const finish = await request(app).post(`/api/tests/${start.body.data.test.id}/finish`).set(bearer("student")).send({});
    expect(finish.status).toBe(200);
    expect(finish.body.data.passed ?? finish.body.data.test?.passed).toBe(false);

    expect((await request(app).post("/api/tests/start").set(bearer("student")).send({ courseId })).status).toBe(201);
    const third = await request(app).post("/api/tests/start").set(bearer("student")).send({ courseId });
    expect(third.status).toBe(409);
  });

  it("imports valid files all-or-nothing, as drafts, and reports bad rows", async () => {
    const bad = await request(app).post("/api/admin/exam/questions/import").set(bearer("admin")).send({
      questions: [q(`${run} ok1`, { courseId }), q(`${run} bad`, { correctIndex: 9 })],
    });
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0].row).toBe(2);
    expect(await prisma.question.count({ where: { text: { startsWith: `${run} ok1` } } })).toBe(0);

    const ok = await request(app).post("/api/admin/exam/questions/import").set(bearer("admin")).send({
      questions: [q(`${run} imp1 <script>x</script>`, { courseId }), q(`${run} imp2`, { courseId })],
    });
    expect(ok.status).toBe(201);
    expect(ok.body.data.imported).toBe(2);
    const stored = await prisma.question.findFirstOrThrow({ where: { text: { startsWith: `${run} imp1` } } });
    expect(stored.isPublished).toBe(false);
    expect(stored.text).not.toContain("<script>");
  });

  it("draft questions never reach a test", async () => {
    const other = (await prisma.course.create({ data: { title: `Drafts ${run}`, description: "d" } })).id;
    await prisma.question.create({ data: { courseId: other, text: `${run} draft`, options: ["A", "B"], correctIndex: 0, isPublished: false } });
    const res = await request(app).post("/api/tests/start").set(bearer("student")).send({ courseId: other });
    expect(res.status).toBe(400);
    await prisma.course.delete({ where: { id: other } });
  });

  it("exports the bank and keeps an edit history", async () => {
    const exp = await request(app).get(`/api/admin/exam/questions/export?courseId=${courseId}`).set(bearer("admin"));
    expect(exp.status).toBe(200);
    expect(exp.body.data.questions.length).toBeGreaterThanOrEqual(6);

    const created = await request(app).post("/api/admin/questions").set(bearer("admin")).send(q(`${run} hist`, { courseId }));
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect((await request(app).put(`/api/admin/questions/${id}`).set(bearer("admin")).send({ correctIndex: 2 })).status).toBe(200);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "question.update", entityId: id } });
    expect((log.before as { correctIndex: number }).correctIndex).toBe(1);
    expect((log.after as { correctIndex: number }).correctIndex).toBe(2);
  });
});
