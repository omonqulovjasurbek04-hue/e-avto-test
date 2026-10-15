import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration test: groups, schedule, attendance and ownership. Needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `g${Date.now()}`;
const PASSWORD = "Passw0rdOK";

describe.skipIf(!enabled)("groups, schedule and attendance", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const userIds: string[] = [];
  const u = {} as Record<string, { id: string; token: string }>;
  let courseId = "";
  let groupId = "";
  let slotId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${u[k].token}` });

  const make = async (key: string, role?: "TEACHER" | "ADMIN") => {
    const res = await request(app).post("/api/auth/register").send({ name: key, email: `${run}-${key}@example.com`, password: PASSWORD });
    expect(res.status).toBe(201);
    const id = res.body.data.user.id as string;
    userIds.push(id);
    if (role) await prisma.user.update({ where: { id }, data: { role } });
    u[key] = { id, token: res.body.data.token };
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await make("admin", "ADMIN");
    await make("teacherA", "TEACHER");
    await make("teacherB", "TEACHER");
    await make("s1");
    await make("s2");
    await make("outsider");
    courseId = (await prisma.course.create({ data: { title: `Course ${run}`, description: "d" } })).id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("admin creates a group; only a TEACHER can be assigned", async () => {
    const bad = await request(app).post("/api/admin/groups").set(bearer("admin")).send({ name: "Gr", courseId, teacherId: u.s1.id, startDate: "2026-09-01" });
    expect(bad.status).toBe(400);
    const ok = await request(app).post("/api/admin/groups").set(bearer("admin")).send({ name: "G1", courseId, teacherId: u.teacherA.id, startDate: "2026-09-01", capacity: 1 });
    expect(ok.status).toBe(201);
    groupId = ok.body.data.id;
  });

  it("students and teachers cannot use admin group endpoints", async () => {
    expect((await request(app).post("/api/admin/groups").set(bearer("s1")).send({})).status).toBe(403);
    expect((await request(app).post(`/api/admin/groups/${groupId}/members`).set(bearer("teacherA")).send({ studentId: u.s1.id })).status).toBe(403);
  });

  it("enforces capacity and rejects duplicate members", async () => {
    expect((await request(app).post(`/api/admin/groups/${groupId}/members`).set(bearer("admin")).send({ studentId: u.s1.id })).status).toBe(201);
    expect((await request(app).post(`/api/admin/groups/${groupId}/members`).set(bearer("admin")).send({ studentId: u.s1.id })).status).toBe(409);
    expect((await request(app).post(`/api/admin/groups/${groupId}/members`).set(bearer("admin")).send({ studentId: u.s2.id })).status).toBe(409);
  });

  it("creates a weekly schedule and blocks a teacher double-booking", async () => {
    const res = await request(app).post(`/api/admin/groups/${groupId}/slots`).set(bearer("admin"))
      .send({ startsAt: "2026-09-07T05:00:00Z", endsAt: "2026-09-07T06:30:00Z", room: "A-1", repeat: { everyWeeks: 1, count: 3 } });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(3);
    slotId = res.body.data[0].id;
    const clash = await request(app).post(`/api/admin/groups/${groupId}/slots`).set(bearer("admin"))
      .send({ startsAt: "2026-09-07T06:00:00Z", endsAt: "2026-09-07T07:00:00Z" });
    expect(clash.status).toBe(409);
  });

  it("a teacher sees only their own group", async () => {
    expect((await request(app).get(`/api/groups/${groupId}`).set(bearer("teacherA"))).status).toBe(200);
    expect((await request(app).get(`/api/groups/${groupId}`).set(bearer("teacherB"))).status).toBe(404);
    expect((await request(app).get("/api/groups").set(bearer("teacherB"))).body.data).toHaveLength(0);
  });

  it("another teacher cannot mark attendance for a foreign group", async () => {
    const res = await request(app).put(`/api/slots/${slotId}/attendance`).set(bearer("teacherB")).send({ records: [{ studentId: u.s1.id, status: "PRESENT" }] });
    expect(res.status).toBe(404);
  });

  it("marks attendance; changes need a reason; finalized records are admin-only", async () => {
    const put = (who: string, body: object) => request(app).put(`/api/slots/${slotId}/attendance`).set(bearer(who)).send(body);
    expect((await put("teacherA", { records: [{ studentId: u.s1.id, status: "PRESENT" }] })).status).toBe(200);
    expect((await put("teacherA", { records: [{ studentId: u.s1.id, status: "ABSENT" }] })).status).toBe(400);
    expect((await put("teacherA", { records: [{ studentId: u.s1.id, status: "LATE" }], reason: "keldi" })).status).toBe(200);
    expect((await put("teacherA", { records: [{ studentId: u.outsider.id, status: "PRESENT" }] })).status).toBe(400);
    expect((await put("teacherA", { records: [{ studentId: u.s1.id, status: "ONLINE" }], reason: "online" })).status).toBe(400);

    expect((await request(app).post(`/api/slots/${slotId}/attendance/finalize`).set(bearer("teacherA"))).status).toBe(200);
    expect((await put("teacherA", { records: [{ studentId: u.s1.id, status: "PRESENT" }], reason: "xato" })).status).toBe(403);
    expect((await put("admin", { records: [{ studentId: u.s1.id, status: "PRESENT" }], reason: "xato tuzatildi" })).status).toBe(200);
    expect(await prisma.auditLog.count({ where: { action: "attendance.change", entityId: { endsWith: u.s1.id } } })).toBeGreaterThanOrEqual(2);
  });

  it("students see only their own attendance and schedule", async () => {
    const mine = await request(app).get("/api/me/attendance").set(bearer("s1"));
    expect(mine.status).toBe(200);
    expect(mine.body.data.records).toHaveLength(1);
    expect((await request(app).get("/api/me/attendance").set(bearer("outsider"))).body.data.records).toHaveLength(0);
    expect((await request(app).get("/api/me/schedule?from=2026-09-01&to=2026-10-01").set(bearer("outsider"))).body.data).toHaveLength(0);
    expect((await request(app).get("/api/me/schedule?from=2026-09-01&to=2026-10-01").set(bearer("s1"))).body.data.length).toBeGreaterThan(0);
  });

  it("CSV export is admin-only", async () => {
    expect((await request(app).get(`/api/groups/${groupId}/attendance-report.csv`).set(bearer("teacherA"))).status).toBe(403);
    expect((await request(app).get(`/api/groups/${groupId}/attendance-report.csv`).set(bearer("admin"))).status).toBe(200);
  });
});
