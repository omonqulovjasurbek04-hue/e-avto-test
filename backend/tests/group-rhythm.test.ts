import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { rhythmIntervals } from "../src/lib/schedule";

describe("group rhythm (toq / juft kunlar)", () => {
  // 2027-03-01 is a Monday; 18:00 in Tashkent is 13:00 UTC.
  const base = { startDate: new Date("2027-03-01"), endDate: new Date("2027-03-14"), startTime: "18:00", lessonMinutes: 90 };

  it("puts toq kunlar on Mon/Wed/Fri and juft kunlar on Tue/Thu/Sat at the Tashkent time", () => {
    const odd = rhythmIntervals({ ...base, days: "ODD" });
    expect(odd.map((i) => i.startsAt.toISOString())).toEqual(
      ["01", "03", "05", "08", "10", "12"].map((d) => `2027-03-${d}T13:00:00.000Z`)
    );
    expect(odd[0].endsAt.toISOString()).toBe("2027-03-01T14:30:00.000Z");
    const even = rhythmIntervals({ ...base, days: "EVEN" });
    expect(even.map((i) => i.startsAt.getUTCDate())).toEqual([2, 4, 6, 9, 11, 13]);
  });

  it("plans 12 weeks without an end date, skips lessons before `from`, and refuses absurd ranges", () => {
    expect(rhythmIntervals({ ...base, endDate: null, days: "ODD" })).toHaveLength(36);
    expect(rhythmIntervals({ ...base, days: "ODD" }, new Date("2027-03-08T00:00:00Z"))).toHaveLength(3);
    expect(() => rhythmIntervals({ ...base, endDate: new Date("2028-12-31"), days: "ODD" })).toThrow(/Too many lessons/);
  });
});

// Integration: teachers open their own groups; admins open any; TEACHER role assignment is complete.
// Needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `r${Date.now()}`;
const PASSWORD = "Passw0rdOK";

describe.skipIf(!enabled)("opening groups", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const userIds: string[] = [];
  const u = {} as Record<string, { id: string; token: string }>;
  let courseId = "";
  let groupId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${u[k].token}` });

  const make = async (key: string, role?: "TEACHER" | "ADMIN") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${key} ${run}`, email: `${run}-${key}@example.com`, password: PASSWORD });
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
    await make("teacher", "TEACHER");
    await make("other", "TEACHER");
    await make("student");
    await make("hire");
    courseId = (await prisma.course.create({ data: { title: `Course ${run}`, description: "d", isPublished: true } })).id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("an admin makes someone a teacher, and the teacher profile comes with it", async () => {
    const res = await request(app).patch(`/api/admin/users/${u.hire.id}/role`).set(bearer("admin")).send({ role: "TEACHER" });
    expect(res.status).toBe(200);
    expect(await prisma.teacherProfile.findUnique({ where: { userId: u.hire.id } })).not.toBeNull();
  });

  it("a teacher opens a group for themselves with name, time and toq kunlar; the lessons are created", async () => {
    const res = await request(app)
      .post("/api/groups")
      .set(bearer("teacher"))
      // teacherId is ignored for a teacher: the group is always theirs.
      .send({ name: `Toq 18:00 ${run}`, courseId, teacherId: u.other.id, startDate: "2027-03-01", endDate: "2027-03-14", days: "ODD", startTime: "18:00", room: `R-${run}` });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ teacherId: u.teacher.id, days: "ODD", startTime: "18:00", lessonMinutes: 90, lessonsCreated: 6 });
    groupId = res.body.data.id;

    const slots = await request(app).get(`/api/groups/${groupId}/slots`).set(bearer("teacher"));
    expect(slots.body.data.map((s: { startsAt: string }) => s.startsAt)).toContain("2027-03-03T13:00:00.000Z");
  });

  it("refuses days without a time, and a lesson that double-books the room", async () => {
    const half = await request(app).post("/api/groups").set(bearer("teacher")).send({ name: "Half", courseId, startDate: "2027-03-01", days: "EVEN" });
    expect(half.status).toBe(422);
    const clash = await request(app)
      .post("/api/groups")
      .set(bearer("other"))
      .send({ name: `Clash ${run}`, courseId, startDate: "2027-03-01", endDate: "2027-03-14", days: "ODD", startTime: "18:30", room: `R-${run}` });
    expect(clash.status).toBe(409);
  });

  it("the teacher finds and adds a student; another teacher cannot see or change the group", async () => {
    const found = await request(app).get("/api/teacher/students").query({ search: `student ${run}` }).set(bearer("teacher"));
    expect(found.body.data.map((s: { id: string }) => s.id)).toEqual([u.student.id]);
    expect((await request(app).post(`/api/groups/${groupId}/members`).set(bearer("teacher")).send({ studentId: u.student.id })).status).toBe(201);

    expect((await request(app).get(`/api/groups/${groupId}`).set(bearer("other"))).status).toBe(404);
    expect((await request(app).post(`/api/groups/${groupId}/members`).set(bearer("other")).send({ studentId: u.student.id })).status).toBe(404);
    expect((await request(app).post("/api/groups").set(bearer("student")).send({ name: "Nope", courseId, startDate: "2027-03-01" })).status).toBe(403);
  });

  it("the student sees the group's rhythm; switching to juft kunlar moves the future lessons", async () => {
    const mine = await request(app).get("/api/me/groups").set(bearer("student"));
    expect(mine.body.data.find((g: { id: string }) => g.id === groupId)).toMatchObject({ days: "ODD", time: "18:00–19:30" });

    const res = await request(app).put(`/api/groups/${groupId}`).set(bearer("teacher")).send({ days: "EVEN", startTime: "09:00" });
    expect(res.status).toBe(200);
    expect(res.body.data.lessonsCreated).toBe(6);
    const slots = await prisma.scheduleSlot.findMany({ where: { groupId }, orderBy: { startsAt: "asc" } });
    expect(slots.map((s) => s.startsAt.toISOString())).toEqual(["02", "04", "06", "09", "11", "13"].map((d) => `2027-03-${d}T04:00:00.000Z`));
    expect(await prisma.notification.count({ where: { userId: u.student.id, type: "SCHEDULE_NEW" } })).toBe(1);
  });

  it("an admin opens a group for any teacher", async () => {
    const res = await request(app)
      .post("/api/admin/groups")
      .set(bearer("admin"))
      .send({ name: `Juft ${run}`, courseId, teacherId: u.hire.id, startDate: "2027-03-01", endDate: "2027-03-14", days: "EVEN", startTime: "14:00", lessonMinutes: 60 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ teacherId: u.hire.id, lessonsCreated: 6, lessonMinutes: 60 });
  });
});
