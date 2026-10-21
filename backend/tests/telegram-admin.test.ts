import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Integration: the bot's staff menu. Sign-in with a site staff account (phone + password, 2FA code),
// role-limited menu, student search, ranking, contact form messages pushed to staff chats. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `tga${Date.now()}`;
const PASSWORD = "Adm1nPassw0rd";

type Sent = { method: string; body: Record<string, unknown> };

describe.skipIf(!enabled)("Telegram bot staff menu", () => {
  let prisma: typeof import("../src/config/database").prisma;
  let telegram: typeof import("../src/services/telegram.service");
  let cms: typeof import("../src/services/cms.service");
  const sent: Sent[] = [];
  const uid: Record<string, string> = {};
  const phones: Record<string, string> = {};
  let msgId = 1000;
  let nextChat = Number(String(Date.now()).slice(-8));

  const texts = (chat: number) => sent.filter((s) => s.method === "sendMessage" && String(s.body.chat_id) === String(chat)).map((s) => String(s.body.text));
  const last = (chat: number) => texts(chat).at(-1) ?? "";
  const lastKeyboard = (chat: number) => {
    const m = sent.filter((s) => s.method === "sendMessage" && String(s.body.chat_id) === String(chat)).at(-1);
    return (m?.body.reply_markup as { keyboard?: { text: string }[][] } | undefined)?.keyboard?.flat().map((b) => b.text) ?? [];
  };
  const say = (chat: number, text: string) =>
    telegram.handleUpdate({ update_id: msgId, message: { message_id: msgId++, text, chat: { id: chat, type: "private" }, from: { id: chat, first_name: "Staff" } } });
  const click = (chat: number, data: string, messageText = "") =>
    telegram.handleUpdate({ update_id: msgId, callback_query: { id: `cb${msgId++}`, from: { id: chat }, data, message: { message_id: 1, text: messageText, chat: { id: chat, type: "private" } } } });

  const signIn = async (who: string) => {
    const chat = nextChat++;
    await say(chat, "/admin");
    await say(chat, phones[who]);
    await say(chat, PASSWORD);
    return chat;
  };

  beforeAll(async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { body?: string }) => {
        sent.push({ method: String(url).split("/").at(-1)!, body: init?.body ? JSON.parse(init.body) : {} });
        return { json: async () => ({ ok: true, result: {} }) };
      })
    );
    ({ prisma } = await import("../src/config/database"));
    telegram = await import("../src/services/telegram.service");
    cms = await import("../src/services/cms.service");
    const { hashPassword } = await import("../src/utils/password");
    const passwordHash = await hashPassword(PASSWORD);
    const tail = String(Date.now()).slice(-7);
    const make = async (k: string, role: string, n: number, data: Record<string, unknown> = {}) => {
      phones[k] = `+99890${String(Number(tail) + n).padStart(7, "0").slice(-7)}`;
      const u = await prisma.user.create({ data: { name: `${run} ${k}`, phone: phones[k], passwordHash, role: role as never, ...data } });
      uid[k] = u.id;
    };
    await make("admin", "ADMIN", 1);
    await make("moderator", "MODERATOR", 2);
    await make("finance", "FINANCE", 3);
    await make("student", "USER", 4, { telegramId: `${run}-tg` });
  });

  beforeEach(() => {
    sent.length = 0;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.telegramAdminSession.deleteMany({ where: { OR: [{ userId: { in: Object.values(uid) } }, { userId: null }] } });
    await prisma.contactMessage.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: Object.values(uid) } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(uid) } } });
    vi.unstubAllGlobals();
  });

  it("signs a staff member in with phone + password, deletes the password message and shows the menu", async () => {
    const chat = await signIn("admin");
    expect(sent.some((s) => s.method === "deleteMessage" && String(s.body.chat_id) === String(chat))).toBe(true);
    expect(last(chat)).toContain("Xush kelibsiz");
    expect(lastKeyboard(chat)).toEqual(["👥 O'quvchilar", "🔎 Qidirish", "🏆 Reyting", "📊 Statistika", "✉️ Xabarlar", "🚪 Chiqish"]);
    const s = await prisma.telegramAdminSession.findUniqueOrThrow({ where: { telegramId: String(chat) } });
    expect(s).toMatchObject({ step: "ACTIVE", userId: uid.admin });
  });

  it("refuses a wrong password and a student account; /start still gives students their login code", async () => {
    const chat = nextChat++;
    await say(chat, "/admin");
    await say(chat, phones.admin);
    await say(chat, "wrong-password");
    expect(last(chat)).toContain("noto'g'ri");
    expect((await prisma.telegramAdminSession.findUniqueOrThrow({ where: { telegramId: String(chat) } })).step).toBe("LOGIN");

    const student = await signIn("student");
    expect(last(student)).toContain("admin huquqi yo'q");
    expect(await prisma.telegramAdminSession.findUnique({ where: { telegramId: String(student) } })).toBeNull();

    await say(student, "/start");
    expect(last(student)).toMatch(/tasdiqlash kodi: \d{6}/);
  });

  it("blocks the chat after 5 wrong steps", async () => {
    const chat = nextChat++;
    await say(chat, "/admin");
    for (let i = 0; i < 5; i++) {
      await say(chat, phones.finance);
      await say(chat, `bad-${i}`);
    }
    expect(last(chat)).toContain("15 daqiqadan keyin");
    await say(chat, "/admin");
    expect(last(chat)).toContain("Juda ko'p");
    await prisma.user.update({ where: { id: uid.finance }, data: { failedLogins: 0, lockedUntil: null } });
  });

  it("shows only what the role allows (a moderator gets messages, not students or ranking)", async () => {
    const chat = await signIn("moderator");
    expect(lastKeyboard(chat)).toEqual(["✉️ Xabarlar", "🚪 Chiqish"]);
    await say(chat, "👥 O'quvchilar");
    expect(last(chat)).toBe("Menyudan bo'limni tanlang.");
  });

  it("lists students with linked accounts and finds one by number", async () => {
    const chat = await signIn("admin");
    await say(chat, "👥 O'quvchilar");
    expect(last(chat)).toContain("Telegram ulangan");
    expect(last(chat)).toContain(`${run} student`);

    // No course bought: found by the sign-up number and shown as user####.
    const { userNumber } = await prisma.user.findUniqueOrThrow({ where: { id: uid.student } });
    const userId = `user${String(userNumber).padStart(4, "0")}`;
    await say(chat, "🔎 Qidirish");
    await say(chat, userId);
    expect(last(chat)).toContain(`${run} student`);
    expect(last(chat)).toContain(userId);
    expect(last(chat)).toContain("✅ ulangan");

    // A buyer is found by the student number and shown as student####.
    const top = await prisma.user.aggregate({ _max: { studentNumber: true } });
    const studentNumber = (top._max.studentNumber ?? 0) + 1_000;
    await prisma.user.update({ where: { id: uid.student }, data: { studentNumber } });
    await say(chat, "🔎 Qidirish");
    await say(chat, `student${studentNumber}`);
    expect(last(chat)).toContain(`${run} student`);
    expect(last(chat)).toContain(`student${studentNumber} (${userId})`);

    await say(chat, "🔎 Qidirish");
    await say(chat, `nobody-${run}`);
    expect(last(chat)).toContain("topilmadi");
  });

  it("shows the ranking and switches the period with inline buttons", async () => {
    const chat = await signIn("admin");
    await say(chat, "🏆 Reyting");
    expect(last(chat)).toContain("Reyting — hafta");
    await click(chat, "lb:all");
    const edit = sent.find((s) => s.method === "editMessageText");
    expect(String(edit?.body.text)).toContain("Reyting — hammasi");
  });

  it("pushes a contact form message to staff who may read messages, and marks it read from the chat", async () => {
    const admin = await signIn("admin");
    const finance = await signIn("finance");
    sent.length = 0;
    await cms.submitContact({ name: `${run} Ali`, contact: "+998901234567", message: "Kurs narxi: B & C toifa qancha?" });
    await vi.waitFor(() => expect(texts(admin).some((t) => t.includes(`${run} Ali`))).toBe(true));
    const push = sent.find((s) => String(s.body.chat_id) === String(admin))!;
    expect(push.body.text).toContain("B &amp; C toifa"); // HTML-escaped for parse_mode HTML
    expect(texts(finance)).toEqual([]); // finance has no content:manage

    const msg = await prisma.contactMessage.findFirstOrThrow({ where: { name: `${run} Ali` } });
    await click(admin, `read:${msg.id}`, "x");
    expect((await prisma.contactMessage.findUniqueOrThrow({ where: { id: msg.id } })).status).toBe("READ");
  });

  it("ends the session when the account's password changes, and on logout", async () => {
    const chat = await signIn("admin");
    await prisma.user.update({ where: { id: uid.admin }, data: { tokenVersion: { increment: 1 } } });
    await say(chat, "📊 Statistika");
    expect(last(chat)).toContain("sessiyasi tugadi");

    const again = await signIn("admin");
    await say(again, "📊 Statistika");
    expect(last(again)).toContain("Statistika");
    await say(again, "🚪 Chiqish");
    expect(await prisma.telegramAdminSession.findUnique({ where: { telegramId: String(again) } })).toBeNull();
  });
});
