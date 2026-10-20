import type { TelegramAdminSession, User } from "@prisma/client";
import { prisma } from "../config/database";
import { hasPermission, type Permission } from "../lib/permissions";
import { normalizeUzPhone } from "../lib/phone";
import { answerCallback, deleteMessage, editMessage, esc, sendMessage, type TgCallbackQuery, type TgMessage } from "../lib/telegramApi";
import { HttpError } from "../utils/errors";
import { writeAudit } from "./audit.service";
import { checkPassword } from "./auth.service";
import { adminLeaderboard, type LeaderboardPeriod } from "./leaderboard.service";
import { checkSecondFactor } from "./twoFactor.service";

/**
 * Staff menu of the Telegram bot. A staff member signs in with their site account (phone + password,
 * plus the 2FA code if it is on) by sending /admin; the menu then shows only what their role allows:
 * students and their linked accounts, the ranking, statistics and messages from the contact form.
 * The bot only reports: lessons and tests are never handed out here.
 */

const SIGN_IN_TTL_MS = 10 * 60 * 1000; // to finish the sign-in steps
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILURES = 5; // wrong steps from one chat before it is blocked
const BLOCK_MS = 15 * 60 * 1000;

const BTN = {
  students: "👥 O'quvchilar",
  search: "🔎 Qidirish",
  ranking: "🏆 Reyting",
  stats: "📊 Statistika",
  messages: "✉️ Xabarlar",
  logout: "🚪 Chiqish",
} as const;

/** Which permission each menu item needs (checked again on every use, not only when the menu is drawn). */
const NEEDS: Record<Exclude<keyof typeof BTN, "logout">, Permission> = {
  students: "users:read",
  search: "users:read",
  ranking: "reports:read",
  stats: "reports:read",
  messages: "content:manage",
};

