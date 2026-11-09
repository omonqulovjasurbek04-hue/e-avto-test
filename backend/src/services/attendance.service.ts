import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { badRequest, conflict, forbidden, HttpError, notFound } from "../utils/errors";
import { hasPermission } from "../lib/permissions";
import { summarize, toCsv } from "../lib/attendance";
import { writeAudit } from "./audit.service";
import { Actor, loadAccessibleGroup } from "./group.service";
import { cancelTelegramReminders, dispatchEmails, dispatchTelegramReminders, notify, TELEGRAM_REMINDER_COUNT } from "./notification.service";
import { isTelegramConfigured, sendTelegramNotice } from "./telegram.service";

interface Mark {
  studentId: string;
  status: AttendanceStatus | null;
  note?: string | null;
}

interface BulkMark extends Mark {
  slotId: string;
}

const slotWithGroup = async (slotId: string) => {
  const slot = await prisma.scheduleSlot.findUnique({ where: { id: slotId }, include: { group: true, session: true } });
  if (!slot) throw notFound("Slot not found");
  return slot;
};

/**
 * Saves attendance for one lesson.
 * - The actor must own the group (teacher) or be an admin; checked server-side on every call.
 * - Only current group members can be marked; one record per student per session (unique key).
 * - Only current group members can be marked; after the session is finalized only users with
 *   attendance:edit (admin) may change it. Every change is audited with old/new.
 */
export const markAttendance = async (actor: Actor, slotId: string, marks: Mark[], reason?: string) => {
  const slot = await slotWithGroup(slotId);
  await loadAccessibleGroup(actor, slot.groupId);
  if (!hasPermission(actor.role, "attendance:mark")) throw forbidden("You cannot mark attendance");
  if (slot.status === "CANCELLED") throw conflict("A cancelled lesson has no attendance");

  const uniqueIds = new Set(marks.map((m) => m.studentId));
  if (uniqueIds.size !== marks.length) throw badRequest("Duplicate student in the request");
  if (marks.some((m) => m.status === "ONLINE") && !slot.onlineUrl) throw badRequest("ONLINE is only valid for lessons with an online link");

  const members = await prisma.groupMembership.findMany({ where: { groupId: slot.groupId, leftAt: null }, select: { studentId: true } });
  const memberIds = new Set(members.map((m) => m.studentId));
  if (marks.some((m) => !memberIds.has(m.studentId))) throw badRequest("Every student must be an active member of this group");

  const finalized = Boolean(slot.session?.finalizedAt);
  if (finalized && !hasPermission(actor.role, "attendance:edit")) throw forbidden("This attendance is finalized; ask an administrator to change it");

  const emailIds: (string | null)[] = [];
  // Set inside the transaction: how many students were newly marked absent (they get Telegram reminders).
  let newlyAbsentCount = 0;
  const records = await prisma.$transaction(async (tx) => {
    const session = slot.session ?? (await tx.attendanceSession.upsert({
      where: { slotId },
      create: { slotId, createdById: actor.userId },
      update: {},
    }));

    const existing = await tx.attendanceRecord.findMany({ where: { sessionId: session.id, studentId: { in: [...uniqueIds] } } });
    const byStudent = new Map(existing.map((r) => [r.studentId, r]));
    const newlyAbsent: string[] = [];
    for (const m of marks) {
      const prev = byStudent.get(m.studentId);
      if (prev && prev.status === m.status && (prev.note ?? null) === (m.note ?? null)) continue;
      if (m.status === null) {
        if (!prev) continue;
        await tx.attendanceRecord.delete({ where: { sessionId_studentId: { sessionId: session.id, studentId: m.studentId } } });
        await writeAudit(
          {
            actorId: actor.userId,
            action: "attendance.clear",
            entity: "AttendanceRecord",
            entityId: `${session.id}:${m.studentId}`,
            before: { status: prev.status, note: prev.note },
            after: { status: null, note: null },
            reason,
          },
          tx
        );
        if (prev.status === "ABSENT") await cancelTelegramReminders(m.studentId, `absent:${session.id}`, tx);
        continue;
      }
      await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId: m.studentId } },
        create: { sessionId: session.id, studentId: m.studentId, status: m.status, note: m.note ?? null, markedById: actor.userId },
        update: { status: m.status, note: m.note ?? null, markedById: actor.userId },
      });
      await writeAudit(
        {
          actorId: actor.userId,
          action: prev ? "attendance.change" : "attendance.mark",
          entity: "AttendanceRecord",
          entityId: `${session.id}:${m.studentId}`,
          before: prev ? { status: prev.status, note: prev.note } : undefined,
          after: { status: m.status, note: m.note ?? null },
          reason: prev ? reason : undefined,
        },
        tx
      );
      if (m.status === "ABSENT") newlyAbsent.push(m.studentId);
      // Corrected from "absent" to anything else: the student was there after all, stop the reminders.
      else if (prev?.status === "ABSENT") await cancelTelegramReminders(m.studentId, `absent:${session.id}`, tx);
    }

    newlyAbsentCount = newlyAbsent.length;
    // Absence notice; the student can switch the "attendance" category off. One per lesson and student.
    for (const studentId of newlyAbsent) {
      emailIds.push(await notify({ userId: studentId, type: "ATTENDANCE_ABSENT", category: "attendance", dedupeKey: `absent:${session.id}`, template: "ATTENDANCE_ABSENT", vars: { group: slot.group.name, date: slot.startsAt }, email: true, telegram: true, telegramLessonAt: slot.startsAt }, tx));
    }

    return tx.attendanceRecord.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "asc" } });
  });
  dispatchEmails(emailIds);
  if (newlyAbsentCount > 0) dispatchTelegramReminders();
  return records;
};

