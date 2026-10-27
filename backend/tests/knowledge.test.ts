import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: the teacher's "knowledge control" (group test activity, a student's mistakes). Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `kn${Date.now()}`;

type Served = { id: string; text: string; options: string[] };

describe.skipIf(!enabled)("knowledge control", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let courseId = "";
  let groupId = "";
  const as = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "TEACHER" | "ADMIN") => {
    const email = `${run}-${k}@example.com`;
    const res = await request(app).post("/api/auth/register").send({ name: `${run} ${k}`, email, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    if (role) await prisma.user.update({ where: { id: uid[k] }, data: { role } });
    tok[k] = (await request(app).post("/api/auth/login").send({ email, password: "Passw0rdOK" })).body.data.token;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("teacher", "TEACHER");
    await signup("stranger", "TEACHER");
    await signup("ali");
    await signup("vali");
    await signup("admin", "ADMIN");
    courseId = (await prisma.course.create({ data: { title: `Knowledge ${run}`, description: "d" } })).id;
    const lesson = await prisma.lesson.create({ data: { courseId, title: "Yo'l belgilari" } });
    await prisma.question.createMany({
      data: Array.from({ length: 4 }, (_, i) => ({ courseId, lessonId: lesson.id, text: `${run} q${i}`, options: ["OK", "Wrong A", "Wrong B"], correctIndex: 0 })),
    });
    groupId = (await prisma.teacherGroup.create({ data: { name: `${run} G`, courseId, teacherId: uid.teacher, startDate: new Date() } })).id;
    await prisma.groupMembership.createMany({ data: [{ groupId, studentId: uid.ali }, { groupId, studentId: uid.vali }] });

    // Ali takes a test: two right, two wrong (picks "Wrong A").
    const start = await request(app).post("/api/tests/start").set(as("ali")).send({ courseId, count: 4 });
    const qs: Served[] = start.body.data.questions;
    const answers = qs.map((q, i) => ({ questionId: q.id, selectedIndex: q.options.indexOf(i < 2 ? "OK" : "Wrong A") }));
    await request(app).post(`/api/tests/${start.body.data.test.id}/finish`).set(as("ali")).send({ answers }).expect(200);
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.question.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("shows a group's test activity for the last 7 days", async () => {
    const res = await request(app).get("/api/teacher/knowledge").set(as("teacher"));
    expect(res.status).toBe(200);
    expect(res.body.data.groupId).toBe(groupId);
    expect(res.body.data.summary).toMatchObject({ students: 2, tests7d: 1, average7d: 50, inactive7d: 1 });
    const ali = res.body.data.students.find((s: { id: string }) => s.id === uid.ali);
    expect(ali).toMatchObject({ tests7d: 1, average7d: 50, mistakes: 2 });
    const vali = res.body.data.students.find((s: { id: string }) => s.id === uid.vali);
    expect(vali).toMatchObject({ tests7d: 0, average7d: null, mistakes: 0, lastTestAt: null });
  });

  it("opens one student's mistakes with the answer they picked", async () => {
    const res = await request(app).get(`/api/teacher/students/${uid.ali}/knowledge`).set(as("teacher"));
    expect(res.status).toBe(200);
    expect(res.body.data.week).toEqual({ tests: 1, average: 50 });
    expect(res.body.data.mistakes).toHaveLength(2);
    expect(res.body.data.mistakes[0]).toMatchObject({ chosen: "Wrong A", correct: "OK", topic: "Yo'l belgilari", times: 1 });
    expect(res.body.data.weakTopics).toEqual([{ topic: "Yo'l belgilari", count: 2 }]);
    expect(res.body.data.recent).toHaveLength(1);
  });

  it("shows the admin every teacher separately, and one teacher's groups", async () => {
    const res = await request(app).get("/api/teacher/knowledge/teachers").set(as("admin"));
    expect(res.status).toBe(200);
    const mine = res.body.data.teachers.find((t: { id: string }) => t.id === uid.teacher);
    expect(mine).toMatchObject({ groups: 1, students: 2, tests7d: 1, average7d: 50, inactive7d: 1 });
    const other = res.body.data.teachers.find((t: { id: string }) => t.id === uid.stranger);
    expect(other).toMatchObject({ groups: 0, students: 0, tests7d: 0, average7d: null });

    const own = await request(app).get(`/api/teacher/knowledge?teacherId=${uid.teacher}`).set(as("admin"));
    expect(own.body.data.groups.map((g: { id: string }) => g.id)).toEqual([groupId]);
    const none = await request(app).get(`/api/teacher/knowledge?teacherId=${uid.stranger}`).set(as("admin"));
    expect(none.body.data).toMatchObject({ groups: [], groupId: null });
    // A teacher cannot look at someone else's groups through the filter.
    const sneaky = await request(app).get(`/api/teacher/knowledge?teacherId=${uid.teacher}`).set(as("stranger"));
    expect(sneaky.body.data.groups).toEqual([]);
    expect((await request(app).get("/api/teacher/knowledge/teachers").set(as("teacher"))).status).toBe(403);
  });

  it("keeps other teachers and students out", async () => {
    expect((await request(app).get(`/api/teacher/students/${uid.ali}/knowledge`).set(as("stranger"))).status).toBe(403);
    expect((await request(app).get(`/api/teacher/knowledge?groupId=${groupId}`).set(as("stranger"))).status).toBe(403);
    expect((await request(app).get("/api/teacher/knowledge").set(as("vali"))).status).toBe(403);
  });
});
