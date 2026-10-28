import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { toPlainText } from "../lib/sanitize";
import { badRequest, notFound } from "../utils/errors";
import { isMailConfigured, sendMail } from "./mail.service";
import { writeAudit } from "./audit.service";
import { isTelegramConfigured, sendTelegramNotice } from "./telegram.service";
import { BASE_LANGUAGE, LANGUAGES, normalizeLanguage, type Language } from "../lib/languages";
import { BUILTIN_TEMPLATES, TEMPLATE_DEFS, TEMPLATE_KEYS, renderTemplate, validateTemplate, type TemplateKey, type TemplateText, type TemplateVars } from "../lib/notificationTemplates";

type Db = Prisma.TransactionClient | typeof prisma;

type NotifyText =
  /** Admin-editable text in the recipient's language (built-in text when none is saved). */
  | { template: TemplateKey; vars?: TemplateVars; title?: never; body?: never }
  /** Literal text, as given. */
  | { template?: never; vars?: never; title: string; body: string };

export type NotifyInput = NotifyText & {
  userId: string;
  type: string;
  /** One notice per event: the same key for the same user never creates a second row. */
  dedupeKey: string;
  /** Does this event deserve an e-mail as well (still subject to the user's choice and SMTP)? */
  email?: boolean;
  /** "attendance" notices can be switched off by the student independently. */
  category?: "general" | "attendance";
  /** Also remind through the Telegram bot (accounts linked to Telegram only): see TELEGRAM_REMINDERS. */
  telegram?: boolean;
};

/**
 * Telegram reminders of one notice, counted from when it was created: right away, after 1 hour, and the
 * next day. They stop as soon as the student reads the notice on the site (or the event is withdrawn).
 */
export const TELEGRAM_REMINDERS_MS = [0, 60 * 60 * 1000, 24 * 60 * 60 * 1000];

export const MAX_EMAIL_ATTEMPTS = 3;

const userLanguage = (stored: string | null | undefined): Language => normalizeLanguage(stored) ?? BASE_LANGUAGE;

export const getPreferences = async (userId: string) => {
  const p = await prisma.notificationPreference.findUnique({ where: { userId } });
  return { inApp: p?.inApp ?? true, email: p?.email ?? true, attendance: p?.attendance ?? true, language: userLanguage(p?.language) };
};

export const savePreferences = async (userId: string, data: { inApp?: boolean; email?: boolean; attendance?: boolean; language?: Language }) => {
  const saved = await prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return { inApp: saved.inApp, email: saved.email, attendance: saved.attendance, language: userLanguage(saved.language) };
};

// ───────────── templates ─────────────

/** The admin's version for this language if saved, else the built-in one. */
const templateText = async (db: Db, key: TemplateKey, language: Language): Promise<TemplateText> => {
  const custom = await db.notificationTemplate.findUnique({ where: { key_language: { key, language } }, select: { subject: true, body: true } });
  return custom ?? BUILTIN_TEMPLATES[key][language];
};

export const listTemplates = async () => {
  const rows = await prisma.notificationTemplate.findMany();
  return TEMPLATE_KEYS.map((key) => ({
    key,
    placeholders: TEMPLATE_DEFS[key].placeholders,
    required: TEMPLATE_DEFS[key].required,
    languages: Object.fromEntries(
      LANGUAGES.map((language) => {
        const row = rows.find((r) => r.key === key && r.language === language);
        const builtin = BUILTIN_TEMPLATES[key][language];
        return [language, { subject: row?.subject ?? builtin.subject, body: row?.body ?? builtin.body, custom: Boolean(row), updatedAt: row?.updatedAt ?? null, builtin }];
      })
    ),
  }));
};

export const saveTemplate = async (actorId: string, key: TemplateKey, language: Language, input: TemplateText) => {
  // Stored as typed (plain text); notify() cleans the rendered result like every other notice. Subjects are one line.
  const text = { subject: input.subject.replace(/\s+/g, " ").trim(), body: input.body.trim() };
  if (!text.subject || !text.body) throw badRequest("Subject and body are required");
  const problems = validateTemplate(key, text);
  if (problems.length > 0) throw Object.assign(badRequest(`Invalid template: ${problems.join("; ")}`), { details: problems });
  const before = await prisma.notificationTemplate.findUnique({ where: { key_language: { key, language } } });
  const saved = await prisma.notificationTemplate.upsert({
    where: { key_language: { key, language } },
    create: { key, language, ...text, updatedById: actorId },
    update: { ...text, updatedById: actorId },
  });
  await writeAudit({ actorId, action: "notification.template.save", entity: "NotificationTemplate", entityId: `${key}:${language}`, before: before ? { subject: before.subject, body: before.body } : undefined, after: text });
  return saved;
};

/** Back to the built-in text. */
export const resetTemplate = async (actorId: string, key: TemplateKey, language: Language) => {
  const res = await prisma.notificationTemplate.deleteMany({ where: { key, language } });
  if (res.count > 0) await writeAudit({ actorId, action: "notification.template.reset", entity: "NotificationTemplate", entityId: `${key}:${language}` });
  return { key, language, ...BUILTIN_TEMPLATES[key][language] };
};