export const markAttendanceBulk = async (actor: Actor, groupId: string, changes: BulkMark[], reason?: string) => {
  await loadAccessibleGroup(actor, groupId);
  if (!hasPermission(actor.role, "attendance:mark")) throw forbidden("You cannot mark attendance");

  const slotsByStudent = new Map<string, Set<string>>();
  const marksBySlot = new Map<string, Mark[]>();
  for (const { slotId, ...mark } of changes) {
    const students = slotsByStudent.get(slotId) ?? new Set<string>();
    if (students.has(mark.studentId)) throw badRequest("Duplicate student in the request");
    students.add(mark.studentId);
    slotsByStudent.set(slotId, students);
    const marks = marksBySlot.get(slotId) ?? [];
    marks.push(mark);
    marksBySlot.set(slotId, marks);
  }

  const slots = await prisma.scheduleSlot.findMany({
    where: { id: { in: [...marksBySlot.keys()] }, groupId },
    include: { group: true, session: true },
  });
  if (slots.length !== marksBySlot.size) throw notFound("Lesson not found in this group");
  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  const members = await prisma.groupMembership.findMany({ where: { groupId, leftAt: null }, select: { studentId: true } });
  const memberIds = new Set(members.map((member) => member.studentId));

  for (const [slotId, marks] of marksBySlot) {
    const slot = slotById.get(slotId);
    if (!slot) throw notFound("Lesson not found in this group");
    if (slot.status === "CANCELLED") throw conflict("A cancelled lesson has no attendance");
    if (marks.some((mark) => mark.status === "ONLINE") && !slot.onlineUrl) throw badRequest("ONLINE is only valid for lessons with an online link");
    if (marks.some((mark) => !memberIds.has(mark.studentId))) throw badRequest("Every student must be an active member of this group");
    if (slot.session?.finalizedAt && !hasPermission(actor.role, "attendance:edit")) {
      throw forbidden("This attendance is finalized; ask an administrator to change it");
    }
  }

  const emailIds: (string | null)[] = [];
  let shouldDispatchTelegramReminders = false;
  return prisma.$transaction(async (tx) => {
    const results: { slotId: string; records: Awaited<ReturnType<typeof markAttendance>> }[] = [];

    for (const [slotId, marks] of marksBySlot) {
      const slot = slotById.get(slotId);
      if (!slot) throw notFound("Lesson not found in this group");

      let session = slot.session;
      if (!session) {
        if (marks.every((mark) => mark.status === null)) {
          results.push({ slotId, records: [] });
          continue;
        }
        session = await tx.attendanceSession.upsert({
          where: { slotId },
          create: { slotId, createdById: actor.userId },
          update: {},
        });
      }

      const existing = await tx.attendanceRecord.findMany({
        where: { sessionId: session.id, studentId: { in: marks.map((mark) => mark.studentId) } },
      });
      const byStudent = new Map(existing.map((record) => [record.studentId, record]));
      const newlyAbsent: string[] = [];

      for (const mark of marks) {
        const previous = byStudent.get(mark.studentId);
        if (previous && previous.status === mark.status && (previous.note ?? null) === (mark.note ?? null)) continue;

        if (mark.status === null) {
          if (!previous) continue;
          await tx.attendanceRecord.delete({
            where: { sessionId_studentId: { sessionId: session.id, studentId: mark.studentId } },
          });
          await writeAudit(
            {
              actorId: actor.userId,
              action: "attendance.clear",
              entity: "AttendanceRecord",
              entityId: `${session.id}:${mark.studentId}`,
              before: { status: previous.status, note: previous.note },
              after: { status: null, note: null },
              reason,
            },
            tx
          );
          if (previous.status === "ABSENT") await cancelTelegramReminders(mark.studentId, `absent:${session.id}`, tx);
          continue;
        }

        await tx.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: mark.studentId } },
          create: {
            sessionId: session.id,
            studentId: mark.studentId,
            status: mark.status,
            note: mark.note ?? null,
            markedById: actor.userId,
          },
          update: { status: mark.status, note: mark.note ?? null, markedById: actor.userId },
        });
        await writeAudit(
          {
            actorId: actor.userId,
            action: previous ? "attendance.change" : "attendance.mark",
            entity: "AttendanceRecord",
            entityId: `${session.id}:${mark.studentId}`,
            before: previous ? { status: previous.status, note: previous.note } : undefined,
            after: { status: mark.status, note: mark.note ?? null },
            reason: previous ? reason : undefined,
          },
          tx
        );

        if (mark.status === "ABSENT") newlyAbsent.push(mark.studentId);
        else if (previous?.status === "ABSENT") await cancelTelegramReminders(mark.studentId, `absent:${session.id}`, tx);
      }

      for (const studentId of newlyAbsent) {
        emailIds.push(await notify(
          {
            userId: studentId,
            type: "ATTENDANCE_ABSENT",
            category: "attendance",
            dedupeKey: `absent:${session.id}`,
            template: "ATTENDANCE_ABSENT",
            vars: { group: slot.group.name, date: slot.startsAt },
            email: true,
            telegram: true,
            telegramLessonAt: slot.startsAt,
          },
          tx
        ));
      }
      if (newlyAbsent.length > 0) shouldDispatchTelegramReminders = true;

      results.push({
        slotId,
        records: await tx.attendanceRecord.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "asc" } }),
      });
    }

    return results;
  }, { timeout: 30_000 }).then((results) => {
    dispatchEmails(emailIds);
    if (shouldDispatchTelegramReminders) dispatchTelegramReminders();
    return results;
  });
};

