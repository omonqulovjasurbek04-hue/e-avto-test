import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Integration: a missed class sends a site notice and up to 3 Telegram reminders
// (right away, after 1 hour, the next day); reading the notice or a corrected mark stops them. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `abs${Date.now()}`;
const HOUR = 60 * 60 * 1000;

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
  // Pretend the notice was created `hoursAgo` ago, so the next reminders become due.
  const age = (id: string, hoursAgo: number) =>
    prisma.notification.update({ where: { id }, data: { createdAt: new Date(Date.now() - hoursAgo * HOUR) } }).then(async (n) => {
      if (n.telegramNextAt) {
        const offset = notifications.TELEGRAM_REMINDERS_MS[n.telegramSends];
        await prisma.notification.update({ where: { id }, data: { telegramNextAt: new Date(n.createdAt.getTime() + offset) } });
      }
    });

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

  it("a missed class: site notice + 3 Telegram reminders (now, +1 hour, next day), then nothing", async () => {
    const s = await slot(5);
    await mark(s, uid.linked, "ABSENT");
    await notifications.processTelegramReminders();
    const n = await absentNotice(uid.linked, s);
    expect(n.inApp).toBe(true); // shown under "Bildirishnomalar"
    expect(sent).toHaveLength(1);
    expect(sent[0].chat_id).toBe(`${run}-tg1`);
    expect(sent[0].text).not.toMatch(/Eslatma/);

    // Not due yet: nothing more.
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(1);

    await age(n.id, 1.1);
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(2);
    expect(sent[1].text).toMatch(/^Eslatma \(2\/3\)/);

    await age(n.id, 25);
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(3);
    expect(sent[2].text).toMatch(/^Eslatma \(3\/3\)/);

    await age(n.id, 100);
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(3);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).telegramNextAt).toBeNull();
  });

  it("reading the notice on the site stops the remaining reminders", async () => {
    const s = await slot(4);
    await mark(s, uid.linked, "ABSENT");
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(1);
    const n = await absentNotice(uid.linked, s);
    await prisma.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
    await age(n.id, 30);
    await notifications.processTelegramReminders();
    expect(sent).toHaveLength(1);
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
});