/**
 * Records a notice for a user, honouring their preferences. Returns the id when an e-mail still has to be
 * delivered (pass it to dispatchEmails AFTER the surrounding transaction commits), otherwise null.
 * Never reports "sent": delivery status is written only by the delivery step.
 */
export const notify = async (input: NotifyInput, db: Db = prisma): Promise<string | null> => {
  const [prefs, user] = await Promise.all([
    db.notificationPreference.findUnique({ where: { userId: input.userId } }),
    db.user.findUnique({ where: { id: input.userId }, select: { email: true, isActive: true, name: true } }),
  ]);
  if (!user?.isActive) return null;
  if (input.category === "attendance" && prefs?.attendance === false) return null;

  const inApp = prefs?.inApp ?? true;
  const wantsEmail = Boolean(input.email) && (prefs?.email ?? true);
  if (!inApp && !wantsEmail) return null;

  // No e-mail wanted -> NONE. Wanted but impossible (no SMTP / no address) -> SKIPPED, shown honestly as not sent.
  const emailStatus = !wantsEmail ? "NONE" : isMailConfigured() && user.email ? "PENDING" : "SKIPPED";

  const existing = await db.notification.findUnique({ where: { userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey } }, select: { id: true } });
  const telegramId = input.telegram && isTelegramConfigured() ? (await db.user.findUnique({ where: { id: input.userId }, select: { telegramId: true } }))?.telegramId : null;
  if (existing) return null; // duplicate event: nothing new to show or send

  // Rendered once, in the recipient's language: the in-app row and the e-mail show the same text.
  const text = input.template
    ? renderTemplate(await templateText(db, input.template, userLanguage(prefs?.language)), { name: user.name, ...input.vars })
    : { subject: input.title, body: input.body };

  const row = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: toPlainText(text.subject).slice(0, 160),
      body: toPlainText(text.body).slice(0, 1000),
      dedupeKey: input.dedupeKey,
      inApp,
      emailStatus,
      // First Telegram reminder is due now; processTelegramReminders() sends it and schedules the next.
      telegramNextAt: telegramId ? new Date() : null,
    },
  });
  return emailStatus === "PENDING" ? row.id : null;
};

/** Sends the pending e-mail of one notice. A failure is recorded and retried later; secrets are never logged. */
export const deliverEmail = async (notificationId: string): Promise<"SENT" | "FAILED" | "SKIPPED" | "NOOP"> => {
  const n = await prisma.notification.findUnique({ where: { id: notificationId }, include: { user: { select: { email: true } } } });
  if (!n || !["PENDING", "FAILED"].includes(n.emailStatus) || n.emailAttempts >= MAX_EMAIL_ATTEMPTS) return "NOOP";
  if (!n.user.email || !isMailConfigured()) {
    await prisma.notification.update({ where: { id: n.id }, data: { emailStatus: "SKIPPED" } });
    return "SKIPPED";
  }
  // Header injection guard: subjects are one line.
  const ok = await sendMail({ to: n.user.email, subject: n.title.replace(/[\r\n]+/g, " "), text: `${n.body}\n\n— E-Avto` });
  await prisma.notification.update({
    where: { id: n.id },
    data: ok ? { emailStatus: "SENT", emailSentAt: new Date(), emailAttempts: { increment: 1 } } : { emailStatus: "FAILED", emailAttempts: { increment: 1 } },
  });
  return ok ? "SENT" : "FAILED";
};

/** Fire-and-forget after commit; a mail problem must never break the action that triggered the notice. */
export const dispatchEmails = (ids: (string | null)[]): void => {
  for (const id of ids) {
    if (id) void deliverEmail(id).catch((e: Error) => console.error("Notification e-mail failed:", e.message));
  }
};

/** Background retry/drain: picks up queued announcements and earlier failures. */
export const processEmailQueue = async (batch = 100): Promise<number> => {
  if (!isMailConfigured()) return 0;
  const due = await prisma.notification.findMany({
    where: { emailStatus: { in: ["PENDING", "FAILED"] }, emailAttempts: { lt: MAX_EMAIL_ATTEMPTS }, createdAt: { gt: new Date(Date.now() - 2 * 86_400_000) } },
    orderBy: { createdAt: "asc" },
    take: batch,
    select: { id: true },
  });
  for (const { id } of due) await deliverEmail(id);
  return due.length;
};

// ───────────── Telegram reminders ─────────────

/**
 * Sends the Telegram reminders that are due. A notice the student has read gets no more reminders; a
 * failed send is retried on the next run (only delivered messages count towards the three).
 */
