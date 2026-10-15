import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Regression tests for the code-review findings. Integration: needs PostgreSQL (TEST_DATABASE_URL).
process.env.ENFORCE_ENROLLMENT = "true";
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `rv${Date.now()}`;

describe.skipIf(!enabled)("code review fixes", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let courseId = "";
  let lessonId = "";
  let draftLessonId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "ADMIN" | "MODERATOR") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run}-${k}`, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    tok[k] = res.body.data.token;
    if (role) await prisma.user.update({ where: { id: uid[k] }, data: { role } });
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("admin", "ADMIN");
    await signup("moderator", "MODERATOR");
    await signup("guestish");
    await signup("owner");
    courseId = (await prisma.course.create({ data: { title: `RV ${run}`, description: "d" } })).id;
    lessonId = (await prisma.lesson.create({ data: { courseId, title: "Paid", videoUrl: "https://cdn.example.com/paid.mp4" } })).id;
    draftLessonId = (await prisma.lesson.create({ data: { courseId, title: "Draft", isPublished: false } })).id;
    await prisma.question.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({ courseId, lessonId, text: `${run} q${i}`, options: ["A", "B", "C", "D"], correctIndex: 0 })),
    });
    await prisma.enrollment.create({ data: { userId: uid.owner, courseId } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.test.deleteMany({ where: { userId: { in: ids } } });
    await prisma.question.deleteMany({ where: { text: { startsWith: run } } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("the public course endpoints no longer leak paid video links", async () => {
    for (const path of [`/api/courses/${courseId}`, `/api/courses/${courseId}/lessons`]) {
      const anon = await request(app).get(path);
      const lessons = (anon.body.data.lessons ?? anon.body.data) as { locked: boolean }[];
      expect(JSON.stringify(lessons)).not.toContain("paid.mp4");
      expect(lessons.every((l) => l.locked)).toBe(true);
      const mine = await request(app).get(path).set(bearer("owner"));
      expect(JSON.stringify(mine.body.data)).toContain("paid.mp4");
    }
  });

  it("progress cannot be recorded on a locked or unpublished lesson, and drafts do not count", async () => {
    expect((await request(app).put(`/api/progress/${lessonId}`).set(bearer("guestish")).send({ percent: 100 })).status).toBe(403);
    expect((await request(app).put(`/api/progress/${draftLessonId}`).set(bearer("owner")).send({ percent: 100 })).status).toBe(404);
    expect((await request(app).put(`/api/progress/${lessonId}`).set(bearer("owner")).send({ percent: 100 })).status).toBe(200);
    // The only published lesson is done, so the course is 100% even though a draft lesson exists.
    const p = await prisma.progress.findUniqueOrThrow({ where: { userId_courseId: { userId: uid.owner, courseId } } });
    expect(p.percent).toBe(100);
  });

  it("exam rules and the attempt limit also apply when the test is started from a lesson", async () => {
    await prisma.testConfig.create({ data: { courseId, questionCount: 2, durationSeconds: 300, passScore: 70, maxAttempts: 1 } });
    const first = await request(app).post("/api/tests/start").set(bearer("owner")).send({ lessonId, count: 50 });
    expect(first.status).toBe(201);
    expect(first.body.data.test.totalQuestions).toBe(2);
    expect(first.body.data.test.duration).toBe(300);
    expect((await prisma.test.findUniqueOrThrow({ where: { id: first.body.data.test.id } })).courseId).toBe(courseId);
    expect((await request(app).post("/api/tests/start").set(bearer("owner")).send({ lessonId })).status).toBe(409);
    await prisma.testConfig.delete({ where: { courseId } });
    await prisma.test.deleteMany({ where: { userId: uid.owner } });
  });

  it("the time limit follows the number of questions actually served", async () => {
    const res = await request(app).post("/api/tests/start").set(bearer("owner")).send({ courseId, count: 100 });
    expect(res.body.data.test.totalQuestions).toBe(3);
    expect(res.body.data.test.duration).toBe(20 * 60);
  });

  it("answers racing with finish never change a graded attempt", async () => {
    const start = await request(app).post("/api/tests/start").set(bearer("owner")).send({ courseId });
    const testId = start.body.data.test.id as string;
    const qs = start.body.data.questions as { id: string }[];
    const answers = qs.map((q) => request(app).post(`/api/tests/${testId}/answer`).set(bearer("owner")).send({ questionId: q.id, selectedIndex: 1 }));
    const finishes = [0, 1, 2].map(() => request(app).post(`/api/tests/${testId}/finish`).set(bearer("owner")).send({}));
    await Promise.all([...answers, ...finishes]);
    const test = await prisma.test.findUniqueOrThrow({ where: { id: testId } });
    const rows = await prisma.userAnswer.findMany({ where: { testId } });
    expect(test.finishedAt).not.toBeNull();
    expect(rows.filter((r) => r.selectedIndex >= 0 && r.isCorrect).length).toBe(test.correctAnswers);
    expect(rows.filter((r) => r.selectedIndex >= 0 && !r.isCorrect).length).toBe(test.wrongAnswers);
    expect(await prisma.notification.count({ where: { userId: uid.owner, dedupeKey: `test:${testId}` } })).toBe(1);
  });

  it("a question already used in tests cannot change its number of options", async () => {
    const q = await prisma.question.findFirstOrThrow({ where: { text: `${run} q0` } });
    const shrink = await request(app).put(`/api/admin/questions/${q.id}`).set(bearer("admin")).send({ options: ["A", "B", "C"], correctIndex: 0 });
    expect(shrink.status).toBe(409);
    const reword = await request(app).put(`/api/admin/questions/${q.id}`).set(bearer("admin")).send({ options: ["A1", "B1", "C1", "D1"], correctIndex: 0 });
    expect(reword.status).toBe(200);
  });

  it("a moderator can edit questions and read the course list, but not change courses or users", async () => {
    const q = await prisma.question.findFirstOrThrow({ where: { text: `${run} q1` } });
    expect((await request(app).put(`/api/admin/questions/${q.id}`).set(bearer("moderator")).send({ explanation: "Tuzatildi" })).status).toBe(200);
    expect((await request(app).get("/api/admin/questions").set(bearer("moderator"))).status).toBe(200);
    expect((await request(app).get("/api/admin/courses").set(bearer("moderator"))).status).toBe(200);
    expect((await request(app).post("/api/admin/courses").set(bearer("moderator")).send({ title: "x", description: "y" })).status).toBe(403);
    expect((await request(app).get("/api/admin/users").set(bearer("moderator"))).status).toBe(403);
    expect((await request(app).get("/api/admin/statistics").set(bearer("moderator"))).status).toBe(403);
  });

  it("an admin cannot make anyone FINANCE", async () => {
    expect((await request(app).patch(`/api/admin/users/${uid.guestish}/role`).set(bearer("admin")).send({ role: "FINANCE" })).status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: uid.guestish } })).role).toBe("USER");
  });

  it("a reset token works once even under parallel use, and other open tokens die with it", async () => {
    const token = crypto.randomBytes(32).toString("hex");
    const other = crypto.randomBytes(32).toString("hex");
    const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
    const expiresAt = new Date(Date.now() + 600_000);
    await prisma.passwordReset.create({ data: { userId: uid.guestish, tokenHash: hash(token), expiresAt } });
    await prisma.passwordReset.create({ data: { userId: uid.guestish, tokenHash: hash(other), expiresAt } });

    const results = await Promise.all(
      ["NewPassw0rd1", "NewPassw0rd2", "NewPassw0rd3"].map((password) => request(app).post("/api/auth/reset-password").send({ token, password }))
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await request(app).post("/api/auth/reset-password").send({ token: other, password: "NewPassw0rd4" })).status).toBe(400);
  });
});