export const finalizeSession = async (actor: Actor, slotId: string) => {
  const slot = await slotWithGroup(slotId);
  await loadAccessibleGroup(actor, slot.groupId);
  if (!hasPermission(actor.role, "attendance:mark")) throw forbidden("You cannot mark attendance");
  if (!slot.session) throw conflict("Nothing has been marked yet");
  const session = await prisma.attendanceSession.update({ where: { id: slot.session.id }, data: { finalizedAt: new Date() } });
  await writeAudit({ actorId: actor.userId, action: "attendance.finalize", entity: "AttendanceSession", entityId: session.id });
  return session;
};

/** Sends a teacher-authored message only to linked students marked absent in this group's lesson. */
export const sendAttendanceTelegramMessage = async (
  actor: Actor,
  groupId: string,
  slotId: string,
  message: string,
  tomorrowMessage: string
) => {
  await loadAccessibleGroup(actor, groupId);
  if (!hasPermission(actor.role, "attendance:mark")) throw forbidden("You cannot send attendance messages");
  if (!isTelegramConfigured()) throw new HttpError(503, "Telegram bot is not configured");

  const slot = await slotWithGroup(slotId);
  if (slot.groupId !== groupId) throw notFound("Lesson not found in this group");
  if (slot.status === "CANCELLED") throw conflict("A cancelled lesson has no attendance");
  if (!slot.session) return { recipients: 0, sent: 0, failed: 0 };

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: slot.session.id, status: "ABSENT" },
    select: { studentId: true },
  });
  const absentIds = records.map((record) => record.studentId);
  if (absentIds.length === 0) return { recipients: 0, sent: 0, failed: 0 };

  await prisma.notification.updateMany({
    where: {
      type: "ATTENDANCE_ABSENT",
      dedupeKey: `absent:${slot.session.id}`,
      userId: { in: absentIds },
      telegramNextAt: { not: null },
      telegramSends: { lt: TELEGRAM_REMINDER_COUNT },
    },
    data: { telegramTodayMessage: message, telegramTomorrowMessage: tomorrowMessage },
  });

  const members = await prisma.groupMembership.findMany({
    where: {
      groupId,
      leftAt: null,
      studentId: { in: absentIds },
      student: { isActive: true, telegramId: { not: null } },
    },
    select: { student: { select: { telegramId: true } } },
  });
  const telegramIds = members.flatMap((member) => member.student.telegramId ? [member.student.telegramId] : []);
  let sent = 0;
  for (let i = 0; i < telegramIds.length; i += 5) {
    const results = await Promise.all(telegramIds.slice(i, i + 5).map((id) => sendTelegramNotice(id, message)));
    sent += results.filter(Boolean).length;
    if (i + 5 < telegramIds.length) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const failed = telegramIds.length - sent;
  await writeAudit({
    actorId: actor.userId,
    action: "attendance.telegram.send",
    entity: "ScheduleSlot",
    entityId: slotId,
    after: { attempted: telegramIds.length, sent, failed },
  });
  return { recipients: telegramIds.length, sent, failed };
};

