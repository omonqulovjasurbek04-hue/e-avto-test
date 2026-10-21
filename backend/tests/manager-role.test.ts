import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration test: the MANAGER (front desk) role runs groups and the schedule end to end, and nothing else.
// Needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `m${Date.now()}`;
const PASSWORD = "Passw0rdOK";

describe.skipIf(!enabled)("MANAGER role", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const userIds: string[] = [];
  const u = {} as Record<string, { id: string; token: string }>;
  let courseId = "";
  let groupId = "";
  let slotId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${u[k].token}` });

  const make = async (key: string, role?: "TEACHER" | "ADMIN" | "MANAGER") => {
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
    await make("manager", "MANAGER");
    await make("teacher", "TEACHER");
    await make("student");
    await make("hire");
    courseId = (await prisma.course.create({ data: { title: `Course ${run}`, description: "d" } })).id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("an admin can make someone a MANAGER", async () => {
    const res = await request(app).patch(`/api/admin/users/${u.hire.id}/role`).set(bearer("admin")).send({ role: "MANAGER" });
    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.hire.id } })).role).toBe("MANAGER");
  });

  it("reads the lists the groups page needs (teachers, students, courses)", async () => {
    const teachers = await request(app).get("/api/admin/users").query({ role: "TEACHER", limit: 100 }).set(bearer("manager"));
    expect(teachers.status).toBe(200);
    expect(teachers.body.data.map((x: { id: string }) => x.id)).toContain(u.teacher.id);
    expect((await request(app).get("/api/admin/courses").set(bearer("manager"))).status).toBe(200);
  });

  it("opens a group, enrols a student and plans lessons", async () => {
    const g = await request(app).post("/api/admin/groups").set(bearer("manager")).send({ name: "M1", courseId, teacherId: u.teacher.id, startDate: "2026-09-01" });
    expect(g.status).toBe(201);
    groupId = g.body.data.id;
    expect((await request(app).post(`/api/admin/groups/${groupId}/members`).set(bearer("manager")).send({ studentId: u.student.id })).status).toBe(201);
    const slots = await request(app).post(`/api/admin/groups/${groupId}/slots`).set(bearer("manager"))
      .send({ startsAt: "2026-09-08T05:00:00Z", endsAt: "2026-09-08T06:30:00Z", room: "B-2", repeat: { everyWeeks: 1, count: 2 } });
    expect(slots.status).toBe(201);
    slotId = slots.body.data[0].id;
    const detail = await request(app).get(`/api/groups/${groupId}`).set(bearer("manager"));
    expect(detail.status).toBe(200);
    expect((await request(app).get("/api/groups").set(bearer("manager"))).body.data.map((x: { id: string }) => x.id)).toContain(groupId);
    expect((await request(app).get(`/api/groups/${groupId}/slots`).set(bearer("manager"))).body.data).toHaveLength(2);
    expect((await request(app).patch(`/api/slots/${slotId}`).set(bearer("manager")).send({ room: "C-3" })).status).toBe(200);
  });

  it("sees orders but cannot touch money", async () => {
    expect((await request(app).get("/api/admin/finance/orders").set(bearer("manager"))).status).toBe(200);
    expect((await request(app).get("/api/admin/finance/refunds").set(bearer("manager"))).status).toBe(403);
  });

  it("cannot change roles, users, prices, settings or audit, nor mark attendance", async () => {
    expect((await request(app).patch(`/api/admin/users/${u.student.id}/role`).set(bearer("manager")).send({ role: "TEACHER" })).status).toBe(403);
    expect((await request(app).patch(`/api/admin/users/${u.student.id}/status`).set(bearer("manager")).send({ isActive: false })).status).toBe(403);
    expect((await request(app).post("/api/admin/courses").set(bearer("manager")).send({ title: "x", description: "y" })).status).toBe(403);
    expect((await request(app).get("/api/admin/statistics").set(bearer("manager"))).status).toBe(403);
    expect((await request(app).get("/api/admin/audit").set(bearer("manager"))).status).toBe(403);
    expect((await request(app).get("/api/admin/system").set(bearer("manager"))).status).toBe(403);
    expect((await request(app).put("/api/admin/cms/site-settings").set(bearer("manager")).send({})).status).toBe(403);
    const mark = await request(app).put(`/api/slots/${slotId}/attendance`).set(bearer("manager")).send({ records: [{ studentId: u.student.id, status: "PRESENT" }] });
    expect(mark.status).toBe(403);
  });

  it("students still cannot read the user list", async () => {
    expect((await request(app).get("/api/admin/users").set(bearer("student"))).status).toBe(403);
    expect((await request(app).get("/api/groups").set(bearer("student"))).status).toBe(403);
  });
});
