import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: test-result and teacher-workload reports, integration status. Needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `r${Date.now()}`;

describe.skipIf(!enabled)("reports and system status", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let courseId = "";
  let groupId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "FINANCE" | "TEACHER" | "ADMIN" | "MODERATOR") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run}-${k}`, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    tok[k] = res.body.data.token;
    return res.body.data.user.id as string;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("admin", "ADMIN");
    await signup("finance", "FINANCE");
    await signup("moderator", "MODERATOR");
    const teacher = await signup("teacher", "TEACHER");
    const a = await signup("a");
    const b = await signup("b");
    courseId = (await prisma.course.create({ data: { title: `${run} course`, description: "d" } })).id;
    const done = new Date(Date.now() - 3_600_000);
    // a: 80 (pass) and 40 (fail); b: 90 (pass); one unfinished attempt that must not count.
    await prisma.test.createMany({
      data: [
        { userId: a, courseId, score: 80, passed: true, timeSpent: 600, finishedAt: done },
        { userId: a, courseId, score: 40, passed: false, timeSpent: 300, finishedAt: done },
        { userId: b, courseId, score: 90, passed: true, timeSpent: 900, finishedAt: done },
        { userId: b, courseId, score: 0, passed: false },
      ],
    });
    const group = await prisma.teacherGroup.create({ data: { name: `${run} g`, courseId, teacherId: teacher, startDate: new Date(), members: { create: [{ studentId: a }, { studentId: b }] } } });
    groupId = group.id;
    const h = (n: number) => new Date(Date.now() + n * 3_600_000);
    await prisma.scheduleSlot.createMany({
      data: [
        { groupId, startsAt: h(-50), endsAt: h(-48) }, // past, no attendance -> missing
        { groupId, startsAt: h(24), endsAt: h(25) }, // future, planned
        { groupId, startsAt: h(48), endsAt: h(49), status: "CANCELLED" },
      ],
    });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { id: groupId } });
    await prisma.test.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("reports are for admins and finance only; system status for admins only", async () => {
    expect((await request(app).get("/api/admin/reports/tests").set(bearer("a"))).status).toBe(403);
    expect((await request(app).get("/api/admin/reports/teachers").set(bearer("teacher"))).status).toBe(403);
    expect((await request(app).get("/api/admin/reports/tests").set(bearer("moderator"))).status).toBe(403);
    expect((await request(app).get("/api/admin/reports/tests").set(bearer("finance"))).status).toBe(200);
    expect((await request(app).get("/api/admin/system").set(bearer("finance"))).status).toBe(403);
    expect((await request(app).get("/api/admin/system")).status).toBe(401);
  });

  it("counts only finished attempts and computes pass rate and averages on the server", async () => {
    const res = await request(app).get(`/api/admin/reports/tests?courseId=${courseId}`).set(bearer("admin"));
    expect(res.status).toBe(200);
    const row = res.body.data.rows.find((r: { courseId: string }) => r.courseId === courseId);
    expect(row).toMatchObject({ course: `${run} course`, attempts: 3, students: 2, passed: 2, passRate: 67, averageScore: 70, averageSeconds: 600 });
    expect(res.body.data.total).toMatchObject({ attempts: 3, students: 2, passRate: 67 });
  });

  it("shows the teacher's load and lessons still missing attendance", async () => {
    const from = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const to = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const res = await request(app).get(`/api/admin/reports/teachers?from=${from}&to=${to}`).set(bearer("admin"));
    expect(res.status).toBe(200);
    const row = res.body.data.rows.find((r: { name: string }) => r.name === `${run}-teacher`);
    expect(row).toMatchObject({ activeGroups: 1, students: 2, lessons: 2, planned: 2, cancelled: 1, attendanceMissing: 1, hours: 3 });
  });

  it("rejects reversed or over-long periods", async () => {
    const q = (from: string, to: string) => request(app).get(`/api/admin/reports/tests?from=${from}&to=${to}`).set(bearer("admin"));
    expect((await q("2026-02-01", "2026-01-01")).status).toBe(400);
    expect((await q("2020-01-01", "2026-01-01")).status).toBe(400);
  });

  it("system status says what is configured without revealing any secret", async () => {
    const res = await request(app).get("/api/admin/system").set(bearer("admin"));
    expect(res.status).toBe(200);
    const keys = res.body.data.checks.map((c: { key: string }) => c.key);
    expect(keys).toEqual(expect.arrayContaining(["database", "payments", "email", "telegram", "media", "enrollment", "rateLimit"]));
    expect(res.body.data.checks.find((c: { key: string }) => c.key === "database").level).toBe("ok");
    expect(res.body.data.checks.find((c: { key: string }) => c.key === "database").detail.applied).toBeGreaterThan(0);
    const body = JSON.stringify(res.body);
    for (const secret of [process.env.DATABASE_URL, process.env.JWT_SECRET, process.env.PAYMENT_MOCK_SECRET, process.env.SMTP_PASS, process.env.TELEGRAM_BOT_TOKEN]) {
      if (secret) expect(body).not.toContain(secret);
    }
    expect(body).not.toMatch(/postgres(ql)?:\/\//);
  });
});