export const getSessionRoster = async (actor: Actor, slotId: string) => {
  const slot = await slotWithGroup(slotId);
  await loadAccessibleGroup(actor, slot.groupId);
  const [members, records] = await Promise.all([
    prisma.groupMembership.findMany({ where: { groupId: slot.groupId, leftAt: null }, include: { student: { select: { id: true, name: true } } } }),
    slot.session ? prisma.attendanceRecord.findMany({ where: { sessionId: slot.session.id } }) : Promise.resolve([]),
  ]);
  const byStudent = new Map(records.map((r) => [r.studentId, r]));
  return {
    slot: { id: slot.id, startsAt: slot.startsAt, endsAt: slot.endsAt, status: slot.status, onlineUrl: slot.onlineUrl, finalizedAt: slot.session?.finalizedAt ?? null },
    students: members.map((m) => ({ studentId: m.studentId, name: m.student.name, status: byStudent.get(m.studentId)?.status ?? null, note: byStudent.get(m.studentId)?.note ?? null })),
  };
};

/** Statuses of lessons that count: cancelled lessons are excluded from totals. */
const countedRecords = (where: object) =>
  prisma.attendanceRecord.findMany({ where: { ...where, session: { slot: { status: { not: "CANCELLED" } } } }, select: { status: true, studentId: true } });

