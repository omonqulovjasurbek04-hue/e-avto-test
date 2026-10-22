import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: a video lesson completes only when the server has counted the video as really watched.
// Needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `w${Date.now()}`;

describe.skipIf(!enabled)("verified video watching", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let progress: typeof import("../src/services/progress.service");
  let userId = "";
  let token = "";
  let courseId = "";
  const lesson: Record<"video" | "next" | "text", string> = { video: "", next: "", text: "" };
  const bearer = () => ({ Authorization: `Bearer ${token}` });
  // 40 s video: 36 s must be watched (90 %) and the end reached.
  const DURATION = 40;

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    progress = await import("../src/services/progress.service");
    const res = await request(app).post("/api/auth/register").send({ name: "Watcher", email: `${run}@example.com`, password: "Passw0rdOK" });
    userId = res.body.data.user.id;
    token = res.body.data.token;
    courseId = (await prisma.course.create({ data: { title: `C ${run}`, description: "d", isPublished: true } })).id;
    lesson.video = (await prisma.lesson.create({ data: { courseId, title: "Video", order: 1, isPublished: true } })).id;
    lesson.next = (await prisma.lesson.create({ data: { courseId, title: "Next", order: 2, isPublished: true } })).id;
    lesson.text = (await prisma.lesson.create({ data: { courseId, title: "Text", order: 3, isPublished: true } })).id;
    await prisma.videoAsset.create({
      data: { storageKey: `${run}-hls`.padEnd(36, "0").slice(0, 36), format: "HLS", lessonId: lesson.video, durationSec: DURATION, mimeType: "application/vnd.apple.mpegurl", sizeBytes: 1, createdById: userId },
    });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.videoAsset.deleteMany({ where: { lessonId: lesson.video } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("a client claiming 100 % does not complete a video lesson; a text lesson still completes that way", async () => {
    const res = await request(app).put(`/api/progress/${lesson.video}`).set(bearer()).send({ percent: 100 });
    expect(res.body.data).toMatchObject({ percent: 99, completed: false });
    expect((await request(app).put(`/api/progress/${lesson.text}`).set(bearer()).send({ percent: 100 })).body.data.completed).toBe(true);
  });

  it("the lesson tells the page its watch state and the next lesson", async () => {
    const res = await request(app).get(`/api/lessons/${lesson.video}`).set(bearer());
    expect(res.body.data.watch).toEqual({ watchedSeconds: 0, requiredSeconds: 36, durationSec: DURATION, completed: false });
    expect(res.body.data.nextLesson).toMatchObject({ id: lesson.next, title: "Next", locked: false });
  });

  it("skipping to the end or reporting more than real time allows does not count", async () => {
    const t0 = new Date("2027-01-01T10:00:00Z");
    // Seek straight to the end after a few seconds of playback.
    let w = await progress.recordVideoWatch(userId, "USER", lesson.video, { seconds: 3, position: DURATION }, t0);
    expect(w.completed).toBe(false);
    // One second later the client claims 30 s were played: at most (1 + 2 s slack) x 2 is credited.
    w = await progress.recordVideoWatch(userId, "USER", lesson.video, { seconds: 30, position: DURATION }, new Date(t0.getTime() + 1000));
    expect(w.watchedSeconds).toBe(9);
    expect(w.completed).toBe(false);
  });

  it("watching through to the end completes the lesson and the course progress", async () => {
    await prisma.lessonProgress.update({ where: { userId_lessonId: { userId, lessonId: lesson.video } }, data: { watchedSeconds: 0, lastWatchAt: null } });
    const t0 = new Date("2027-01-02T10:00:00Z").getTime();
    let w = await progress.recordVideoWatch(userId, "USER", lesson.video, { seconds: 10, position: 10 }, new Date(t0));
    for (let i = 1; i <= 3; i++) {
      w = await progress.recordVideoWatch(userId, "USER", lesson.video, { seconds: 10, position: Math.min(10 * (i + 1), DURATION) }, new Date(t0 + i * 10_000));
    }
    expect(w).toEqual({ watchedSeconds: 40, requiredSeconds: 36, durationSec: DURATION, completed: true });
    const lp = await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId: lesson.video } } });
    expect(lp).toMatchObject({ percent: 100, completed: true });
    expect((await prisma.progress.findUniqueOrThrow({ where: { userId_courseId: { userId, courseId } } })).completedLessons).toBe(2);
  });

  it("a percent report racing the final heartbeat never turns the completed lesson back", async () => {
    // Regression: both requests used to read "not completed" and the slower one wrote completed=false back.
    for (let round = 0; round < 5; round++) {
      await prisma.lessonProgress.update({ where: { userId_lessonId: { userId, lessonId: lesson.video } }, data: { completed: false, percent: 90, watchedSeconds: 38, lastWatchAt: null } });
      const at = new Date(Date.UTC(2027, 0, 3, 10, round));
      await Promise.all([
        progress.recordVideoWatch(userId, "USER", lesson.video, { seconds: 2, position: DURATION }, at),
        progress.updateLessonProgress(userId, lesson.video, { percent: 100 }, "USER"),
      ]);
      const lp = await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId: lesson.video } } });
      expect(lp).toMatchObject({ completed: true, percent: 100 });
    }
  });

  it("the heartbeat endpoint validates input and refuses lessons without a video", async () => {
    expect((await request(app).post(`/api/progress/${lesson.video}/watch`).set(bearer()).send({ seconds: -1, position: 0 })).status).toBe(422);
    expect((await request(app).post(`/api/progress/${lesson.text}/watch`).set(bearer()).send({ seconds: 5, position: 5 })).status).toBe(404);
    const ok = await request(app).post(`/api/progress/${lesson.video}/watch`).set(bearer()).send({ seconds: 5, position: 5 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.completed).toBe(true);
  });
});
