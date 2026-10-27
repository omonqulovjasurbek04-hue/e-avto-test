import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: a teacher fills, edits and resets exam tickets. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `te${Date.now()}`;

describe.skipIf(!enabled)("teacher ticket editing", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let courseId = "";
  let lessonId = "";
  const as = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });
  const base = () => `/api/teacher/courses/${courseId}`;
  const question = { text: `${run} Qaysi belgi?`, options: ["To'xtash", "Yurish", "Burilish"], correctIndex: 0, explanation: "Qoida 1" };

  const signup = async (k: string, role?: "TEACHER") => {
    const email = `${run}-${k}@example.com`;
    const res = await request(app).post("/api/auth/register").send({ name: `${run} ${k}`, email, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    tok[k] = (await request(app).post("/api/auth/login").send({ email, password: "Passw0rdOK" })).body.data.token;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("teacher", "TEACHER");
    await signup("student");
    courseId = (await prisma.course.create({ data: { title: `Ticket edit ${run}`, description: "d" } })).id;
    lessonId = (await prisma.lesson.create({ data: { courseId, title: "Belgilar" } })).id;
    await prisma.question.createMany({ data: Array.from({ length: 120 }, (_, i) => ({ courseId, text: `${run} q${i}`, options: ["OK", "No"], correctIndex: 0 })) });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.test.deleteMany({ where: { courseId } });
    await prisma.question.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("lists the course's 60 tickets, all automatic at first", async () => {
    const res = await request(app).get(`${base()}/tickets`).set(as("teacher"));
    expect(res.status).toBe(200);
    expect(res.body.data.tickets).toHaveLength(60);
    expect(res.body.data.tickets[0]).toEqual({ ticket: 1, questions: 50, custom: false });
  });

  it("adds a question to a ticket without touching the other tickets", async () => {
    const before = (await request(app).get(`${base()}/tickets/2`).set(as("teacher"))).body.data.questions.map((q: { id: string }) => q.id);
    const add = await request(app).post(`${base()}/tickets/1/questions`).set(as("teacher")).send({ ...question, lessonId });
    expect(add.status).toBe(201);

    const one = (await request(app).get(`${base()}/tickets/1`).set(as("teacher"))).body.data;
    expect(one.custom).toBe(true);
    expect(one.questions).toHaveLength(51);
    expect(one.questions[50]).toMatchObject({ text: question.text, correctIndex: 0, lessonId, explanation: "Qoida 1" });
    expect(one.lessons).toEqual([{ id: lessonId, title: "Belgilar" }]);

    // A student taking ticket 1 gets the teacher's question too.
    const served = await request(app).post("/api/tests/start").set(as("student")).send({ courseId, ticket: 1 });
    expect(served.body.data.test.totalQuestions).toBe(51);
    // Ticket 2 now draws from the remaining pool (ticket 1's questions are pinned) and never repeats them.
    const two = (await request(app).get(`${base()}/tickets/2`).set(as("teacher"))).body.data.questions.map((q: { id: string }) => q.id);
    expect(two).toHaveLength(50);
    expect(two.some((id: string) => one.questions.some((q: { id: string }) => q.id === id))).toBe(false);
    expect(before).toHaveLength(50);
  });

  it("edits and removes a question of the ticket", async () => {
    const one = (await request(app).get(`${base()}/tickets/1`).set(as("teacher"))).body.data;
    const target = one.questions[50];
    const edit = await request(app).put(`${base()}/questions/${target.id}`).set(as("teacher")).send({ ...question, text: `${run} Yangi matn`, correctIndex: 2 });
    expect(edit.status).toBe(200);
    expect(edit.body.data).toMatchObject({ text: `${run} Yangi matn`, correctIndex: 2, lessonId: null });

    const del = await request(app).delete(`${base()}/tickets/1/questions/${target.id}`).set(as("teacher"));
    expect(del.status).toBe(200);
    const after = (await request(app).get(`${base()}/tickets/1`).set(as("teacher"))).body.data;
    expect(after.questions).toHaveLength(50);
    // Kept for the students' history, only taken out of tests.
    expect(await prisma.question.findUnique({ where: { id: target.id }, select: { isPublished: true } })).toEqual({ isPublished: false });
  });

  it("gives a ticket back to automatic selection", async () => {
    const res = await request(app).delete(`${base()}/tickets/1/questions`).set(as("teacher"));
    expect(res.status).toBe(200);
    expect(res.body.data.reset).toBe(50);
    const list = await request(app).get(`${base()}/tickets`).set(as("teacher"));
    expect(list.body.data.tickets.every((t: { custom: boolean }) => !t.custom)).toBe(true);
  });

  it("refuses bad input, other courses' questions and students", async () => {
    expect((await request(app).post(`${base()}/tickets/61/questions`).set(as("teacher")).send(question)).status).toBe(400);
    expect((await request(app).post(`${base()}/tickets/1/questions`).set(as("teacher")).send({ ...question, correctIndex: 5 })).status).toBe(422);
    const foreign = await prisma.question.create({ data: { text: `${run} foreign`, options: ["a", "b"], correctIndex: 0 } });
    expect((await request(app).put(`${base()}/questions/${foreign.id}`).set(as("teacher")).send(question)).status).toBe(404);
    await prisma.question.delete({ where: { id: foreign.id } });
    expect((await request(app).get(`${base()}/tickets`).set(as("student"))).status).toBe(403);
  });
});