export const processTelegramReminders = async (now: Date = new Date(), batch = 100): Promise<number> => {
  if (!isTelegramConfigured()) return 0;
  const due = await prisma.notification.findMany({
    where: { telegramNextAt: { lte: now }, telegramSends: { lt: TELEGRAM_REMINDERS_MS.length } },
    orderBy: { telegramNextAt: "asc" },
    take: batch,
    include: { user: { select: { telegramId: true, isActive: true } } },
  });
  let sent = 0;
  for (const n of due) {
    // Read on the site, account gone or unlinked: stop reminding.
    if (n.readAt || !n.user.isActive || !n.user.telegramId) {
      await prisma.notification.update({ where: { id: n.id }, data: { telegramNextAt: null } });
      continue;
    }
    // Claim the reminder first, so two runs at the same moment (after-mark dispatch + the 5-minute job)
    // cannot both send it. If the send then fails, it becomes due again in 5 minutes.
    const claimedUntil = new Date(now.getTime() + 5 * 60 * 1000);
    const claimed = await prisma.notification.updateMany({
      where: { id: n.id, telegramSends: n.telegramSends, telegramNextAt: { lte: now } },
      data: { telegramNextAt: claimedUntil },
    });
    if (claimed.count === 0) continue;
    const nr = n.telegramSends + 1;
    const total = TELEGRAM_REMINDERS_MS.length;
    const prefix = nr === 1 ? "" : `Eslatma (${nr}/${total}): `;
    const ok = await sendTelegramNotice(n.user.telegramId, `${prefix}${n.title}\n\n${n.body}\n\n— E-Avto Test`);
    if (!ok) continue; // claimed for 5 minutes: tried again after that
    sent += 1;
    const next = TELEGRAM_REMINDERS_MS[nr];
    // Schedule the next one only if our claim still stands: if the reminders were cancelled while this
    // one was being sent (absence corrected to "present"), they stay cancelled.
    const scheduled = await prisma.notification.updateMany({
      where: { id: n.id, telegramNextAt: claimedUntil },
      data: { telegramSends: nr, telegramNextAt: next === undefined ? null : new Date(n.createdAt.getTime() + next) },
    });
    if (scheduled.count === 0) await prisma.notification.update({ where: { id: n.id }, data: { telegramSends: nr } });
  }
  return sent;
};

/** Fire-and-forget after commit: the first reminder goes out without waiting for the next scheduled run. */
export const dispatchTelegramReminders = (): void => {
  void processTelegramReminders().catch((e: Error) => console.error("Telegram reminders failed:", e.message));
};

/** The event no longer applies (e.g. the absence was corrected to "present"): no more reminders. */
export const cancelTelegramReminders = (userId: string, dedupeKey: string, db: Db = prisma) =>
  db.notification.updateMany({ where: { userId, dedupeKey, telegramNextAt: { not: null } }, data: { telegramNextAt: null } });

// ───────────── list / read (student side) ─────────────

export const listForUser = async (userId: string) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, inApp: true }, orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId, inApp: true, readAt: null } }),
  ]);
  return { items, unread };
};

// ───────────── announcements (staff) ─────────────

export type Audience = { type: "all" } | { type: "group"; groupId: string } | { type: "course"; courseId: string };

const audienceUserIds = async (a: Audience): Promise<string[]> => {
  if (a.type === "all") {
    return (await prisma.user.findMany({ where: { role: "USER", isActive: true }, select: { id: true } })).map((u) => u.id);
  }
  if (a.type === "group") {
    if (!(await prisma.teacherGroup.findUnique({ where: { id: a.groupId }, select: { id: true } }))) throw notFound("Group not found");
    return (await prisma.groupMembership.findMany({ where: { groupId: a.groupId, leftAt: null, student: { isActive: true } }, select: { studentId: true } })).map((m) => m.studentId);
  }
  if (!(await prisma.course.findUnique({ where: { id: a.courseId }, select: { id: true } }))) throw notFound("Course not found");
  const rows = await prisma.enrollment.findMany({ where: { courseId: a.courseId, status: "ACTIVE", user: { isActive: true } }, select: { userId: true } });
  return rows.map((r) => r.userId);
};

/** Sends one announcement to an audience. Rows are created now; e-mails drain from the queue in batches. */
export const announce = async (actorId: string, input: { title: string; body: string; audience: Audience }) => {
  const userIds = await audienceUserIds(input.audience);
  const announcementId = crypto.randomUUID();
  let created = 0;
  let queuedEmails = 0;
  for (const userId of userIds) {
    const emailId = await notify({ userId, type: "ANNOUNCEMENT", template: "ANNOUNCEMENT", vars: { title: input.title, body: input.body }, dedupeKey: `announce:${announcementId}`, email: true });
    created++;
    if (emailId) queuedEmails++;
  }
  await writeAudit({ actorId, action: "notification.announce", entity: "Notification", entityId: announcementId, after: { audience: input.audience, recipients: created, title: input.title } });
  // Start draining right away; the periodic job finishes whatever is left.
  void processEmailQueue(200).catch(() => undefined);
  return { recipients: created, emailsQueued: queuedEmails, emailConfigured: isMailConfigured() };
};