const studentNo = (n: number) => `student${String(n).padStart(4, "0")}`;
const TZ = "Asia/Tashkent";
const fmtDate = (d: Date) => d.toLocaleDateString("ru-RU", { timeZone: TZ });
const fmtDateTime = (d: Date) => d.toLocaleString("ru-RU", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
const DAY_MS = 24 * 60 * 60 * 1000;
/** Start of today in Tashkent (UTC+5, no daylight saving). */
const startOfToday = () => {
  const offset = 5 * 60 * 60 * 1000;
  return new Date(Math.floor((Date.now() + offset) / DAY_MS) * DAY_MS - offset);
};

const menuFor = (role: string): string[][] => {
  const can = (k: keyof typeof NEEDS) => hasPermission(role, NEEDS[k]);
  const rows: (string | null)[][] = [
    [can("students") ? BTN.students : null, can("search") ? BTN.search : null],
    [can("ranking") ? BTN.ranking : null, can("stats") ? BTN.stats : null],
    [can("messages") ? BTN.messages : null, BTN.logout],
  ];
  return rows.map((r) => r.filter((x): x is string => x !== null)).filter((r) => r.length > 0);
};

type Signed = TelegramAdminSession & { user: User };

/** The chat's live staff session, or null (expired, account disabled, password changed, role lost). */
async function activeSession(telegramId: string): Promise<Signed | null> {
  const s = await prisma.telegramAdminSession.findUnique({ where: { telegramId }, include: { user: true } });
  if (!s || (s.step !== "ACTIVE" && s.step !== "SEARCH")) return null;
  const u = s.user;
  if (!u || s.expiresAt <= new Date() || !u.isActive || u.tokenVersion !== s.tokenVersion || !hasPermission(u.role, "admin:access")) {
    await prisma.telegramAdminSession.delete({ where: { telegramId } }).catch(() => undefined);
    return null;
  }
  return s as Signed;
}

/** A wrong sign-in step: counted per chat; too many block the chat (the account has its own lockout too). */
async function fail(chatId: number, telegramId: string, text: string) {
  const s = await prisma.telegramAdminSession.update({ where: { telegramId }, data: { failures: { increment: 1 }, step: "LOGIN", phone: null, userId: null } });
  if (s.failures >= MAX_FAILURES) {
    await prisma.telegramAdminSession.update({ where: { telegramId }, data: { failures: 0, blockedUntil: new Date(Date.now() + BLOCK_MS) } });
    await sendMessage(chatId, "Juda ko'p noto'g'ri urinish. 15 daqiqadan keyin /admin ni qayta yuboring.", { keyboard: null });
    return;
  }
  await sendMessage(chatId, `${text}\n\nTelefon raqamingizni qayta yuboring (masalan, +998 90 123 45 67) yoki /cancel.`);
}

async function signedIn(chatId: number, telegramId: string, user: User) {
  await prisma.telegramAdminSession.update({
    where: { telegramId },
    data: { step: "ACTIVE", userId: user.id, tokenVersion: user.tokenVersion, phone: null, failures: 0, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  await writeAudit({ actorId: user.id, action: "telegram.admin.login", entity: "User", entityId: user.id, after: { telegramId } });
  await sendMessage(chatId, `Xush kelibsiz, <b>${esc(user.name)}</b>!\nMenyudan bo'limni tanlang. Chiqish: ${BTN.logout}`, { html: true, keyboard: menuFor(user.role) });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** true = the message belonged to the staff flow and was answered here. */
export async function handleAdminMessage(msg: TgMessage): Promise<boolean> {
  const text = (msg.text ?? "").trim();
  const chatId = msg.chat.id;
  const telegramId = String(msg.from!.id);
  const command = text.split(/\s+/)[0].split("@")[0];

  if (command === "/admin") {
    const existing = await prisma.telegramAdminSession.findUnique({ where: { telegramId } });
    if (existing?.blockedUntil && existing.blockedUntil > new Date()) {
      await sendMessage(chatId, "Juda ko'p noto'g'ri urinish. Birozdan keyin qayta urinib ko'ring.");
      return true;
    }
    const live = await activeSession(telegramId);
    if (live) {
      await sendMessage(chatId, "Siz allaqachon kirgansiz.", { keyboard: menuFor(live.user.role) });
      return true;
    }
    await prisma.telegramAdminSession.upsert({
      where: { telegramId },
      create: { telegramId, step: "LOGIN", expiresAt: new Date(Date.now() + SIGN_IN_TTL_MS) },
      update: { step: "LOGIN", phone: null, userId: null, tokenVersion: null, expiresAt: new Date(Date.now() + SIGN_IN_TTL_MS) },
    });
    await sendMessage(chatId, "Admin bo'limiga kirish.\n\n1/2. Saytdagi admin hisobingiz telefon raqamini yuboring (masalan, +998 90 123 45 67).\nBekor qilish: /cancel", { keyboard: null });
    return true;
  }

  const session = await prisma.telegramAdminSession.findUnique({ where: { telegramId } });
  if (!session) return false;

  if (command === "/cancel" && session.step !== "ACTIVE" && session.step !== "SEARCH") {
    await prisma.telegramAdminSession.delete({ where: { telegramId } });
    await sendMessage(chatId, "Bekor qilindi.");
    return true;
  }

  // Sign-in steps
  if (session.step === "LOGIN" || session.step === "PASSWORD" || session.step === "CODE") {
    if (session.expiresAt <= new Date()) {
      await prisma.telegramAdminSession.delete({ where: { telegramId } });
      await sendMessage(chatId, "Kirish vaqti tugadi. Qaytadan /admin yuboring.");
      return true;
    }
    if (session.blockedUntil && session.blockedUntil > new Date()) {
      await sendMessage(chatId, "Juda ko'p noto'g'ri urinish. Birozdan keyin qayta urinib ko'ring.");
      return true;
    }
    if (session.step === "LOGIN") {
      const phone = normalizeUzPhone(text);
      if (!phone) {
        await sendMessage(chatId, "Telefon raqamni to'liq yuboring, masalan: +998 90 123 45 67");
        return true;
      }
      await prisma.telegramAdminSession.update({ where: { telegramId }, data: { step: "PASSWORD", phone } });
      await sendMessage(chatId, "2/2. Parolni yuboring. Xavfsizlik uchun xabaringiz darhol o'chiriladi.");
      return true;
    }
    if (session.step === "PASSWORD") {
      // The password must not stay in the chat history.
      await deleteMessage(chatId, msg.message_id);
      let user: User;
      try {
        user = await checkPassword({ phone: session.phone!, password: text });
      } catch (e) {
        const locked = e instanceof HttpError && e.status === 429;
        await fail(chatId, telegramId, locked ? "Hisob vaqtincha bloklangan: juda ko'p noto'g'ri parol." : "Telefon raqam yoki parol noto'g'ri.");
        return true;
      }
      if (!hasPermission(user.role, "admin:access")) {
        await prisma.telegramAdminSession.delete({ where: { telegramId } });
        await sendMessage(chatId, "Bu hisobda admin huquqi yo'q. Bot o'quvchilarga faqat saytga kirish kodini beradi: /start");
        return true;
      }
      if (user.totpEnabledAt && user.totpSecret) {
        await prisma.telegramAdminSession.update({ where: { telegramId }, data: { step: "CODE", userId: user.id } });
        await sendMessage(chatId, "Ikki bosqichli himoya yoqilgan. Autentifikator ilovasidagi 6 xonali kodni yuboring.");
        return true;
      }
      await signedIn(chatId, telegramId, user);
      return true;
    }
    // CODE
    await deleteMessage(chatId, msg.message_id);
    const user = session.userId ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
    if (!user || !user.isActive || !(await checkSecondFactor(user, text))) {
      await fail(chatId, telegramId, "Kod noto'g'ri.");
      return true;
    }
    await signedIn(chatId, telegramId, user);
    return true;
  }

  // Signed in
  const live = await activeSession(telegramId);
  if (!live) {
    await sendMessage(chatId, "Admin sessiyasi tugadi. Qaytadan kirish: /admin", { keyboard: null });
    return true;
  }
  const role = live.user.role;
  const allowed = (k: keyof typeof NEEDS) => hasPermission(role, NEEDS[k]);
  const menu = menuFor(role);

  if (text === BTN.logout || command === "/logout") {
    await prisma.telegramAdminSession.delete({ where: { telegramId } });
    await sendMessage(chatId, "Admin bo'limidan chiqdingiz.", { keyboard: null });
    return true;
  }
  if (text === BTN.students && allowed("students")) {
    await sendMessage(chatId, await studentsOverview(), { html: true, keyboard: menu });
    return true;
  }
  if (text === BTN.search && allowed("search")) {
    await prisma.telegramAdminSession.update({ where: { telegramId }, data: { step: "SEARCH" } });
    await sendMessage(chatId, "O'quvchini qidirish: ism, telefon raqam yoki raqami (masalan, student0012) yuboring.");
    return true;
  }
  if (text === BTN.ranking && allowed("ranking")) {
    await sendMessage(chatId, await rankingText("week"), { html: true, inline: rankingButtons("week") });
    return true;
  }
  if (text === BTN.stats && allowed("stats")) {
    await sendMessage(chatId, await statsText(role), { html: true, keyboard: menu });
    return true;
  }
  if (text === BTN.messages && allowed("messages")) {
    await sendNewMessages(chatId);
    return true;
  }
  if (live.step === "SEARCH" && allowed("search") && !text.startsWith("/")) {
    await prisma.telegramAdminSession.update({ where: { telegramId }, data: { step: "ACTIVE" } });
    await sendMessage(chatId, await searchStudents(text), { html: true, keyboard: menu });
    return true;
  }
  await sendMessage(chatId, "Menyudan bo'limni tanlang.", { keyboard: menu });
  return true;
}

// ---------------------------------------------------------------------------
// Inline buttons
// ---------------------------------------------------------------------------

export async function handleAdminCallback(q: TgCallbackQuery): Promise<void> {
  const live = await activeSession(String(q.from.id));
  const chatId = q.message?.chat.id;
  if (!live || !chatId || !q.message) {
    await answerCallback(q.id, "Admin sessiyasi tugadi: /admin");
    return;
  }
  const [kind, arg] = (q.data ?? "").split(":");
  const role = live.user.role;

  if (kind === "lb" && hasPermission(role, NEEDS.ranking) && (arg === "week" || arg === "month" || arg === "all")) {
    await editMessage(chatId, q.message.message_id, await rankingText(arg), { html: true, inline: rankingButtons(arg) });
    await answerCallback(q.id);
    return;
  }
  if (kind === "read" && hasPermission(role, NEEDS.messages) && arg) {
    const res = await prisma.contactMessage.updateMany({ where: { id: arg }, data: { status: "READ" } });
    if (res.count) {
      await writeAudit({ actorId: live.user.id, action: "contact.status", entity: "ContactMessage", entityId: arg, after: { status: "READ", via: "telegram" } });
    }
    await editMessage(chatId, q.message.message_id, `${esc(q.message.text ?? "")}\n\n✅ O'qildi — ${esc(live.user.name)}`, { html: true });
    await answerCallback(q.id, "O'qildi deb belgilandi");
    return;
  }
  await answerCallback(q.id, "Bu amal uchun ruxsat yo'q");
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const activeEnrollment = () => ({ status: "ACTIVE" as const, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });

async function studentsOverview(): Promise<string> {
  const week = new Date(Date.now() - 7 * DAY_MS);
  const students = { role: "USER" as const };
  const [total, linked, active, newWeek, withCourse, recent] = await Promise.all([
    prisma.user.count({ where: students }),
    prisma.user.count({ where: { ...students, telegramId: { not: null } } }),
    prisma.user.count({ where: { ...students, isActive: true } }),
    prisma.user.count({ where: { ...students, createdAt: { gte: week } } }),
    prisma.enrollment.groupBy({ by: ["userId"], where: { ...activeEnrollment(), user: students } }).then((r) => r.length),
    prisma.user.findMany({
      where: { ...students, telegramId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, studentNumber: true, phone: true, createdAt: true },
    }),
  ]);
  const lines = [
    "<b>👥 O'quvchilar</b>",
    `Jami: <b>${total}</b> (faol: ${active})`,
    `Telegram ulangan: <b>${linked}</b>`,
    `Kursi bor: <b>${withCourse}</b>`,
    `Oxirgi 7 kunda yangi: <b>${newWeek}</b>`,
  ];
  if (recent.length) {
    lines.push("", "<b>Telegram ulangan oxirgi hisoblar:</b>");
    recent.forEach((u, i) => lines.push(`${i + 1}. ${esc(u.name)} — ${studentNo(u.studentNumber)}${u.phone ? `, ${esc(u.phone)}` : ""} (${fmtDate(u.createdAt)})`));
  }
  lines.push("", `Batafsil: ${BTN.search}`);
  return lines.join("\n");
}

async function searchStudents(query: string): Promise<string> {
  const q = query.trim().slice(0, 80);
  const num = /^student0*(\d+)$/i.exec(q) ?? /^#?(\d{1,6})$/.exec(q);
  const digits = q.replace(/\D/g, "");
  const where =
    num ? { studentNumber: Number(num[1]) } : digits.length >= 7 ? { phone: { contains: digits.slice(-9) } } : { name: { contains: q, mode: "insensitive" as const } };
  const users = await prisma.user.findMany({ where: { role: "USER", ...where }, orderBy: { createdAt: "desc" }, take: 5 });
  if (!users.length) return `"${esc(q)}" bo'yicha o'quvchi topilmadi.`;

  const month = new Date(Date.now() - 30 * DAY_MS);
  const cards = await Promise.all(
    users.map(async (u) => {
      const [enrollments, finished, passed, best, last, absences] = await Promise.all([
        prisma.enrollment.findMany({ where: { userId: u.id, ...activeEnrollment() }, include: { course: { select: { title: true } } } }),
        prisma.test.count({ where: { userId: u.id, finishedAt: { not: null } } }),
        prisma.test.count({ where: { userId: u.id, finishedAt: { not: null }, passed: true } }),
        prisma.test.aggregate({ where: { userId: u.id, finishedAt: { not: null } }, _max: { score: true } }),
        prisma.test.findFirst({ where: { userId: u.id, finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true, score: true } }),
        prisma.attendanceRecord.count({ where: { studentId: u.id, status: "ABSENT", createdAt: { gte: month } } }),
      ]);
      const courses = enrollments.map((e) => `${esc(e.course.title)}${e.expiresAt ? ` (${fmtDate(e.expiresAt)} gacha)` : ""}`).join(", ");
      return [
        `<b>${esc(u.name)}</b> — ${studentNo(u.studentNumber)}${u.isActive ? "" : " ⛔ bloklangan"}`,
        `📞 ${esc(u.phone ?? "—")} · Telegram: ${u.telegramId ? "✅ ulangan" : "❌ ulanmagan"}`,
        `📅 Ro'yxatdan o'tgan: ${fmtDate(u.createdAt)}`,
        `📚 Kurslar: ${courses || "yo'q"}`,
        `📝 Testlar: ${finished} (o'tgan: ${passed})${best._max.score != null ? `, eng yaxshi: ${best._max.score}%` : ""}`,
        last?.finishedAt ? `🕒 Oxirgi test: ${fmtDateTime(last.finishedAt)} — ${last.score}%` : null,
        `🚫 30 kunda qoldirilgan darslar: ${absences}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
  );
  return cards.join("\n\n");
}

const PERIOD_LABEL: Record<LeaderboardPeriod, string> = { week: "Hafta", month: "Oy", all: "Hammasi" };
const rankingButtons = (current: LeaderboardPeriod) => [
  (Object.keys(PERIOD_LABEL) as LeaderboardPeriod[]).map((p) => ({ text: `${p === current ? "• " : ""}${PERIOD_LABEL[p]}`, callback_data: `lb:${p}` })),
];

async function rankingText(period: LeaderboardPeriod): Promise<string> {
  const { entries, stats } = await adminLeaderboard({ period, sort: "points" });
  const medal = ["🥇", "🥈", "🥉"];
  const lines = [`<b>🏆 Reyting — ${PERIOD_LABEL[period].toLowerCase()}</b>`];
  if (!entries.length) return `${lines[0]}\n\nBu davrda test topshirilmagan.`;
  for (const e of entries.slice(0, 10)) {
    lines.push(`${medal[e.rank - 1] ?? `${e.rank}.`} ${esc(e.name)} — <b>${e.points}</b> ball · ${e.tests} test · ${e.accuracy}%`);
  }
  lines.push("", `Ishtirokchilar: ${stats.students} · testlar: ${stats.testsTaken}${stats.averageAccuracy != null ? ` · o'rtacha: ${stats.averageAccuracy}%` : ""}`);
  return lines.join("\n");
}

async function statsText(role: string): Promise<string> {
  const today = startOfToday();
  const week = new Date(Date.now() - 7 * DAY_MS);
  const finished = (from: Date) => ({ finishedAt: { gte: from } });
  const [newToday, newWeek, testsToday, passedToday, testsWeek, passedWeek, newMessages, pendingOrders, paidWeek] = await Promise.all([
    prisma.user.count({ where: { role: "USER", createdAt: { gte: today } } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: week } } }),
    prisma.test.count({ where: finished(today) }),
    prisma.test.count({ where: { ...finished(today), passed: true } }),
    prisma.test.count({ where: finished(week) }),
    prisma.test.count({ where: { ...finished(week), passed: true } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PAID", updatedAt: { gte: week } } }),
  ]);
  const rate = (p: number, n: number) => (n ? ` (o'tish: ${Math.round((p / n) * 100)}%)` : "");
  const lines = [
    "<b>📊 Statistika</b>",
    "",
    "<b>Bugun</b>",
    `Yangi o'quvchilar: ${newToday}`,
    `Topshirilgan testlar: ${testsToday}${rate(passedToday, testsToday)}`,
    "",
    "<b>Oxirgi 7 kun</b>",
    `Yangi o'quvchilar: ${newWeek}`,
    `Topshirilgan testlar: ${testsWeek}${rate(passedWeek, testsWeek)}`,
  ];
  if (hasPermission(role, "orders:read")) lines.push(`To'langan buyurtmalar: ${paidWeek}`, `Kutilayotgan buyurtmalar: ${pendingOrders}`);
  if (hasPermission(role, NEEDS.messages)) lines.push("", `O'qilmagan xabarlar: ${newMessages}`);
  return lines.join("\n");
}

const contactText = (m: { name: string; contact: string; message: string; createdAt: Date }) =>
  [`<b>✉️ Saytdan xabar</b> · ${fmtDateTime(m.createdAt)}`, `👤 ${esc(m.name)}`, `📞 ${esc(m.contact)}`, "", esc(m.message)].join("\n");

async function sendNewMessages(chatId: number) {
  const list = await prisma.contactMessage.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 5 });
  if (!list.length) {
    await sendMessage(chatId, "O'qilmagan xabarlar yo'q.");
    return;
  }
  const total = await prisma.contactMessage.count({ where: { status: "NEW" } });
  if (total > list.length) await sendMessage(chatId, `O'qilmagan xabarlar: ${total}. Oxirgi ${list.length} tasi:`);
  for (const m of list.reverse()) {
    await sendMessage(chatId, contactText(m), { html: true, inline: [[{ text: "✅ O'qildi", callback_data: `read:${m.id}` }]] });
  }
}

/**
 * A new message from the site's contact form goes straight to every signed-in staff chat that may
 * read messages. Fire-and-forget: the visitor's request does not wait for Telegram.
 */
export async function notifyContactMessage(m: { id: string; name: string; contact: string; message: string; createdAt: Date }): Promise<void> {
  const sessions = await prisma.telegramAdminSession.findMany({
    where: { step: { in: ["ACTIVE", "SEARCH"] }, expiresAt: { gt: new Date() }, user: { isActive: true } },
    include: { user: { select: { role: true, tokenVersion: true } } },
  });
  const targets = sessions.filter((s) => s.user && s.user.tokenVersion === s.tokenVersion && hasPermission(s.user.role, NEEDS.messages));
  await Promise.all(
    targets.map((s) => sendMessage(s.telegramId, contactText(m), { html: true, inline: [[{ text: "✅ O'qildi", callback_data: `read:${m.id}` }]] }))
  );
}
