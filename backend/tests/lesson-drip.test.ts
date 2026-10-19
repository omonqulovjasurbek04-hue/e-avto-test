import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: inside a bought course lessons open step by step. Needs PostgreSQL.
//  - distance learners: 2 lessons at once, 2 more every 3 days;
//  - students of a class group: one lesson per attended class.
process.env.ENFORCE_ENROLLMENT = "true";
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `drip${Date.now()}`;
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!enabled)("lessons open step by step", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let courseId = "";
  let groupId = "";
  const lessons: string[] = [];
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });
  const lessonList = async (k: string) =>
    ((await request(app).get("/api/lessons").set(bearer(k))).body.data as { id: string; locked: boolean; lockReason: string | null; unlocksAt: string | null }[]).filter((l) =>
      lessons.includes(l.id)
    );

  const signup = async (k: string, role?: "ADMIN" | "TEACHER") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run}-${k}`, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    tok[k] = res.body.data.token;
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    for (const k of ["fresh", "fourDays", "classroom", "none"]) await signup(k);
    await signup("teacher", "TEACHER");
    await signup("admin", "ADMIN");

    courseId = (await prisma.course.create({ data: { title: `Drip ${run}`, description: "d" } })).id;
    for (let i = 1; i <= 6; i++) {
      const l = await prisma.lesson.create({ data: { courseId, title: `L${i}`, order: i } });
      lessons.push(l.id);
      await prisma.question.create({ data: { courseId, lessonId: l.id, text: `${run}-L${i}`, options: ["x", "y"], correctIndex: 0 } });
    }
    await prisma.enrollment.create({ data: { userId: uid.fresh, courseId } });
    await prisma.enrollment.create({ data: { userId: uid.fourDays, courseId, startsAt: new Date(Date.now() - 4 * DAY) } });
    await prisma.enrollment.create({ data: { userId: uid.classroom, courseId } });
    groupId = (await prisma.teacherGroup.create({ data: { name: `G ${run}`, courseId, teacherId: uid.teacher, startDate: new Date() } })).id;
    await prisma.groupMembership.create({ data: { groupId, studentId: uid.classroom } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.test.deleteMany({ where: { userId: { in: ids } } });
    await prisma.question.deleteMany({ where: { text: { startsWith: run } } });
    await prisma.teacherGroup.deleteMany({ where: { id: groupId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("distance learner: 2 lessons right away, the next 2 after 3 days", async () => {
    const fresh = await lessonList("fresh");
    expect(fresh.map((l) => l.locked)).toEqual([false, false, true, true, true, true]);
    expect(fresh[2]).toMatchObject({ lockReason: "schedule" });
    // Lessons 3-4 open 3 days after enrolling, 5-6 after 6 days.
    const enrolledAt = (await prisma.enrollment.findFirstOrThrow({ where: { userId: uid.fresh } })).startsAt.getTime();
    expect(new Date(fresh[2].unlocksAt!).getTime()).toBe(enrolledAt + 3 * DAY);
    expect(new Date(fresh[4].unlocksAt!).getTime()).toBe(enrolledAt + 6 * DAY);

    expect((await lessonList("fourDays")).map((l) => l.locked)).toEqual([false, false, false, false, true, true]);
  });

  it("classroom student: a lesson opens after attending its class", async () => {
    expect((await lessonList("classroom")).every((l) => l.locked && l.lockReason === "attendance")).toBe(true);

    const attend = async (status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE", hoursAgo: number) => {
      const slot = await prisma.scheduleSlot.create({
        data: { groupId, startsAt: new Date(Date.now() - hoursAgo * 3600_000), endsAt: new Date(Date.now() - (hoursAgo - 1) * 3600_000) },
      });
      const session = await prisma.attendanceSession.create({ data: { slotId: slot.id, createdById: uid.teacher } });
      await prisma.attendanceRecord.create({ data: { sessionId: session.id, studentId: uid.classroom, status, markedById: uid.teacher } });
    };
    await attend("PRESENT", 50);
    await attend("ABSENT", 40); // missed classes and excused absences open nothing
    await attend("EXCUSED", 30);
    expect((await lessonList("classroom")).map((l) => l.locked)).toEqual([false, true, true, true, true, true]);
    await attend("LATE", 20); // came late, but was there
    expect((await lessonList("classroom")).map((l) => l.locked)).toEqual([false, false, true, true, true, true]);
  });

  it("a closed lesson gives no content, no lesson test and no progress", async () => {
    const closed = lessons[2];
    const one = await request(app).get(`/api/lessons/${closed}`).set(bearer("fresh"));
    expect(one.status).toBe(200);
    expect(one.body.data).toMatchObject({ locked: true, lockReason: "schedule", content: null, videoUrl: "" });
    expect((await request(app).post("/api/tests/start").set(bearer("fresh")).send({ lessonId: closed })).status).toBe(403);
    expect((await request(app).post("/api/tests/start").set(bearer("fresh")).send({ lessonId: lessons[0] })).status).toBe(201);
    expect((await request(app).put(`/api/progress/${closed}`).set(bearer("fresh")).send({ percent: 50 })).status).toBe(403);
  });

  it("a course test draws only from the lessons that are open", async () => {
    const res = await request(app).post("/api/tests/start").set(bearer("fresh")).send({ courseId, count: 100 });
    expect(res.status).toBe(201);
    const texts = (res.body.data.questions as { text: string }[]).map((q) => q.text).sort();
    expect(texts).toEqual([`${run}-L1`, `${run}-L2`]);
  });

  it("without the course everything is closed; staff see every lesson", async () => {
    expect((await lessonList("none")).every((l) => l.locked && l.lockReason === "purchase")).toBe(true);
    expect((await lessonList("admin")).every((l) => !l.locked)).toBe(true);
  });
});
