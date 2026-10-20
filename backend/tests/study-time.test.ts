import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: real study time (lesson/test pages report, the server credits only elapsed time),
// the weekly summary, and the student's group rhythm (juft/toq kunlar) on the dashboard. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `st${Date.now()}`;
const DAY = 86_400_000;

describe.skipIf(!enabled)("study time and student groups", () => {
  let prisma: typeof import("../src/config/database").prisma;
  let study: typeof import("../src/services/studyTime.service");
  let app: import("express").Application;
  let token = "";
  const uid: Record<string, string> = {};
  const groups: string[] = [];
  let courseId = "";

  beforeAll(async () => {
    ({ prisma } = await import("../src/config/database"));
    study = await import("../src/services/studyTime.service");
    ({ default: app } = await import("../src/app"));
    const { generateToken } = await import("../src/utils/jwt");
    for (const k of ["student", "teacher", "other"]) {
      const u = await prisma.user.create({ data: { name: `${run} ${k}`, email: `${run}-${k}@example.com`, role: k === "teacher" ? "TEACHER" : "USER" } });
      uid[k] = u.id;
    }
    const s = await prisma.user.findUniqueOrThrow({ where: { id: uid.student } });
    token = generateToken({ userId: s.id, role: s.role, tv: s.tokenVersion });
    courseId = (await prisma.course.create({ data: { title: `Course ${run}`, description: "d" } })).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.teacherGroup.deleteMany({ where: { id: { in: groups } } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(uid) } } });
  });

  it("credits only the time that really passed, whatever the page reports", async () => {
    const t0 = new Date("2026-10-19T08:00:00Z"); // Monday, 13:00 in Tashkent
    expect((await study.recordStudyTime(uid.other, "lesson", 30, t0)).credited).toBe(30);
    // 10 s later a second tab claims 30 s: only 10 count.
    expect((await study.recordStudyTime(uid.other, "test", 30, new Date(t0.getTime() + 10_000))).credited).toBe(10);
    // A huge claim is capped per report.
    expect((await study.recordStudyTime(uid.other, "lesson", 600, new Date(t0.getTime() + 3_600_000))).credited).toBe(study.MAX_BEAT_SECONDS);
    const row = await prisma.studyTime.findUniqueOrThrow({ where: { userId_day: { userId: uid.other, day: study.tashkentDay(t0) } } });
    expect(row).toMatchObject({ lessonSeconds: 90, testSeconds: 10 });
  });

  it("counts days in Tashkent time and sums the current week Monday–Sunday", async () => {
    // 20:00 UTC on Sunday 18 Oct is already Monday 19 Oct in Tashkent.
    expect(study.tashkentDay(new Date("2026-10-18T20:00:00Z")).toISOString().slice(0, 10)).toBe("2026-10-19");
    const week = await study.weekStudyTime(uid.other, new Date("2026-10-21T08:00:00Z"));
    expect(week.days.map((d) => d.date)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(week.days[0]).toEqual({ date: "2026-10-19", lessonMinutes: 2, testMinutes: 0 });
    expect(week.totalMinutes).toBe(2);
  });

  it("API: reports study time, returns the week and puts it into the statistics", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).post("/api/me/study-time").set(auth).send({ kind: "video", seconds: 30 })).status).toBe(422);
    expect((await request(app).post("/api/me/study-time").send({ kind: "lesson", seconds: 30 })).status).toBe(401);
    const res = await request(app).post("/api/me/study-time").set(auth).send({ kind: "lesson", seconds: 45 });
    expect(res.status).toBe(200);
    expect(res.body.data.credited).toBe(45);
    // Pretend 20 more minutes were recorded today.
    await prisma.studyTime.update({ where: { userId_day: { userId: uid.student, day: study.tashkentDay(new Date()) } }, data: { testSeconds: 1200 } });
    const week = (await request(app).get("/api/me/study-time/week").set(auth)).body.data;
    expect(week.totalMinutes).toBe(21);
    expect(week.days.find((d: { date: string }) => d.date === week.today)).toMatchObject({ lessonMinutes: 1, testMinutes: 20 });
    const stats = (await request(app).get("/api/statistics").set(auth)).body.data;
    expect(stats.learningTime).toBeGreaterThanOrEqual(21);
  });

  it("describes the student's groups as juft/toq kunlar with the usual time", async () => {
    const make = async (name: string, weekdaysUtcStarts: string[]) => {
      const g = await prisma.teacherGroup.create({ data: { name: `${run} ${name}`, courseId, teacherId: uid.teacher, startDate: new Date() } });
      groups.push(g.id);
      await prisma.groupMembership.create({ data: { groupId: g.id, studentId: uid.student } });
      for (const iso of weekdaysUtcStarts) {
        const startsAt = new Date(iso);
        await prisma.scheduleSlot.create({ data: { groupId: g.id, startsAt, endsAt: new Date(startsAt.getTime() + 90 * 60_000) } });
      }
      return g.id;
    };
    const base = Date.now() + 2 * DAY;
    // Find the coming Monday (Tashkent) and build Mon/Wed/Fri 09:00 and Tue/Thu/Sat 14:00 lessons.
    const mondayTk = new Date(base);
    while (new Date(mondayTk.getTime() + 5 * 3_600_000).getUTCDay() !== 1) mondayTk.setTime(mondayTk.getTime() + DAY);
    const at = (dayOffset: number, hourTk: number) => {
      const d = new Date(Math.floor((mondayTk.getTime() + 5 * 3_600_000) / DAY) * DAY + dayOffset * DAY + (hourTk - 5) * 3_600_000);
      return d.toISOString();
    };
    await make("A Toq", [at(0, 9), at(2, 9), at(4, 9)]);
    await make("B Juft", [at(1, 14), at(3, 14), at(5, 14)]);
    await make("C Other", [at(0, 18), at(1, 18)]);

    const res = await request(app).get("/api/me/groups").set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const mine = res.body.data.filter((g: { name: string }) => g.name.startsWith(run));
    expect(mine).toEqual([
      expect.objectContaining({ name: `${run} A Toq`, days: "ODD", weekdays: [1, 3, 5], time: "09:00–10:30", course: `Course ${run}` }),
      expect.objectContaining({ name: `${run} B Juft`, days: "EVEN", weekdays: [2, 4, 6], time: "14:00–15:30" }),
      expect.objectContaining({ name: `${run} C Other`, days: "CUSTOM", weekdays: [1, 2], time: "18:00–19:30" }),
    ]);
  });
});
