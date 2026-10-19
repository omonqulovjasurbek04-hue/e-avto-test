import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Integration tests: need a real PostgreSQL (TEST_DATABASE_URL) with the migrations applied.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `t${Date.now()}`;

interface Ctx {
  app: import("express").Application;
  prisma: typeof import("../src/config/database").prisma;
  telegram: typeof import("../src/services/telegram.service");
  cleanup: typeof import("../src/services/cleanup.service");
}

describe.skipIf(!enabled)("E-Avto API", () => {
  let c: Ctx;
  const ids = { users: [] as string[], courses: [] as string[] };
  const PASSWORD = "Passw0rdOK";

  const api = () => request(c.app);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function register(label: string) {
    const res = await api()
      .post("/api/auth/register")
      .send({ name: `User ${label}`, email: `${run}-${label}@example.com`, password: PASSWORD });
    expect(res.status).toBe(201);
    ids.users.push(res.body.data.user.id);
    return { token: res.body.data.token as string, id: res.body.data.user.id as string, email: `${run}-${label}@example.com` };
  }

  beforeAll(async () => {
    const [{ default: app }, { prisma }, telegram, cleanup] = await Promise.all([
      import("../src/app"),
      import("../src/config/database"),
      import("../src/services/telegram.service"),
      import("../src/services/cleanup.service"),
    ]);
    c = { app, prisma, telegram, cleanup };
  });

  afterAll(async () => {
    if (!c) return;
    await c.prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await c.prisma.telegramLogin.deleteMany({});
    // Questions are kept (SetNull) when a course goes; remove them so they do not pile up as course-less questions.
    await c.prisma.question.deleteMany({ where: { OR: [{ courseId: { in: ids.courses } }, { lesson: { courseId: { in: ids.courses } } }] } });
    await c.prisma.course.deleteMany({ where: { id: { in: ids.courses } } });
    await c.prisma.$disconnect();
  });

  describe("auth", () => {
    it("rejects weak passwords and bad input with 422", async () => {
      const res = await api().post("/api/auth/register").send({ name: "A", email: "x", password: "1" });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("registers, blocks duplicates, logs in and never lets a client choose the role", async () => {
      const res = await api()
        .post("/api/auth/register")
        .send({ name: "Sneaky", email: `${run}-sneaky@example.com`, password: PASSWORD, role: "ADMIN" });
      expect(res.status).toBe(201);
      ids.users.push(res.body.data.user.id);
      expect(res.body.data.user.role).toBe("USER");
      expect(res.body.data.user).not.toHaveProperty("passwordHash");

      const dup = await api()
        .post("/api/auth/register")
        .send({ name: "Sneaky", email: `${run}-sneaky@example.com`, password: PASSWORD });
      expect(dup.status).toBe(409);

      const bad = await api().post("/api/auth/login").send({ email: `${run}-sneaky@example.com`, password: "wrong-pass1" });
      expect(bad.status).toBe(401);
      const unknown = await api().post("/api/auth/login").send({ email: `${run}-nobody@example.com`, password: PASSWORD });
      expect(unknown.status).toBe(401);
      expect(unknown.body.message).toBe(bad.body.message);

      const ok = await api().post("/api/auth/login").send({ email: `${run}-sneaky@example.com`, password: PASSWORD });
      expect(ok.status).toBe(200);
      const me = await api().get("/api/auth/me").set(auth(ok.body.data.token));
      expect(me.body.data.email).toBe(`${run}-sneaky@example.com`);
    });

    it("requires a valid token", async () => {
      expect((await api().get("/api/auth/me")).status).toBe(401);
      expect((await api().get("/api/auth/me").set(auth("garbage"))).status).toBe(401);
    });

    it("revokes old tokens after a password change", async () => {
      const u = await register("pwchange");
      const res = await api()
        .put("/api/auth/password")
        .set(auth(u.token))
        .send({ currentPassword: PASSWORD, newPassword: "NewPassw0rd2" });
      expect(res.status).toBe(200);
      expect((await api().get("/api/auth/me").set(auth(u.token))).status).toBe(401);
      expect((await api().get("/api/auth/me").set(auth(res.body.data.token))).status).toBe(200);
    });

    it("logout-everywhere invalidates tokens", async () => {
      const u = await register("logoutall");
      expect((await api().post("/api/auth/logout-all").set(auth(u.token))).status).toBe(200);
      expect((await api().get("/api/auth/me").set(auth(u.token))).status).toBe(401);
    });

    it("password reset: token is single use, unknown emails look the same", async () => {
      const u = await register("reset");
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      const unknown = await api().post("/api/auth/forgot-password").send({ email: `${run}-ghost@example.com` });
      const known = await api().post("/api/auth/forgot-password").send({ email: u.email });
      expect(unknown.body).toEqual(known.body);
      const line = log.mock.calls.map((a) => String(a[0])).find((l) => l.includes(u.email));
      log.mockRestore();
      const token = line?.split("token=")[1];
      expect(token).toBeTruthy();

      const bad = await api().post("/api/auth/reset-password").send({ token: "x".repeat(64), password: "BrandNew123" });
      expect(bad.status).toBe(400);
      const good = await api().post("/api/auth/reset-password").send({ token, password: "BrandNew123" });
      expect(good.status).toBe(200);
      const again = await api().post("/api/auth/reset-password").send({ token, password: "Another1234" });
      expect(again.status).toBe(400);
      expect((await api().get("/api/auth/me").set(auth(u.token))).status).toBe(401);
      const login = await api().post("/api/auth/login").send({ email: u.email, password: "BrandNew123" });
      expect(login.status).toBe(200);
    });
  });

  describe("admin + test flow", () => {
    let admin: { token: string; id: string };
    let student: { token: string; id: string };
    let other: { token: string; id: string };
    let courseId: string;
    let testId: string;

    it("keeps admin endpoints away from normal users and lets real admins in", async () => {
      student = await register("student");
      other = await register("other");
      const a = await register("admin");
      expect((await api().get("/api/admin/statistics").set(auth(a.token))).status).toBe(403);
      await c.prisma.user.update({ where: { id: a.id }, data: { role: "ADMIN" } });
      admin = a;
      expect((await api().get("/api/admin/statistics").set(auth(a.token))).status).toBe(200);
      expect((await api().get("/api/admin/statistics")).status).toBe(401);
    });

    it("admins cannot change their own role or status", async () => {
      const r = await api().patch(`/api/admin/users/${admin.id}/role`).set(auth(admin.token)).send({ role: "USER" });
      expect(r.status).toBe(400);
      const s = await api().patch(`/api/admin/users/${admin.id}/status`).set(auth(admin.token)).send({ isActive: false });
      expect(s.status).toBe(400);
    });

    it("creates content and validates questions", async () => {
      const course = await api()
        .post("/api/admin/courses")
        .set(auth(admin.token))
        .send({ title: `Course ${run}`, description: "Test course" });
      expect(course.status).toBe(201);
      courseId = course.body.data.id;
      ids.courses.push(courseId);

      const lesson = await api()
        .post("/api/admin/lessons")
        .set(auth(admin.token))
        .send({ courseId, title: "Lesson 1", videoUrl: "https://cdn.example.com/v.mp4", duration: 120 });
      expect(lesson.status).toBe(201);

      const invalid = await api()
        .post("/api/admin/questions")
        .set(auth(admin.token))
        .send({ courseId, text: "Q?", options: ["a", "b"], correctIndex: 5 });
      expect(invalid.status).toBe(422);

      for (let i = 1; i <= 4; i++) {
        const q = await api()
          .post("/api/admin/questions")
          .set(auth(admin.token))
          .send({
            courseId,
            text: `Question ${i}`,
            options: ["right", "wrong 1", "wrong 2", "wrong 3"],
            correctIndex: 0,
            explanation: `Because ${i}`,
          });
        expect(q.status).toBe(201);
      }

      const patch = await api()
        .put(`/api/admin/questions/${(await c.prisma.question.findFirst({ where: { courseId } }))!.id}`)
        .set(auth(admin.token))
        .send({ correctIndex: 9 });
      expect(patch.status).toBe(400);
    });

    it("public APIs only show published content and never leak explanations", async () => {
      await c.prisma.course.update({ where: { id: courseId }, data: { isPublished: false } });
      let list = await api().get("/api/courses");
      expect(list.body.data.some((x: { id: string }) => x.id === courseId)).toBe(false);
      expect((await api().get(`/api/courses/${courseId}`)).status).toBe(404);
      await c.prisma.course.update({ where: { id: courseId }, data: { isPublished: true } });

      list = await api().get("/api/courses");
      expect(list.body.data.some((x: { id: string }) => x.id === courseId)).toBe(true);
      const lessons = await api().get(`/api/courses/${courseId}/lessons`);
      expect(lessons.body.data).toHaveLength(1);
      const lesson = await api().get(`/api/lessons/${lessons.body.data[0].id}`);
      expect(lesson.status).toBe(200);
      expect(JSON.stringify(lesson.body)).not.toMatch(/explanation|correctIndex|Because/);
    });

    it("starts a test without exposing the answer key", async () => {
      const res = await api().post("/api/tests/start").set(auth(student.token)).send({ courseId, count: 4 });
      expect(res.status).toBe(201);
      testId = res.body.data.test.id;
      expect(res.body.data.test.duration).toBe(20 * 60);
      expect(res.body.data.questions).toHaveLength(4);
      expect(JSON.stringify(res.body)).not.toMatch(/correctIndex|explanation|Because/);
      for (const q of res.body.data.questions) {
        expect([...q.options].sort()).toEqual(["right", "wrong 1", "wrong 2", "wrong 3"]);
      }
      (globalThis as Record<string, unknown>).__questions = res.body.data.questions;
    });

    it("blocks reviewing, answering and finishing someone else's or unfinished tests", async () => {
      expect((await api().get(`/api/results/${testId}`).set(auth(student.token))).status).toBe(409);
      expect((await api().get(`/api/results/${testId}`).set(auth(other.token))).status).toBe(403);
      const q = (globalThis as Record<string, { id: string }[]>).__questions[0];
      expect(
        (await api().post(`/api/tests/${testId}/answer`).set(auth(other.token)).send({ questionId: q.id, selectedIndex: 0 })).status
      ).toBe(403);
      expect((await api().post(`/api/tests/${testId}/finish`).set(auth(other.token)).send({})).status).toBe(403);
      expect(
        (await api().post(`/api/tests/${testId}/answer`).set(auth(student.token)).send({ questionId: q.id, selectedIndex: 99 })).status
      ).toBe(422);
    });

    it("grades on the server, handles skipped answers, and is idempotent", async () => {
      const questions = (globalThis as Record<string, { id: string; options: string[] }[]>).__questions;
      // 2 right, 1 wrong, 1 skipped -> 50%
      const pick = (q: { options: string[] }, wantRight: boolean) =>
        q.options.findIndex((o) => (o === "right") === wantRight);
      const answers = [
        { questionId: questions[0].id, selectedIndex: pick(questions[0], true) },
        { questionId: questions[1].id, selectedIndex: pick(questions[1], true) },
        { questionId: questions[2].id, selectedIndex: pick(questions[2], false) },
      ];

      const fin = await api().post(`/api/tests/${testId}/finish`).set(auth(student.token)).send({ answers });
      expect(fin.status).toBe(200);
      expect(fin.body.data).toMatchObject({
        totalQuestions: 4,
        correctAnswers: 2,
        wrongAnswers: 1,
        skippedAnswers: 1,
        score: 50,
        passed: false,
      });

      const again = await api().post(`/api/tests/${testId}/finish`).set(auth(student.token)).send({ answers: [] });
      expect(again.body.data.score).toBe(50);
      expect(await c.prisma.test.count({ where: { userId: student.id, finishedAt: { not: null } } })).toBe(1);

      // The review's correctIndex must point to the "right" option in the shown order.
      const review = await api().get(`/api/results/${testId}`).set(auth(student.token));
      for (const a of review.body.data.answers) {
        expect(a.options[a.correctIndex]).toBe("right");
        expect(a.explanation).toMatch(/Because/);
      }
      const skipped = review.body.data.answers.filter((a: { selectedIndex: number | null }) => a.selectedIndex === null);
      expect(skipped).toHaveLength(1);

      const late = await api()
        .post(`/api/tests/${testId}/answer`)
        .set(auth(student.token))
        .send({ questionId: questions[3].id, selectedIndex: 0 });
      expect(late.status).toBe(400);

      const list = await api().get("/api/results").set(auth(student.token));
      expect(list.body.data[0]).toMatchObject({ id: testId, skippedAnswers: 1 });
      expect(list.body.data[0].createdAt).toBeTruthy();
    });

    it("enforces the time limit on the server", async () => {
      const start = await api().post("/api/tests/start").set(auth(student.token)).send({ courseId, count: 4 });
      const id = start.body.data.test.id as string;
      const qs = start.body.data.questions as { id: string; options: string[] }[];
      await c.prisma.test.update({ where: { id }, data: { startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } });

      const ans = await api()
        .post(`/api/tests/${id}/answer`)
        .set(auth(student.token))
        .send({ questionId: qs[0].id, selectedIndex: qs[0].options.indexOf("right") });
      expect(ans.status).toBe(400);

      const fin = await api()
        .post(`/api/tests/${id}/finish`)
        .set(auth(student.token))
        .send({ answers: qs.map((q) => ({ questionId: q.id, selectedIndex: q.options.indexOf("right") })) });
      expect(fin.status).toBe(200);
      expect(fin.body.data.correctAnswers).toBe(0); // late batch ignored
      expect(fin.body.data.timeSpent).toBe(20 * 60); // capped at the allowed duration
    });

    it("tracks lesson progress forward only and feeds statistics and the leaderboard", async () => {
      const lessonId = (await c.prisma.lesson.findFirst({ where: { courseId } }))!.id;
      expect((await api().put(`/api/progress/${lessonId}`).set(auth(student.token)).send({ percent: 60 })).status).toBe(200);
      const back = await api().put(`/api/progress/${lessonId}`).set(auth(student.token)).send({ percent: 10 });
      expect(back.body.data.percent).toBe(60);
      await api().put(`/api/progress/${lessonId}`).set(auth(student.token)).send({ percent: 100 });
      const done = await api().get("/api/progress/completed").set(auth(student.token));
      expect(done.body.data).toContain(lessonId);

      const stats = await api().get("/api/statistics").set(auth(student.token));
      expect(stats.body.data).toMatchObject({ totalTests: 2, completedLessons: 1 });

      // Not opted in to the public list: the student still sees their own place.
      const board = await api().get("/api/leaderboard").set(auth(student.token));
      expect(board.status).toBe(200);
      expect(board.body.data.me).toMatchObject({ tests: 2, rank: expect.any(Number), visible: false });
    });

    it("lets admins deactivate a user, which signs them out immediately", async () => {
      const victim = await register("victim");
      const off = await api().patch(`/api/admin/users/${victim.id}/status`).set(auth(admin.token)).send({ isActive: false });
      expect(off.status).toBe(200);
      expect((await api().get("/api/auth/me").set(auth(victim.token))).status).toBe(401);
      const login = await api().post("/api/auth/login").send({ email: victim.email, password: PASSWORD });
      expect(login.status).toBe(403);
    });

    it("paginates and searches admin lists", async () => {
      const res = await api().get("/api/admin/questions?limit=2&search=Question").set(auth(admin.token));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 2 });
      const users = await api().get(`/api/admin/users?search=${run}`).set(auth(admin.token));
      expect(users.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("telegram login", () => {
    let sent: string[] = [];

    beforeAll(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init?: { body?: string }) => {
          const body = init?.body ? JSON.parse(init.body) : {};
          if (body.text) sent.push(String(body.text));
          return { json: async () => ({ ok: true, result: {} }) };
        })
      );
    });
    afterAll(() => vi.unstubAllGlobals());

    const startUpdate = (tgId = 777001, text = "/start", from: Record<string, unknown> = { first_name: "Ali", last_name: "Valiyev" }) => ({
      update_id: 1,
      message: { text, chat: { id: tgId, type: "private" }, from: { id: tgId, ...from } },
    });
    const lastCode = () => sent[sent.length - 1].match(/\b(\d{6})\b/)![1];
    const verify = (code: string) => api().post("/api/auth/telegram/verify").send({ code });

    it("gives a plain bot link; /start answers with a code (and a copy button) that logs in once", async () => {
      sent = [];
      const start = await api().post("/api/auth/telegram/start");
      expect(start.status).toBe(201);
      expect(start.body.data.botUrl).toBe("https://t.me/test_bot"); // no token in the link
      expect(start.body.data.sessionId).toBeUndefined();

      await c.telegram.handleUpdate(startUpdate());
      const code = lastCode();
      const call = (vi.mocked(fetch).mock.calls.at(-1)![1] as { body: string }).body;
      expect(JSON.parse(call).reply_markup.inline_keyboard[0][0].copy_text.text).toBe(code);

      expect((await verify(code === "000000" ? "111111" : "000000")).status).toBe(400);

      const ok = await verify(code);
      expect(ok.status).toBe(200);
      // The full Telegram name (first + last) becomes the starting name of the account.
      expect(ok.body.data.user).toMatchObject({ name: "Ali Valiyev", role: "USER", hasPassword: false });
      expect(typeof ok.body.data.user.studentNumber).toBe("number");
      expect(ok.body.data.user.email).toBeUndefined();
      ids.users.push(ok.body.data.user.id);
      expect((await api().get("/api/auth/me").set(auth(ok.body.data.token))).status).toBe(200);

      expect((await verify(code)).status).toBe(400); // single use

      // Same Telegram account -> same user on the next login.
      await c.telegram.handleUpdate(startUpdate());
      const again = await verify(lastCode());
      expect(again.body.data.user.id).toBe(ok.body.data.user.id);
    });

    it("a new /start replaces the previous code, and an expired code does not work", async () => {
      sent = [];
      await c.telegram.handleUpdate(startUpdate(777002, "/start", { first_name: "Vali" }));
      const first = lastCode();
      await c.telegram.handleUpdate(startUpdate(777002, "/start", { first_name: "Vali" }));
      const second = lastCode();
      if (first !== second) expect((await verify(first)).status).toBe(400);

      await c.prisma.telegramLogin.updateMany({ where: { telegramId: "777002", usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await verify(second)).status).toBe(400);
    });

    it("other messages only explain how to get a code; malformed codes are rejected", async () => {
      sent = [];
      await c.telegram.handleUpdate(startUpdate(777003, "salom"));
      expect(sent).toHaveLength(1);
      expect(sent[0]).not.toMatch(/\b\d{6}\b/);
      expect((await verify("123456")).status).toBe(400);
      expect((await api().post("/api/auth/telegram/verify").send({ code: "12" })).status).toBe(422);
      expect((await api().post("/api/auth/telegram/verify").send({})).status).toBe(422);
    });

    it("telegram-only accounts cannot use password login", async () => {
      const tg = await c.prisma.user.findFirst({ where: { telegramId: "777001" } });
      expect(tg?.passwordHash).toBeNull();
      const res = await api().post("/api/auth/login").send({ email: "tg@example.com", password: PASSWORD });
      expect(res.status).toBe(401);
    });
  });

  describe("housekeeping", () => {
    it("removes abandoned attempts but keeps finished and recent ones", async () => {
      const u = await register("cleanup");
      const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const abandoned = await c.prisma.test.create({ data: { userId: u.id, startedAt: old } });
      const finished = await c.prisma.test.create({ data: { userId: u.id, startedAt: old, finishedAt: old } });
      const recent = await c.prisma.test.create({ data: { userId: u.id } });
      await c.cleanup.runCleanup();
      expect(await c.prisma.test.findUnique({ where: { id: abandoned.id } })).toBeNull();
      expect(await c.prisma.test.findUnique({ where: { id: finished.id } })).not.toBeNull();
      expect(await c.prisma.test.findUnique({ where: { id: recent.id } })).not.toBeNull();
    });

    it("health endpoint reports the database", async () => {
      const res = await api().get("/api/health");
      expect(res.body).toMatchObject({ success: true, status: "ok", database: "reachable" });
    });
  });
});
