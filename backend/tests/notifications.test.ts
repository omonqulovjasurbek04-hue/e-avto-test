import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// SMTP is replaced by a controllable fake: no real mail is ever sent from tests.
const mail = vi.hoisted(() => ({ configured: true, send: vi.fn(async (_m: { to: string; subject: string; text: string }) => true) }));
vi.mock("../src/services/mail.service", () => ({ isMailConfigured: () => mail.configured, sendMail: mail.send }));

// Integration: needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `n${Date.now()}`;

describe.skipIf(!enabled)("notifications: preferences, e-mail delivery, announcements", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let svc: typeof import("../src/services/notification.service");
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  const email = (k: string) => `${run}-${k}@example.com`;
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });
  let courseId = "";
  let groupId = "";
  let slotId = "";

  const signup = async (k: string, role?: "ADMIN" | "TEACHER" | "MODERATOR") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run}-${k}`, email: email(k), password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    tok[k] = res.body.data.token;
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
  };
  const sentTo = (to: string) => mail.send.mock.calls.filter((c) => c[0].to === to);
  const row = (userId: string, dedupeKey: string) => prisma.notification.findUnique({ where: { userId_dedupeKey: { userId, dedupeKey } } });

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    svc = await import("../src/services/notification.service");
    await signup("admin", "ADMIN");
    await signup("moderator", "MODERATOR");
    await signup("teacher", "TEACHER");
    for (const k of ["a", "b", "outsider"]) await signup(k);

    courseId = (await prisma.course.create({ data: { title: `N ${run}`, description: "d" } })).id;
    const g = await request(app).post("/api/admin/groups").set(bearer("admin")).send({ name: `Grp ${run}`, courseId, teacherId: uid.teacher, startDate: "2026-09-01", capacity: 5 });
    groupId = g.body.data.id;
    for (const k of ["a", "b"]) await request(app).post(`/api/admin/groups/${groupId}/members`).set(bearer("admin")).send({ studentId: uid[k] });
    const slots = await request(app).post(`/api/admin/groups/${groupId}/slots`).set(bearer("admin")).send({ startsAt: "2026-12-07T05:00:00Z", endsAt: "2026-12-07T06:00:00Z", room: `R-${run}` });
    slotId = slots.body.data[0].id;
  });

  beforeEach(() => {
    mail.configured = true;
    mail.send.mockReset();
    mail.send.mockResolvedValue(true);
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("creating the group schedule already told the members, once each", async () => {
    for (const k of ["a", "b"]) {
      const list = await request(app).get("/api/me/notifications").set(bearer(k));
      expect(list.body.data.items.filter((n: { type: string }) => n.type === "SCHEDULE_NEW")).toHaveLength(1);
    }
    expect((await request(app).get("/api/me/notifications").set(bearer("outsider"))).body.data.items).toHaveLength(0);
  });

  it("honours preferences: attendance off, in-app off with e-mail on, everything off", async () => {
    await svc.savePreferences(uid.a, { attendance: false });
    expect(await svc.notify({ userId: uid.a, type: "ATTENDANCE_ABSENT", category: "attendance", dedupeKey: `${run}-att`, title: "t", body: "b", email: true })).toBeNull();
    expect(await row(uid.a, `${run}-att`)).toBeNull();

    await svc.savePreferences(uid.b, { inApp: false, email: true });
    const emailId = await svc.notify({ userId: uid.b, type: "X", dedupeKey: `${run}-mailonly`, title: "Only mail", body: "b", email: true });
    expect(emailId).not.toBeNull();
    const hidden = await prisma.notification.findUniqueOrThrow({ where: { id: emailId! } });
    expect(hidden.inApp).toBe(false);
    const shown = (await request(app).get("/api/me/notifications").set(bearer("b"))).body.data.items.map((n: { title: string }) => n.title);
    expect(shown).not.toContain("Only mail");

    await svc.savePreferences(uid.b, { inApp: false, email: false });
    expect(await svc.notify({ userId: uid.b, type: "X", dedupeKey: `${run}-none`, title: "t", body: "b", email: true })).toBeNull();
    expect(await row(uid.b, `${run}-none`)).toBeNull();
    await svc.savePreferences(uid.b, { inApp: true, email: true });
  });

  it("the same event never produces a second notice or a second e-mail", async () => {
    const input = { userId: uid.a, type: "X", dedupeKey: `${run}-dup`, title: "Once", body: "b", email: true };
    const first = await svc.notify(input);
    expect(first).not.toBeNull();
    expect(await svc.notify(input)).toBeNull();
    expect(await prisma.notification.count({ where: { userId: uid.a, dedupeKey: `${run}-dup` } })).toBe(1);
  });

  it("delivers e-mail only when SMTP works, records SENT, and keeps the subject on one line", async () => {
    const id = await svc.notify({ userId: uid.a, type: "X", dedupeKey: `${run}-send`, title: "Salom\r\nBcc: evil@example.com", body: "Matn", email: true });
    expect(await svc.deliverEmail(id!)).toBe("SENT");
    const calls = sentTo(email("a"));
    expect(calls).toHaveLength(1);
    expect(calls[0][0].subject).not.toMatch(/[\r\n]/);
    const saved = await prisma.notification.findUniqueOrThrow({ where: { id: id! } });
    expect(saved.emailStatus).toBe("SENT");
    expect(saved.emailSentAt).not.toBeNull();
    expect(await svc.deliverEmail(id!)).toBe("NOOP"); // never sent twice
    expect(sentTo(email("a"))).toHaveLength(1);
  });

  it("without SMTP the notice is marked SKIPPED, never SENT", async () => {
    mail.configured = false;
    const id = await svc.notify({ userId: uid.a, type: "X", dedupeKey: `${run}-nosmtp`, title: "No mail server", body: "b", email: true });
    expect(id).toBeNull();
    const saved = await row(uid.a, `${run}-nosmtp`);
    expect(saved?.emailStatus).toBe("SKIPPED");
    expect(mail.send).not.toHaveBeenCalled();
    expect((await request(app).get("/api/me/notifications").set(bearer("a"))).body.data.items.map((n: { title: string }) => n.title)).toContain("No mail server");
  });

  it("a failing mail server is retried a limited number of times", async () => {
    mail.send.mockResolvedValue(false);
    const id = await svc.notify({ userId: uid.a, type: "X", dedupeKey: `${run}-flaky`, title: "Flaky", body: "b", email: true });
    expect(await svc.deliverEmail(id!)).toBe("FAILED");
    for (let i = 0; i < 4; i++) await svc.processEmailQueue();
    const saved = await prisma.notification.findUniqueOrThrow({ where: { id: id! } });
    expect(saved.emailStatus).toBe("FAILED");
    expect(saved.emailAttempts).toBe(svc.MAX_EMAIL_ATTEMPTS);
    // Other queued notices of this user (schedule news) are delivered by the same sweeps; count only this one.
    expect(sentTo(email("a")).filter((c) => c[0].subject === "Flaky")).toHaveLength(svc.MAX_EMAIL_ATTEMPTS);

    const id2 = await svc.notify({ userId: uid.b, type: "X", dedupeKey: `${run}-recover`, title: "Recovers", body: "b", email: true });
    mail.send.mockResolvedValueOnce(false);
    expect(await svc.deliverEmail(id2!)).toBe("FAILED");
    mail.send.mockResolvedValue(true);
    await svc.processEmailQueue();
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: id2! } })).emailStatus).toBe("SENT");
  });

  it("cancelling a lesson notifies the group members and nobody else", async () => {
    const before = (await prisma.notification.count({ where: { type: "SCHEDULE_CANCELLED", userId: { in: [uid.a, uid.b, uid.outsider] } } }));
    const res = await request(app).patch(`/api/slots/${slotId}`).set(bearer("admin")).send({ status: "CANCELLED" });
    expect(res.status).toBe(200);
    const after = await prisma.notification.findMany({ where: { type: "SCHEDULE_CANCELLED", userId: { in: [uid.a, uid.b, uid.outsider] } } });
    expect(after.length - before).toBe(2);
    expect(after.some((n) => n.userId === uid.outsider)).toBe(false);
  });

  it("only staff with content rights can announce; text is stored as plain text", async () => {
    const body = { title: "Muhim e'lon", body: "Ertaga <script>alert(1)</script>dars bo'lmaydi", audience: { type: "group", groupId } };
    expect((await request(app).post("/api/admin/cms/announcements").set(bearer("a")).send(body)).status).toBe(403);
    expect((await request(app).post("/api/admin/cms/announcements").set(bearer("teacher")).send(body)).status).toBe(403);

    const ok = await request(app).post("/api/admin/cms/announcements").set(bearer("moderator")).send(body);
    expect(ok.status).toBe(201);
    expect(ok.body.data.recipients).toBe(2);
    const mine = await prisma.notification.findFirstOrThrow({ where: { userId: uid.a, type: "ANNOUNCEMENT" } });
    expect(mine.body).not.toContain("<script>");
    expect(await prisma.notification.count({ where: { userId: uid.outsider, type: "ANNOUNCEMENT" } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: "notification.announce", actorId: uid.moderator } })).toBe(1);
  });

  it("validates announcements and the preference API", async () => {
    expect((await request(app).post("/api/admin/cms/announcements").set(bearer("admin")).send({ title: "x", body: "y", audience: { type: "everyone" } })).status).toBe(422);
    expect((await request(app).put("/api/me/notification-preferences").set(bearer("a")).send({ isAdmin: true })).status).toBe(422);
    const saved = await request(app).put("/api/me/notification-preferences").set(bearer("a")).send({ email: false });
    expect(saved.status).toBe(200);
    expect(saved.body.data.email).toBe(false);
    expect((await request(app).get("/api/me/notification-preferences").set(bearer("a"))).body.data.email).toBe(false);
  });
});

describe.skipIf(!enabled)("notifications from tests and attendance", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let courseId = "";
  let groupId = "";
  let slotId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });
  const tag = `${run}x`;

  const signup = async (k: string, role?: "ADMIN" | "TEACHER") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${tag}-${k}`, email: `${tag}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    tok[k] = res.body.data.token;
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("admin", "ADMIN");
    await signup("teacher", "TEACHER");
    await signup("present");
    await signup("absent");
    await signup("muted");
    courseId = (await prisma.course.create({ data: { title: `T ${tag}`, description: "d" } })).id;
    await prisma.question.createMany({ data: Array.from({ length: 3 }, (_, i) => ({ courseId, text: `${tag} q${i}`, options: ["A", "B"], correctIndex: 0 })) });
    const g = await request(app).post("/api/admin/groups").set(bearer("admin")).send({ name: `G ${tag}`, courseId, teacherId: uid.teacher, startDate: "2026-09-01", capacity: 5 });
    groupId = g.body.data.id;
    for (const k of ["present", "absent", "muted"]) await request(app).post(`/api/admin/groups/${groupId}/members`).set(bearer("admin")).send({ studentId: uid[k] });
    const s = await request(app).post(`/api/admin/groups/${groupId}/slots`).set(bearer("admin")).send({ startsAt: "2027-01-11T05:00:00Z", endsAt: "2027-01-11T06:00:00Z", room: `X-${tag}` });
    slotId = s.body.data[0].id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.test.deleteMany({ where: { courseId } });
    await prisma.teacherGroup.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.question.deleteMany({ where: { text: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("finishing a test tells the student once, even if the result is submitted twice", async () => {
    const start = await request(app).post("/api/tests/start").set(bearer("present")).send({ courseId });
    expect(start.status).toBe(201);
    const testId = start.body.data.test.id as string;
    expect((await request(app).post(`/api/tests/${testId}/finish`).set(bearer("present")).send({})).status).toBe(200);
    expect((await request(app).post(`/api/tests/${testId}/finish`).set(bearer("present")).send({})).status).toBe(200);
    const inbox = (await request(app).get("/api/me/notifications").set(bearer("present"))).body.data.items as { type: string; body: string }[];
    const results = inbox.filter((n) => n.type === "TEST_RESULT");
    expect(results).toHaveLength(1);
    expect(results[0].body).toMatch(/Natija: \d+%/);
  });

  it("marking a student absent notifies only that student, unless they turned attendance notices off", async () => {
    await request(app).put("/api/me/notification-preferences").set(bearer("muted")).send({ attendance: false });
    const res = await request(app).put(`/api/slots/${slotId}/attendance`).set(bearer("teacher")).send({
      records: [
        { studentId: uid.present, status: "PRESENT" },
        { studentId: uid.absent, status: "ABSENT" },
        { studentId: uid.muted, status: "ABSENT" },
      ],
    });
    expect(res.status).toBe(200);
    const count = (k: string) => prisma.notification.count({ where: { userId: uid[k], type: "ATTENDANCE_ABSENT" } });
    expect(await count("absent")).toBe(1);
    expect(await count("present")).toBe(0);
    expect(await count("muted")).toBe(0);

    // Saving the same marks again must not create a second notice.
    await request(app).put(`/api/slots/${slotId}/attendance`).set(bearer("teacher")).send({ records: [{ studentId: uid.absent, status: "ABSENT" }] });
    expect(await count("absent")).toBe(1);
  });
});
