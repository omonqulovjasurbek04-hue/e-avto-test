import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { publicName } from "../src/services/leaderboard.service";

// Integration (PostgreSQL): leaderboard points, anti-farming, consent and privacy.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
process.env.LEADERBOARD_CACHE_SECONDS = "0";
const run = `lb${Date.now()}`;

describe("publicName", () => {
  it("keeps the first name and the initial of the last one", () => {
    expect(publicName("Azizbek Karimov")).toBe("Azizbek K.");
    expect(publicName("  madina  aliyeva  qizi ")).toBe("madina Q.");
    expect(publicName("Sardor")).toBe("Sardor");
    expect(publicName("   ")).toBe("O'quvchi");
  });
});

describe.skipIf(!enabled)("leaderboard", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const tok: Record<string, string> = {};
  const ids: Record<string, string> = {};
  let courseA = "";
  let courseB = "";

  const signup = async (k: string, name: string, role?: "ADMIN") => {
    const res = await request(app).post("/api/auth/register").send({ name, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids[k] = res.body.data.user.id;
    tok[k] = res.body.data.token;
    if (role) await prisma.user.update({ where: { id: ids[k] }, data: { role } });
  };
  let minute = 0;
  const attempt = (userId: string, courseId: string, correct: number, total = 10, passScore = 70) => {
    minute += 1;
    const score = Math.round((correct / total) * 100);
    return prisma.test.create({
      data: { userId, courseId, totalQuestions: total, correctAnswers: correct, wrongAnswers: total - correct, score, passed: score >= passScore, passScore, startedAt: new Date(Date.UTC(2026, 0, 1, 0, minute)), finishedAt: new Date(Date.UTC(2026, 0, 1, 0, minute, 30)) },
    });
  };
  const board = (q = "", token?: string) => {
    const r = request(app).get(`/api/leaderboard${q}`);
    return (token ? r.set("Authorization", `Bearer ${token}`) : r).then((res) => res.body.data);
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("ace", "Azizbek Karimov");
    await signup("climber", "Madina Aliyeva");
    await signup("shy", "Sardor Rahimov");
    await signup("admin", "Admin Person", "ADMIN");
    courseA = (await prisma.course.create({ data: { title: `C ${run} A`, description: "d" } })).id;
    courseB = (await prisma.course.create({ data: { title: `C ${run} B`, description: "d" } })).id;

    // ace: perfect first try (10*10 + 20 + 10 = 130), then farms the same test three more times.
    await attempt(ids.ace, courseA, 10);
    for (let i = 0; i < 3; i++) await attempt(ids.ace, courseA, 10);
    // climber: fails first (6/10), then 9/10 → best 90, no first-try bonus; plus course B first try 8/10 → 80 + 10.
    await attempt(ids.climber, courseA, 6);
    await attempt(ids.climber, courseA, 9);
    await attempt(ids.climber, courseB, 8);
    // shy: strong but has not agreed to be listed.
    await attempt(ids.shy, courseA, 10);
    await attempt(ids.shy, courseB, 10);

    for (const k of ["ace", "climber"]) {
      expect((await request(app).put("/api/users/me/leaderboard").set("Authorization", `Bearer ${tok[k]}`).send({ visible: true })).status).toBe(200);
    }
  });

  afterAll(async () => {
    if (enabled) {
      await prisma.course.deleteMany({ where: { id: { in: [courseA, courseB] } } });
      await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
      await prisma.$disconnect();
    }
  });

  it("scores the best attempt per course plus a one-time first-try bonus; re-taking does not farm points", async () => {
    const data = await board(`?courseId=${courseA}`);
    const ace = data.entries.find((e: { name: string }) => e.name === "Azizbek K.");
    expect(ace).toMatchObject({ points: 130, tests: 4, accuracy: 100 });
    const climber = data.entries.find((e: { name: string }) => e.name === "Madina A.");
    expect(climber).toMatchObject({ points: 90, tests: 2, accuracy: 75 });

    const all = await board();
    expect(all.entries.find((e: { name: string }) => e.name === "Madina A.").points).toBe(90 + 90);
    expect(all.rules).toEqual({ perCorrect: 10, perfectBonus: 20, firstTryPassBonus: 10 });
  });

  it("lists only students who agreed, under a short name, but counts everyone in the totals", async () => {
    const data = await board(`?courseId=${courseB}`);
    expect(data.entries.map((e: { name: string }) => e.name)).toEqual(["Madina A."]);
    expect(JSON.stringify(data)).not.toContain("Rahimov");
    expect(JSON.stringify(data)).not.toContain("Aliyeva");
    expect(JSON.stringify(data)).not.toContain(ids.climber);
    expect(data.stats).toMatchObject({ students: 2, testsTaken: 2 });
  });

  it("shows a hidden student their own place privately and lets them opt in", async () => {
    const hidden = await board(`?courseId=${courseB}`, tok.shy);
    expect(hidden.me).toMatchObject({ rank: 1, points: 130, visible: false });
    expect(hidden.entries.some((e: { isMe: boolean }) => e.isMe)).toBe(false);

    await request(app).put("/api/users/me/leaderboard").set("Authorization", `Bearer ${tok.shy}`).send({ visible: true });
    const shown = await board(`?courseId=${courseB}`, tok.shy);
    expect(shown.entries[0]).toMatchObject({ name: "Sardor R.", rank: 1, isMe: true });
    await request(app).put("/api/users/me/leaderboard").set("Authorization", `Bearer ${tok.shy}`).send({ visible: false });
  });

  it("sorts by accuracy or by number of tests on request", async () => {
    const byTests = await board(`?courseId=${courseA}&sort=tests`);
    expect(byTests.entries[0].name).toBe("Azizbek K.");
    const byAccuracy = await board(`?courseId=${courseA}&sort=accuracy`);
    expect(byAccuracy.entries.map((e: { accuracy: number }) => e.accuracy)).toEqual([100, 75]);
    expect((await request(app).get("/api/leaderboard?sort=evil")).status).toBe(422);
  });

  it("gives staff the full list with real names; students cannot open it", async () => {
    const res = await request(app).get(`/api/admin/reports/leaderboard?courseId=${courseA}&period=all`).set("Authorization", `Bearer ${tok.admin}`);
    expect(res.status).toBe(200);
    expect(res.body.data.entries.map((e: { name: string }) => e.name)).toEqual(["Azizbek Karimov", "Sardor Rahimov", "Madina Aliyeva"]);
    expect(res.body.data.entries.find((e: { name: string }) => e.name === "Sardor Rahimov").visible).toBe(false);
    expect((await request(app).get("/api/admin/reports/leaderboard").set("Authorization", `Bearer ${tok.ace}`)).status).toBe(403);
  });
});
