import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ticketQuestions } from "../src/services/test.service";

describe("ticket question sets", () => {
  const pool = Array.from({ length: 120 }, (_, i) => ({ id: `q${i}` }));
  const ids = (t: number, p = pool) => ticketQuestions(p, "course-1", t).map((q) => q.id);

  it("serves the same 50 questions in the same order every time", () => {
    expect(ids(1)).toHaveLength(50);
    expect(ids(1)).toEqual(ids(1));
    expect(ids(1)).toEqual(ids(1, [...pool].reverse()));
  });

  it("gives consecutive tickets different questions while the pool is large enough", () => {
    const one = new Set(ids(1));
    expect(ids(2).some((id) => one.has(id))).toBe(false);
    expect(new Set(ids(2)).size).toBe(50);
  });

  it("uses the whole pool when it is smaller than a ticket", () => {
    const small = pool.slice(0, 30);
    expect(new Set(ids(7, small)).size).toBe(30);
    expect(ticketQuestions([], "course-1", 1)).toEqual([]);
  });
});

// Integration: tickets over HTTP. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `tk${Date.now()}`;

type Served = { id: string; options: string[] };

describe.skipIf(!enabled)("exam tickets", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const userIds: string[] = [];
  let token = "";
  let courseId = "";
  const auth = () => ({ Authorization: `Bearer ${token}` });
  // Every seeded question has "OK" as its correct option; the served option order is shuffled.
  const answer = (q: Served, correct: boolean) => ({ questionId: q.id, selectedIndex: q.options.findIndex((o) => (o === "OK") === correct) });

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    const res = await request(app).post("/api/auth/register").send({ name: "Ticket student", email: `${run}@example.com`, password: "Passw0rdOK" });
    userIds.push(res.body.data.user.id);
    token = res.body.data.token;
    courseId = (await prisma.course.create({ data: { title: `Tickets ${run}`, description: "d" } })).id;
    await prisma.question.createMany({ data: Array.from({ length: 60 }, (_, i) => ({ courseId, text: `${run} q${i}`, options: ["OK", "No", "Never"], correctIndex: 0 })) });
    await prisma.testConfig.create({ data: { courseId, questionCount: 10, maxAttempts: 1 } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.test.deleteMany({ where: { courseId } });
    await prisma.testConfig.deleteMany({ where: { courseId } });
    await prisma.question.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  const start = (body: object) => request(app).post("/api/tests/start").set(auth()).send(body);
  const tickets = () => request(app).get(`/api/tests/tickets?courseId=${courseId}`).set(auth());

  it("a ticket is a fixed set of 50 questions, outside the exam rules", async () => {
    const a = await start({ courseId, ticket: 2 });
    const b = await start({ courseId, ticket: 2 });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data.test.ticket).toBe(2);
    // The course exam asks for 10 questions and allows 1 attempt; tickets ignore both.
    expect(a.body.data.test.totalQuestions).toBe(50);
    expect(a.body.data.questions.map((q: Served) => q.id)).toEqual(b.body.data.questions.map((q: Served) => q.id));
  });

  it("refuses a ticket without a course or in practice mode", async () => {
    expect((await start({ ticket: 1 })).status).toBe(422);
    expect((await start({ courseId, ticket: 1, mode: "MISTAKES" })).status).toBe(422);
    expect((await start({ courseId, ticket: 61 })).status).toBe(422);
  });

  it("reports running, learned and to-retake tickets", async () => {
    let list = await tickets();
    expect(list.status).toBe(200);
    expect(list.body.data.count).toBe(60);
    expect(list.body.data.size).toBe(50);
    expect(list.body.data.tickets).toEqual([expect.objectContaining({ ticket: 2, status: "active" })]);

    const good = await start({ courseId, ticket: 3 });
    const goodQs: Served[] = good.body.data.questions;
    await request(app).post(`/api/tests/${good.body.data.test.id}/finish`).set(auth()).send({ answers: goodQs.map((q) => answer(q, true)) }).expect(200);

    const weak = await start({ courseId, ticket: 4 });
    const weakQs: Served[] = weak.body.data.questions;
    await request(app).post(`/api/tests/${weak.body.data.test.id}/finish`).set(auth()).send({ answers: weakQs.map((q, i) => answer(q, i % 2 === 0)) }).expect(200);

    list = await tickets();
    const byTicket = Object.fromEntries(list.body.data.tickets.map((t: { ticket: number }) => [t.ticket, t]));
    expect(byTicket[3]).toMatchObject({ status: "passed", score: 100 });
    expect(byTicket[4]).toMatchObject({ status: "retry", score: 50 });
  });
});
