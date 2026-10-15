import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { toPlainText } from "../lib/sanitize";
import { notFound } from "../utils/errors";
import { isMailConfigured, sendMail } from "./mail.service";
import { writeAudit } from "./audit.service";

type Db = Prisma.TransactionClient | typeof prisma;

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  /** One notice per event: the same key for the same user never creates a second row. */
  dedupeKey: string;
  /** Does this event deserve an e-mail as well (still subject to the user's choice and SMTP)? */
  email?: boolean;
  /** "attendance" notices can be switched off by the student independently. */
  category?: "general" | "attendance";
}

export const MAX_EMAIL_ATTEMPTS = 3;

export const getPreferences = async (userId: string) => {
  const p = await prisma.notificationPreference.findUnique({ where: { userId } });
  return { inApp: p?.inApp ?? true, email: p?.email ?? true, attendance: p?.attendance ?? true };
};

export const savePreferences = async (userId: string, data: { inApp?: boolean; email?: boolean; attendance?: boolean }) => {
  const saved = await prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return { inApp: saved.inApp, email: saved.email, attendance: saved.attendance };
};

/**
 * Records a notice for a user, honouring their preferences. Returns the id when an e-mail still has to be
 * delivered (pass it to dispatchEmails AFTER the surrounding transaction commits), otherwise null.
 * Never reports "sent": delivery status is written only by the delivery step.
 */
export const notify = async (input: NotifyInput, db: Db = prisma): Promise<string | null> => {
  const [prefs, user] = await Promise.all([
    db.notificationPreference.findUnique({ where: { userId: input.userId } }),
    db.user.findUnique({ where: { id: input.userId }, select: { email: true, isActive: true } }),
  ]);
  if (!user?.isActive) return null;
  if (input.category === "attendance" && prefs?.attendance === false) return null;

  const inApp = prefs?.inApp ?? true;
  const wantsEmail = Boolean(input.email) && (prefs?.email ?? true);
  if (!inApp && !wantsEmail) return null;

  // No e-mail wanted -> NONE. Wanted but impossible (no SMTP / no address) -> SKIPPED, shown honestly as not sent.
  const emailStatus = !wantsEmail ? "NONE" : isMailConfigured() && user.email ? "PENDING" : "SKIPPED";

  const existing = await db.notification.findUnique({ where: { userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey } }, select: { id: true } });
  if (existing) return null; // duplicate event: nothing new to show or send

  const row = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: toPlainText(input.title).slice(0, 160),
      body: toPlainText(input.body).slice(0, 1000),
      dedupeKey: input.dedupeKey,
      inApp,
      emailStatus,
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
    const emailId = await notify({ userId, type: "ANNOUNCEMENT", title: input.title, body: input.body, dedupeKey: `announce:${announcementId}`, email: true });
    created++;
    if (emailId) queuedEmails++;
  }
  await writeAudit({ actorId, action: "notification.announce", entity: "Notification", entityId: announcementId, after: { audience: input.audience, recipients: created, title: input.title } });
  // Start draining right away; the periodic job finishes whatever is left.
  void processEmailQueue(200).catch(() => undefined);
  return { recipients: created, emailsQueued: queuedEmails, emailConfigured: isMailConfigured() };
};
