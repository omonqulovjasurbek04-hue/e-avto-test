import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Integration: a missed class sends a site notice and up to 3 Telegram reminders
// (+1 hour, next day at the lesson time, then 20:00 that evening in Tashkent). Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `abs${Date.now()}`;
const HOUR = 60 * 60 * 1000;

describe("Telegram reminder schedule", () => {
  it("uses the Tashkent schedule and the original lesson time", async () => {
    const { telegramReminderAt } = await import("../src/services/notification.service");
    const createdAt = new Date("2025-01-15T12:00:00.000Z");
    const lessonAt = new Date("2025-01-15T03:30:00.000Z");
    expect(telegramReminderAt(createdAt, 0)).toEqual(new Date("2025-01-15T13:00:00.000Z"));
    expect(telegramReminderAt(createdAt, 1, lessonAt)).toEqual(new Date("2025-01-16T03:30:00.000Z"));
    expect(telegramReminderAt(createdAt, 2, lessonAt)).toEqual(new Date("2025-01-16T15:00:00.000Z"));
    expect(telegramReminderAt(createdAt, 3)).toBeNull();
  });
});

describe.skipIf(!enabled)("missed class reminders", () => {
  let prisma: typeof import("../src/config/database").prisma;
  let attendance: typeof import("../src/services/attendance.service");
  let notifications: typeof import("../src/services/notification.service");
  const sent: { chat_id: string; text: string }[] = [];
  const uid: Record<string, string> = {};
  let groupId = "";
  let courseId = "";

  const user = async (k: string, data: Record<string, unknown> = {}) => {
    const u = await prisma.user.create({ data: { name: `${run}-${k}`, email: `${run}-${k}@example.com`, ...data } });
    uid[k] = u.id;
  };
  const slot = async (hoursAgo: number) =>
    (
      await prisma.scheduleSlot.create({
        data: { groupId, startsAt: new Date(Date.now() - hoursAgo * HOUR), endsAt: new Date(Date.now() - (hoursAgo - 1) * HOUR) },
      })
    ).id;
  const mark = (slotId: string, studentId: string, status: "ABSENT" | "PRESENT", reason?: string) =>
    attendance.markAttendance({ userId: uid.teacher, role: "TEACHER" }, slotId, [{ studentId, status }], reason);
  const absentNotice = (studentId: string, slotId: string) =>
    prisma.notification.findFirstOrThrow({ where: { userId: studentId, dedupeKey: { startsWith: "absent:" }, createdAt: { gt: new Date(0) } }, orderBy: { createdAt: "desc" } }).then(async (n) => {
      const session = await prisma.attendanceSession.findUniqueOrThrow({ where: { slotId } });
      expect(n.dedupeKey).toBe(`absent:${session.id}`);
      return n;
    });
  const makeReminderDue = (id: string) =>
    prisma.notification.update({ where: { id }, data: { telegramNextAt: new Date(Date.now() - 1000) } });

  beforeAll(async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { body?: string }) => {
        const body = init?.body ? JSON.parse(init.body) : {};
        if (body.text) sent.push({ chat_id: String(body.chat_id), text: String(body.text) });
        return { json: async () => ({ ok: true, result: {} }) };
      })
    );
    ({ prisma } = await import("../src/config/database"));
    attendance = await import("../src/services/attendance.service");
    notifications = await import("../src/services/notification.service");
    await user("teacher", { role: "TEACHER" });
    await user("linked", { telegramId: `${run}-tg1` });
    await user("unlinked");
    courseId = (await prisma.course.create({ data: { title: `Abs ${run}`, description: "d" } })).id;
    groupId = (await prisma.teacherGroup.create({ data: { name: `G ${run}`, courseId, teacherId: uid.teacher, startDate: new Date() } })).id;
    for (const k of ["linked", "unlinked"]) await prisma.groupMembership.create({ data: { groupId, studentId: uid[k] } });
  });

  beforeEach(() => {
    sent.length = 0;
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (!enabled) return;
    await prisma.notification.deleteMany({ where: { userId: { in: Object.values(uid) } } });
    await prisma.teacherGroup.deleteMany({ where: { id: groupId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(uid) } } });
    await prisma.$disconnect();
  });

  it("sends reminders after one hour, then at lesson time and 20:00 the next day", async () => {
    const s = await slot(5);
    await mark(s, uid.linked, "ABSENT");
    await notifications.processTelegramReminders();
    const n = await absentNotice(uid.linked, s);
    expect(n.inApp).toBe(true); // shown under "Bildirishnomalar"
    expect(sent).toHaveLength(0);
    expect(n.telegramNextAt?.getTime()).toBe(n.createdAt.getTime() + HOUR);

    await makeReminderDue(n.id);
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(1);
    expect(sent[0].chat_id).toBe(`${run}-tg1`);
    expect(sent[0].text).not.toMatch(/Eslatma/);
    const firstAt = notifications.telegramReminderAt(n.createdAt, 1, n.telegramLessonAt);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).telegramNextAt).toEqual(firstAt);

    await makeReminderDue(n.id);
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(2);
    expect(sent[1].text).toMatch(/^Eslatma \(2\/3\)/);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).telegramNextAt).toEqual(
      notifications.telegramReminderAt(n.createdAt, 2, n.telegramLessonAt)
    );

    await makeReminderDue(n.id);
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(3);
    expect(sent[2].text).toMatch(/^Eslatma \(3\/3\)/);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).telegramNextAt).toBeNull();
  });

  it("reading the notice on the site stops the remaining reminders", async () => {
    const s = await slot(4);
    await mark(s, uid.linked, "ABSENT");
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(0);
    const n = await absentNotice(uid.linked, s);
    await prisma.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
    await makeReminderDue(n.id);
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(0);
  });

  it("a mark corrected to PRESENT cancels the reminders; no Telegram link means site notice only", async () => {
    const s = await slot(3);
    await mark(s, uid.linked, "ABSENT");
    await mark(s, uid.linked, "PRESENT", "Kech keldi, aslida darsda bo'lgan");
    const n = await absentNotice(uid.linked, s);
    expect(n.telegramNextAt).toBeNull();

    sent.length = 0;
    await mark(s, uid.unlinked, "ABSENT");
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(0);
    const site = await prisma.notification.findFirst({ where: { userId: uid.unlinked, type: "ATTENDANCE_ABSENT" } });
    expect(site?.inApp).toBe(true);
    expect(site?.telegramNextAt).toBeNull();
  });

  it("sends a teacher-written message only to linked students marked absent in that lesson", async () => {
    const s = await slot(2);
    await mark(s, uid.linked, "ABSENT");
    await mark(s, uid.unlinked, "ABSENT");
    const todayMessage = "Bugungi xabar.";
    const tomorrowMessage = "Ertangi alohida eslatma.";

    const result = await attendance.sendAttendanceTelegramMessage(
      { userId: uid.teacher, role: "TEACHER" },
      groupId,
      s,
      todayMessage,
      tomorrowMessage
    );

    expect(result).toEqual({ recipients: 1, sent: 1, failed: 0 });
    expect(sent).toEqual([{ chat_id: `${run}-tg1`, text: todayMessage }]);

    let notice = await absentNotice(uid.linked, s);
    expect(notice.telegramTodayMessage).toBe(todayMessage);
    expect(notice.telegramTomorrowMessage).toBe(tomorrowMessage);

    await makeReminderDue(notice.id);
    await notifications.processTelegramReminders();
    expect(sent[1].text).toContain(todayMessage);

    notice = await absentNotice(uid.linked, s);
    await makeReminderDue(notice.id);
    await notifications.processTelegramReminders();
    expect(sent[2].text).toContain(tomorrowMessage);
  });
});
