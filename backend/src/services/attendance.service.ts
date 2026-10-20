import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors";
import { hasPermission } from "../lib/permissions";
import { summarize, toCsv } from "../lib/attendance";
import { writeAudit } from "./audit.service";
import { Actor, loadAccessibleGroup } from "./group.service";
import { cancelTelegramReminders, dispatchEmails, dispatchTelegramReminders, notify } from "./notification.service";

interface Mark {
  studentId: string;
  status: AttendanceStatus;
  note?: string | null;
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
 * - First marking is free; changing an existing record needs a reason, and after the session is
 *   finalized only users with attendance:edit (admin) may change it. Every change is audited with old/new.
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
    const changesExisting = marks.some((m) => {
      const prev = byStudent.get(m.studentId);
      return prev && (prev.status !== m.status || (prev.note ?? null) !== (m.note ?? null));
    });
    if (changesExisting && !reason) throw badRequest("A reason is required to change saved attendance");

    const newlyAbsent: string[] = [];
    for (const m of marks) {
      const prev = byStudent.get(m.studentId);
      if (prev && prev.status === m.status && (prev.note ?? null) === (m.note ?? null)) continue;
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
      emailIds.push(await notify({ userId: studentId, type: "ATTENDANCE_ABSENT", category: "attendance", dedupeKey: `absent:${session.id}`, template: "ATTENDANCE_ABSENT", vars: { group: slot.group.name, date: slot.startsAt }, email: true, telegram: true }, tx));
    }

    return tx.attendanceRecord.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "asc" } });
  });
  dispatchEmails(emailIds);
  if (newlyAbsentCount > 0) dispatchTelegramReminders();
  return records;
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
