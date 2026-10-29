import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: deleting a group for good (the "delete" button) versus archiving it. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `gd${Date.now()}`;

describe.skipIf(!enabled)("group delete", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let courseId = "";
  const as = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "TEACHER") => {
    const email = `${run}-${k}@example.com`;
    const res = await request(app).post("/api/auth/register").send({ name: `${run} ${k}`, email, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    if (role) await prisma.user.update({ where: { id: uid[k] }, data: { role } });
    tok[k] = (await request(app).post("/api/auth/login").send({ email, password: "Passw0rdOK" })).body.data.token;
  };
  const group = async (teacher: string) => {
    const g = await prisma.teacherGroup.create({ data: { name: `${run} G`, courseId, teacherId: uid[teacher], startDate: new Date() } });
    await prisma.groupMembership.create({ data: { groupId: g.id, studentId: uid.student } });
    const slot = await prisma.scheduleSlot.create({ data: { groupId: g.id, startsAt: new Date(Date.now() - 3_600_000), endsAt: new Date() } });
    const session = await prisma.attendanceSession.create({ data: { slotId: slot.id, createdById: uid[teacher] } });
    await prisma.attendanceRecord.create({ data: { sessionId: session.id, studentId: uid.student, status: "PRESENT", markedById: uid[teacher] } });
    return g.id;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("teacher", "TEACHER");
    await signup("other", "TEACHER");
    await signup("student");
    courseId = (await prisma.course.create({ data: { title: `Delete ${run}`, description: "d" } })).id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("deletes the group with its members, lessons and attendance, and audits it", async () => {
    const id = await group("teacher");
    // Another teacher does not even see the group; a student has no group rights.
    expect((await request(app).delete(`/api/groups/${id}/permanent`).set(as("other"))).status).toBe(404);
    expect((await request(app).delete(`/api/groups/${id}/permanent`).set(as("student"))).status).toBe(403);

    const res = await request(app).delete(`/api/groups/${id}/permanent`).set(as("teacher"));
    expect(res.status).toBe(200);
    expect(await prisma.teacherGroup.count({ where: { id } })).toBe(0);
    expect(await prisma.groupMembership.count({ where: { groupId: id } })).toBe(0);
    expect(await prisma.scheduleSlot.count({ where: { groupId: id } })).toBe(0);
    const audit = await prisma.auditLog.findFirst({ where: { action: "group.delete", entityId: id } });
    expect(audit?.before).toMatchObject({ members: 1, slots: 1, attendanceRecords: 1 });
  });

  it("a group past its end date moves to the archive by itself", async () => {
    const ended = await prisma.teacherGroup.create({ data: { name: `${run} ended`, courseId, teacherId: uid.teacher, startDate: new Date(Date.now() - 30 * 86_400_000), endDate: new Date(Date.now() - 86_400_000) } });
    const running = await prisma.teacherGroup.create({ data: { name: `${run} running`, courseId, teacherId: uid.teacher, startDate: new Date(), endDate: new Date(Date.now() + 30 * 86_400_000) } });
    // Reading the list is enough; the periodic job does the same.
    const list = await request(app).get("/api/groups").set(as("teacher"));
    const byId = Object.fromEntries(list.body.data.map((g: { id: string; status: string }) => [g.id, g.status]));
    expect(byId[ended.id]).toBe("ARCHIVED");
    expect(byId[running.id]).toBe("ACTIVE");
    expect(await prisma.auditLog.count({ where: { action: "group.archive.finished", entityId: ended.id } })).toBe(1);

    // Moving the end date into the future (edit) brings it back.
    const later = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    await request(app).put(`/api/groups/${ended.id}`).set(as("teacher")).send({ endDate: later }).expect(200);
    expect(await prisma.teacherGroup.findUnique({ where: { id: ended.id }, select: { status: true } })).toEqual({ status: "ACTIVE" });
  });

  it("archiving still keeps the group and its history", async () => {
    const id = await group("teacher");
    await request(app).delete(`/api/groups/${id}`).set(as("teacher")).expect(200);
    expect(await prisma.teacherGroup.findUnique({ where: { id }, select: { status: true } })).toEqual({ status: "ARCHIVED" });
    expect(await prisma.scheduleSlot.count({ where: { groupId: id } })).toBe(1);

    // ...and brings it back.
    await request(app).post(`/api/groups/${id}/restore`).set(as("teacher")).expect(200);
    expect(await prisma.teacherGroup.findUnique({ where: { id }, select: { status: true } })).toEqual({ status: "ACTIVE" });
  });

  it("a finished group comes back only after its end date is extended", async () => {
    const g = await prisma.teacherGroup.create({ data: { name: `${run} over`, courseId, teacherId: uid.teacher, status: "ARCHIVED", startDate: new Date(Date.now() - 30 * 86_400_000), endDate: new Date(Date.now() - 86_400_000) } });
    expect((await request(app).post(`/api/groups/${g.id}/restore`).set(as("teacher"))).status).toBe(409);
    expect((await request(app).post(`/api/groups/${g.id}/restore`).set(as("other"))).status).toBe(404);
  });
});