/** A student sees only their own attendance (userId comes from the token, never from the URL). */
export const myAttendance = async (studentId: string) => {
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    orderBy: { session: { slot: { startsAt: "desc" } } },
    take: 200,
    select: { status: true, note: true, session: { select: { slot: { select: { startsAt: true, topic: true, status: true, group: { select: { name: true } } } } } } },
  });
  const counted = records.filter((r) => r.session.slot.status !== "CANCELLED");
  return { summary: summarize(counted.map((r) => r.status)), records };
};

export const groupReport = async (actor: Actor, groupId: string) => {
  await loadAccessibleGroup(actor, groupId);
  const [members, records, lessons] = await Promise.all([
    prisma.groupMembership.findMany({ where: { groupId, leftAt: null }, include: { student: { select: { id: true, name: true } } } }),
    countedRecords({ session: { slot: { groupId } } }),
    prisma.scheduleSlot.count({ where: { groupId, status: { not: "CANCELLED" } } }),
  ]);
  const rows = members.map((m) => ({
    studentId: m.studentId,
    name: m.student.name,
    ...summarize(records.filter((r) => r.studentId === m.studentId).map((r) => r.status)),
  }));
  return { groupId, lessons, rows };
};

const TASHKENT_OFFSET_MS = 5 * 3_600_000;

/** "YYYY-MM" of an instant on the Tashkent calendar. */
const monthKey = (date: Date): string => {
  const local = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
};

/**
 * One month of lessons with every member's marks: the data behind the group's attendance journal.
 * The month is a Tashkent calendar month (UTC+5, no DST); cancelled lessons stay in the list so the
 * grid can show them, but their marks never count anywhere.
 */
export const groupMonthlyJournal = async (actor: Actor, groupId: string, month?: string) => {
  await loadAccessibleGroup(actor, groupId);
  const key = month ?? monthKey(new Date());
  const [year, monthNo] = key.split("-").map(Number);
  const from = new Date(Date.UTC(year, monthNo - 1, 1) - TASHKENT_OFFSET_MS);
  const to = new Date(Date.UTC(year, monthNo, 1) - TASHKENT_OFFSET_MS);

  const [members, slots] = await Promise.all([
    prisma.groupMembership.findMany({
      where: { groupId, leftAt: null },
      orderBy: { student: { name: "asc" } },
      select: { studentId: true, student: { select: { name: true, phone: true, userNumber: true, studentNumber: true, telegramId: true } } },
    }),
    prisma.scheduleSlot.findMany({
      where: { groupId, startsAt: { gte: from, lt: to } },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        topic: true,
        status: true,
        onlineUrl: true,
        session: { select: { finalizedAt: true, records: { select: { studentId: true, status: true, note: true } } } },
      },
    }),
  ]);

  return {
    groupId,
    month: key,
    members: members.map((m) => {
      const { telegramId, ...student } = m.student;
      return { studentId: m.studentId, ...student, telegramLinked: Boolean(telegramId) };
    }),
    lessons: slots.map((s) => ({
      slotId: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      topic: s.topic,
      status: s.status,
      onlineUrl: s.onlineUrl,
      finalizedAt: s.session?.finalizedAt ?? null,
      records: s.session?.records ?? [],
    })),
  };
};

/** CSV export is limited to roles with reports:read (admins), not teachers. */
export const groupReportCsv = async (actor: Actor, groupId: string) => {
  if (!hasPermission(actor.role, "reports:read")) throw forbidden("Export is not allowed for your role");
  const report = await groupReport(actor, groupId);
  await writeAudit({ actorId: actor.userId, action: "attendance.export", entity: "TeacherGroup", entityId: groupId });
  return toCsv(
    ["student", "total", "present", "late", "online", "absent", "excused", "percent"],
    report.rows.map((r) => [r.name, r.total, r.present, r.late, r.online, r.absent, r.excused, r.percent ?? ""])
  );
};
