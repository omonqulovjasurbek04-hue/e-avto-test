import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: the teacher's dashboard numbers (own groups only). Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `to${Date.now()}`;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe.skipIf(!enabled)("teacher overview", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  let token = "";
  let courseId = "";

  const signup = async (k: string) => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run} ${k}`, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    return res.body.data.user.id as string;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    const teacherId = await signup("teacher");
    const otherTeacher = await signup("other");
    const studentA = await signup("a");
    const studentB = await signup("b");
    await prisma.user.updateMany({ where: { id: { in: [teacherId, otherTeacher] } }, data: { role: "TEACHER" } });
    token = (await request(app).post("/api/auth/login").send({ email: `${run}-teacher@example.com`, password: "Passw0rdOK" })).body.data.token;
    courseId = (await prisma.course.create({ data: { title: `Overview ${run}`, description: "d" } })).id;

    const now = Date.now();
    const group = await prisma.teacherGroup.create({ data: { name: `${run} G1`, courseId, teacherId, startDate: new Date(now - 30 * DAY) } });
    await prisma.groupMembership.createMany({ data: [{ groupId: group.id, studentId: studentA }, { groupId: group.id, studentId: studentB }] });
    // Someone else's group does not count.
    const foreign = await prisma.teacherGroup.create({ data: { name: `${run} G2`, courseId, teacherId: otherTeacher, startDate: new Date(now) } });
    await prisma.scheduleSlot.create({ data: { groupId: foreign.id, startsAt: new Date(now + 2 * HOUR), endsAt: new Date(now + 3 * HOUR) } });

    // A lesson that took place with attendance (1 of 2 came), one still unmarked, one coming up.
    const done = await prisma.scheduleSlot.create({ data: { groupId: group.id, startsAt: new Date(now - 3 * DAY), endsAt: new Date(now - 3 * DAY + HOUR) } });
    const session = await prisma.attendanceSession.create({ data: { slotId: done.id, createdById: teacherId, finalizedAt: new Date(now - 3 * DAY + HOUR) } });
    await prisma.attendanceRecord.createMany({
      data: [
        { sessionId: session.id, studentId: studentA, status: "PRESENT", markedById: teacherId },
        { sessionId: session.id, studentId: studentB, status: "ABSENT", markedById: teacherId },
      ],
    });
    await prisma.scheduleSlot.create({ data: { groupId: group.id, startsAt: new Date(now - 2 * DAY), endsAt: new Date(now - 2 * DAY + HOUR), topic: "Belgilar" } });
    await prisma.scheduleSlot.create({ data: { groupId: group.id, startsAt: new Date(now + 2 * DAY), endsAt: new Date(now + 2 * DAY + HOUR), room: "2-xona" } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("counts only the teacher's own groups, students and lessons", async () => {
    const res = await request(app).get("/api/teacher/overview").set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const o = res.body.data;
    expect(o).toMatchObject({ groups: 1, students: 2, attendanceRate: 50 });
    expect(o.lessonsThisWeek).toBeGreaterThanOrEqual(1);
    expect(o.unmarked).toHaveLength(1);
    expect(o.unmarked[0]).toMatchObject({ topic: "Belgilar", group: { name: `${run} G1` } });
    expect(o.next).toHaveLength(1);
    expect(o.next[0]).toMatchObject({ room: "2-xona", group: { name: `${run} G1`, students: 2 } });
  });

  it("is for teaching staff only", async () => {
    const student = await request(app).post("/api/auth/login").send({ email: `${run}-a@example.com`, password: "Passw0rdOK" });
    expect((await request(app).get("/api/teacher/overview").set({ Authorization: `Bearer ${student.body.data.token}` })).status).toBe(403);
  });
});
