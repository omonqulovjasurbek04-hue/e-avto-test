import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors";
import { hasPermission } from "../lib/permissions";
import { accountIdFilter } from "../lib/accountNumbers";
import { expandRecurrence, findConflicts, GroupDays, Interval, Recurrence, RHYTHM_WEEKDAYS, rhythmIntervals } from "../lib/schedule";
import { writeAudit } from "./audit.service";
import { dispatchEmails, notify } from "./notification.service";

export interface Actor {
  userId: string;
  role: string;
}

const isAdmin = (a: Actor) => hasPermission(a.role, "groups:manage");

/**
 * Ownership gate used by every teacher-facing call. Admins (groups:manage) see all groups; a teacher
 * only the groups assigned to them. A foreign group is reported as "not found", not "forbidden".
 */
export const loadAccessibleGroup = async (actor: Actor, groupId: string) => {
  const group = await prisma.teacherGroup.findUnique({ where: { id: groupId } });
  if (!group) throw notFound("Group not found");
  if (isAdmin(actor)) return group;
  if (hasPermission(actor.role, "teaching:access") && group.teacherId === actor.userId) return group;
  throw notFound("Group not found");
};

/**
 * Groups the actor may change: every group with groups:manage (admins, Administrator), and with
 * groups:own (teachers) only the groups they teach. Someone else's group stays "not found".
 */
export const loadManageableGroup = async (actor: Actor, groupId: string) => {
  const group = await loadAccessibleGroup(actor, groupId);
  if (isAdmin(actor) || (hasPermission(actor.role, "groups:own") && group.teacherId === actor.userId)) return group;
  throw forbidden("You cannot change this group");
};

// ───────────── groups ─────────────

const assertTeacher = async (teacherId: string) => {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { role: true, isActive: true } });
  if (!teacher || teacher.role !== "TEACHER" || !teacher.isActive) throw badRequest("teacherId must be an active user with the TEACHER role");
};

/** Lesson length when a rhythm is chosen without one. */
export const DEFAULT_LESSON_MINUTES = 90;

export interface GroupInput {
  name: string;
  courseId: string;
  teacherId: string;
  startDate: Date;
  endDate?: Date | null;
  capacity: number;
  days?: GroupDays | null;
  startTime?: string | null;
  lessonMinutes?: number | null;
  room?: string | null;
}

/** The lessons a rhythm produces (from `from` on), or none when the group has no rhythm. */
const lessonsOf = (g: Pick<GroupInput, "startDate" | "endDate" | "days" | "startTime" | "lessonMinutes">, from?: Date) => {
  if (!g.days || !g.startTime) return [];
  try {
    return rhythmIntervals({ startDate: g.startDate, endDate: g.endDate, days: g.days, startTime: g.startTime, lessonMinutes: g.lessonMinutes ?? DEFAULT_LESSON_MINUTES }, from);
  } catch (e) {
    throw badRequest((e as Error).message);
  }
};

/** Teacher and room cannot be double-booked; the group's own lessons that are being replaced do not count. */
const assertNoConflicts = async (intervals: Interval[], teacherId: string, room: string | null, replacing?: { groupId: string; from: Date }) => {
  if (intervals.length === 0) return;
  const from = intervals[0].startsAt;
  const to = intervals[intervals.length - 1].endsAt;
  const nearby = await prisma.scheduleSlot.findMany({
    where: {
      status: { not: "CANCELLED" },
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(replacing ? { NOT: { groupId: replacing.groupId, startsAt: { gte: replacing.from } } } : {}),
    },
    include: { group: { select: { teacherId: true } } },
  });
  const existing = nearby.map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt, room: s.room, groupId: s.groupId, teacherId: s.group.teacherId }));
  const conflicts = intervals.flatMap((iv) => findConflicts({ ...iv, teacherId, room }, existing).map((c) => ({ ...c, startsAt: iv.startsAt })));
  if (conflicts.length > 0) throw Object.assign(conflict("Schedule conflict"), { details: conflicts });
};

/**
 * Opens a group. Admins (groups:manage) choose any teacher; a teacher (groups:own) opens it for
 * themselves. With days (toq/juft) and a start time, the lessons are created right away.
 */
export const createGroup = async (actor: Actor, input: Omit<GroupInput, "teacherId"> & { teacherId?: string }) => {
  if (!isAdmin(actor) && !hasPermission(actor.role, "groups:own")) throw forbidden("You cannot open groups");
  const teacherId = isAdmin(actor) ? input.teacherId : actor.userId;
  if (!teacherId) throw badRequest("teacherId is required");
  const data: GroupInput = {
    ...input,
    teacherId,
    lessonMinutes: input.days ? (input.lessonMinutes ?? DEFAULT_LESSON_MINUTES) : input.lessonMinutes,
  };
  await assertTeacher(data.teacherId);
  if (!(await prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } }))) throw notFound("Course not found");
  if (data.endDate && data.endDate <= data.startDate) throw badRequest("endDate must be after startDate");

  const lessons = lessonsOf(data);
  await assertNoConflicts(lessons, data.teacherId, data.room ?? null);
  return prisma.$transaction(async (tx) => {
    const g = await tx.teacherGroup.create({ data });
    if (lessons.length > 0) await tx.scheduleSlot.createMany({ data: lessons.map((iv) => ({ groupId: g.id, ...iv, room: data.room ?? null })) });
    await writeAudit({ actorId: actor.userId, action: "group.create", entity: "TeacherGroup", entityId: g.id, after: { ...g, lessons: lessons.length } }, tx);
    return { ...g, lessonsCreated: lessons.length };
  });
};

/**
 * Changes a group. When the rhythm (days, time, length, room or dates) changes, the future lessons
 * that have no attendance yet are replaced by the new rhythm and the students are told.
 */
export const updateGroup = async (actor: Actor, id: string, data: Partial<GroupInput>) => {
  await loadManageableGroup(actor, id);
  const before = await prisma.teacherGroup.findUniqueOrThrow({ where: { id }, include: { _count: { select: { members: { where: { leftAt: null } } } } } });
  if (data.teacherId !== undefined && data.teacherId !== before.teacherId) {
    if (!isAdmin(actor)) throw forbidden("Only an administrator can change the teacher");
    await assertTeacher(data.teacherId);
  }
  if (typeof data.capacity === "number" && data.capacity < before._count.members) throw conflict("Capacity is below the current number of members");
  const next = { ...before, ...data };
  if (data.days && !data.lessonMinutes && !before.lessonMinutes) next.lessonMinutes = DEFAULT_LESSON_MINUTES;
  if (next.endDate && next.endDate <= next.startDate) throw badRequest("endDate must be after startDate");

  const rhythmKeys = ["days", "startTime", "lessonMinutes", "room", "startDate", "endDate"] as const;
  const rhythmChanged = rhythmKeys.some((k) => data[k] !== undefined && String(data[k]) !== String(before[k]));
  const from = new Date(Math.max(Date.now(), next.startDate.getTime()));
  const lessons = rhythmChanged ? lessonsOf(next, from) : [];
  if (rhythmChanged) await assertNoConflicts(lessons, next.teacherId, next.room ?? null, { groupId: id, from });

  const emailIds: (string | null)[] = [];
  const updated = await prisma.$transaction(async (tx) => {
    const g = await tx.teacherGroup.update({
      where: { id },
      data: {
        ...data,
        ...(next.lessonMinutes !== before.lessonMinutes ? { lessonMinutes: next.lessonMinutes } : {}),
        // A finished (archived) group whose end date is moved into the future runs again.
        ...(before.status === "ARCHIVED" && data.endDate !== undefined && (!next.endDate || next.endDate > new Date()) ? { status: "ACTIVE" as const } : {}),
      },
    });
    let replaced = 0;
    if (rhythmChanged && next.days && next.startTime) {
      // Lessons that already have attendance are history and stay; only untouched future lessons move.
      replaced = (await tx.scheduleSlot.deleteMany({ where: { groupId: id, startsAt: { gte: from }, status: "PLANNED", session: null } })).count;
      if (lessons.length > 0) await tx.scheduleSlot.createMany({ data: lessons.map((iv) => ({ groupId: id, ...iv, room: next.room ?? null })) });
      for (const studentId of await memberIds(tx, id)) {
        emailIds.push(await notify({ userId: studentId, type: "SCHEDULE_NEW", dedupeKey: `rhythm:${id}:${g.updatedAt.getTime()}`, template: "SCHEDULE_NEW", vars: { group: g.name, count: lessons.length }, email: true }, tx));
      }
    }
    await writeAudit({ actorId: actor.userId, action: "group.update", entity: "TeacherGroup", entityId: id, before: { ...before, _count: undefined }, after: { ...g, lessonsReplaced: replaced, lessonsCreated: lessons.length } }, tx);
    return { ...g, lessonsCreated: lessons.length };
  });
  dispatchEmails(emailIds);
  return updated;
};

export const archiveGroup = async (actor: Actor, id: string) => {
  const before = await loadManageableGroup(actor, id);
  const actorId = actor.userId;
  return prisma.$transaction(async (tx) => {
    const g = await tx.teacherGroup.update({ where: { id }, data: { status: "ARCHIVED" } });
    await writeAudit({ actorId, action: "group.archive", entity: "TeacherGroup", entityId: id, before, after: g }, tx);
    return g;
  });
};

/** Brings an archived group back. One whose end date has passed would be archived again at once: extend the date first (edit). */
export const restoreGroup = async (actor: Actor, id: string) => {
  const before = await loadManageableGroup(actor, id);
  if (before.status !== "ARCHIVED") return before;
  if (before.endDate && before.endDate < new Date()) throw conflict("The group's end date has passed; extend it first");
  return prisma.$transaction(async (tx) => {
    const g = await tx.teacherGroup.update({ where: { id }, data: { status: "ACTIVE" } });
    await writeAudit({ actorId: actor.userId, action: "group.restore", entity: "TeacherGroup", entityId: id, before, after: g }, tx);
    return g;
  });
};

/**
 * Deletes a group for good: its members, lessons and attendance go with it (database cascade). The
 * snapshot and the counts stay in the audit log. Archiving is the way to keep the history instead.
 */
export const deleteGroup = async (actor: Actor, id: string) => {
  const before = await loadManageableGroup(actor, id);
  const [members, slots, records] = await Promise.all([
    prisma.groupMembership.count({ where: { groupId: id } }),
    prisma.scheduleSlot.count({ where: { groupId: id } }),
    prisma.attendanceRecord.count({ where: { session: { slot: { groupId: id } } } }),
  ]);
  return prisma.$transaction(async (tx) => {
    await tx.teacherGroup.delete({ where: { id } });
    await writeAudit({ actorId: actor.userId, action: "group.delete", entity: "TeacherGroup", entityId: id, before: { ...before, members, slots, attendanceRecords: records } }, tx);
    return { deleted: true };
  });
};

/**
 * A group whose end date has passed is finished: it moves to the archive by itself (history kept). Runs in
 * the periodic job and before the group list is read, so the list is right even between job runs.
 */
export const archiveFinishedGroups = async (now = new Date()) => {
  const finished = await prisma.teacherGroup.findMany({ where: { status: "ACTIVE", endDate: { lt: now } }, select: { id: true, name: true, endDate: true } });
  if (finished.length === 0) return 0;
  await prisma.$transaction(async (tx) => {
    await tx.teacherGroup.updateMany({ where: { id: { in: finished.map((g) => g.id) }, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
    for (const g of finished) {
      await writeAudit({ actorId: null, action: "group.archive.finished", entity: "TeacherGroup", entityId: g.id, after: { name: g.name, endDate: g.endDate } }, tx);
    }
  });
  return finished.length;
};

export const listGroups = async (actor: Actor) => {
  await archiveFinishedGroups();
  return listGroupRows(actor);
};

const listGroupRows = (actor: Actor) =>
  prisma.teacherGroup.findMany({
    where: isAdmin(actor) ? {} : { teacherId: actor.userId },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, title: true } },
      teacher: { select: { id: true, name: true } },
      _count: { select: { members: { where: { leftAt: null } } } },
    },
  });

export const getGroup = async (actor: Actor, id: string) => {
  await loadAccessibleGroup(actor, id);
  return prisma.teacherGroup.findUniqueOrThrow({
    where: { id },
    include: {
      course: { select: { id: true, title: true } },
      teacher: { select: { id: true, name: true } },
      members: { where: { leftAt: null }, include: { student: { select: { id: true, name: true, phone: true } } } },
    },
  });
};

// ───────────── membership ─────────────

/** Students a group owner can add: active student accounts by name, phone or user####/student####. */
export const searchStudents = async (query: string) => {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const digits = q.replace(/\D/g, "");
  // Only a query that looks like a phone number ("90 123 45 67", "+998…") is matched against phones.
  const isPhone = /^[\d\s+()-]+$/.test(q) && digits.length >= 4;
  const where: Prisma.UserWhereInput =
    accountIdFilter(q) ?? (isPhone ? { phone: { contains: digits.slice(-9) } } : { name: { contains: q, mode: "insensitive" } });
  return prisma.user.findMany({
    where: { role: "USER", isActive: true, ...where },
    orderBy: { name: "asc" },
    take: 10,
    select: { id: true, name: true, phone: true, userNumber: true, studentNumber: true },
  });
};

export const addMember = async (actor: Actor, groupId: string, studentId: string) => {
  await loadManageableGroup(actor, groupId);
  const actorId = actor.userId;
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { role: true, isActive: true } });
  if (!student || student.role !== "USER" || !student.isActive) throw badRequest("studentId must be an active student");

  return prisma.$transaction(async (tx) => {
    // Lock the group row so two concurrent adds cannot both take the last seat.
    const locked = await tx.$queryRaw<{ capacity: number; status: string }[]>`SELECT "capacity", "status"::text AS status FROM "teacher_groups" WHERE "id" = ${groupId} FOR UPDATE`;
    if (locked.length === 0) throw notFound("Group not found");
    if (locked[0].status !== "ACTIVE") throw conflict("Group is archived");

    const existing = await tx.groupMembership.findUnique({ where: { groupId_studentId: { groupId, studentId } } });
    if (existing && existing.leftAt === null) throw conflict("Student is already in this group");

    const current = await tx.groupMembership.count({ where: { groupId, leftAt: null } });
    if (current >= locked[0].capacity) throw conflict("Group is full");

    const membership = existing
      ? await tx.groupMembership.update({ where: { id: existing.id }, data: { leftAt: null, joinedAt: new Date() } })
      : await tx.groupMembership.create({ data: { groupId, studentId } });
    await writeAudit({ actorId, action: "group.member.add", entity: "TeacherGroup", entityId: groupId, after: { studentId } }, tx);
    return membership;
  });
};

export const removeMember = async (actor: Actor, groupId: string, studentId: string) => {
  await loadManageableGroup(actor, groupId);
  const actorId = actor.userId;
  const res = await prisma.groupMembership.updateMany({ where: { groupId, studentId, leftAt: null }, data: { leftAt: new Date() } });
  if (res.count === 0) throw notFound("Membership not found");
  await writeAudit({ actorId, action: "group.member.remove", entity: "TeacherGroup", entityId: groupId, before: { studentId } });
  return { removed: true };
};

// ───────────── schedule ─────────────

export const createSlots = async (
  actor: Actor,
  groupId: string,
  input: { startsAt: Date; endsAt: Date; room?: string | null; onlineUrl?: string | null; topic?: string | null; repeat?: Recurrence }
) => {
  // Schedule planners (schedule:manage) plan any group; a teacher plans the groups they opened or teach (groups:own).
  const group = hasPermission(actor.role, "schedule:manage") ? await loadAccessibleGroup(actor, groupId) : await loadManageableGroup(actor, groupId);
  if (group.status !== "ACTIVE") throw conflict("Group is archived");

  let intervals;
  try {
    intervals = expandRecurrence({ startsAt: input.startsAt, endsAt: input.endsAt }, input.repeat);
  } catch (e) {
    throw badRequest((e as Error).message);
  }

  const from = intervals[0].startsAt;
  await assertNoConflicts(intervals, group.teacherId, input.room ?? null);

  const emailIds: (string | null)[] = [];
  const created = await prisma.$transaction(async (tx) => {
    await tx.scheduleSlot.createMany({
      data: intervals.map((iv) => ({ groupId, ...iv, room: input.room ?? null, onlineUrl: input.onlineUrl ?? null, topic: input.topic ?? null })),
    });
    await writeAudit({ actorId: actor.userId, action: "schedule.create", entity: "TeacherGroup", entityId: groupId, after: { count: intervals.length, first: from } }, tx);
    const rows = await tx.scheduleSlot.findMany({ where: { groupId, startsAt: { gte: from, lte: intervals[intervals.length - 1].startsAt } }, orderBy: { startsAt: "asc" } });
    for (const studentId of await memberIds(tx, groupId)) {
      emailIds.push(await notify({ userId: studentId, type: "SCHEDULE_NEW", dedupeKey: `slots:${groupId}:${from.getTime()}`, template: "SCHEDULE_NEW", vars: { group: group.name, count: intervals.length }, email: true }, tx));
    }
    return rows;
  });
  dispatchEmails(emailIds);
  return created;
};

const memberIds = async (db: Parameters<typeof notify>[1], groupId: string): Promise<string[]> =>
  (await db!.groupMembership.findMany({ where: { groupId, leftAt: null }, select: { studentId: true } })).map((m) => m.studentId);

export const updateSlot = async (actor: Actor, slotId: string, data: { topic?: string | null; room?: string | null; onlineUrl?: string | null; status?: "PLANNED" | "DONE" | "CANCELLED" }) => {
  const slot = await prisma.scheduleSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw notFound("Slot not found");
  const { name: groupName } = await loadAccessibleGroup(actor, slot.groupId);
  // Teachers may set the topic and mark a lesson done; time/room/cancel stay with the schedule managers.
  const planner = hasPermission(actor.role, "schedule:manage");
  if (!planner && (data.room !== undefined || data.onlineUrl !== undefined || data.status === "CANCELLED" || data.status === "PLANNED")) {
    throw forbidden("Only schedule managers can change room, link or cancel a lesson");
  }
  const emailIds: (string | null)[] = [];
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.scheduleSlot.update({ where: { id: slotId }, data });
    await writeAudit({ actorId: actor.userId, action: "schedule.update", entity: "ScheduleSlot", entityId: slotId, before: slot, after: next }, tx);
    // Students are told only about changes that affect them (cancellation, room, online link), once per change.
    const cancelled = data.status === "CANCELLED" && slot.status !== "CANCELLED";
    const moved = (data.room !== undefined && data.room !== slot.room) || (data.onlineUrl !== undefined && data.onlineUrl !== slot.onlineUrl);
    if (cancelled || moved) {
      for (const studentId of await memberIds(tx, slot.groupId)) {
        emailIds.push(await notify({ userId: studentId, type: cancelled ? "SCHEDULE_CANCELLED" : "SCHEDULE_CHANGED", dedupeKey: `slot:${slotId}:${next.updatedAt.getTime()}`, template: cancelled ? "SCHEDULE_CANCELLED" : "SCHEDULE_CHANGED", vars: { group: groupName, date: next.startsAt }, email: true }, tx));
      }
    }
    return next;
  });
  dispatchEmails(emailIds);
  return updated;
};

export const listSlots = async (actor: Actor, groupId: string) => {
  await loadAccessibleGroup(actor, groupId);
  return prisma.scheduleSlot.findMany({ where: { groupId }, orderBy: { startsAt: "asc" }, include: { session: { select: { id: true, finalizedAt: true } } } });
};

/** Teacher's own upcoming lessons across their groups (admins pass no restriction via listGroups). */
export const mySchedule = async (actor: Actor, from: Date, to: Date) =>
  prisma.scheduleSlot.findMany({
    where: { startsAt: { gte: from, lt: to }, group: { teacherId: actor.userId, status: "ACTIVE" } },
    orderBy: { startsAt: "asc" },
    include: { group: { select: { id: true, name: true } } },
  });

/**
 * The teacher's dashboard: their active groups and students, today's and this week's lessons, the
 * attendance rate of the last 30 days, lessons that took place but still need attendance, and the next
 * lessons. Only the teacher's own groups count.
 */
const DAY_MS = 86_400_000;

export const teacherOverview = async (actor: Actor, now: Date = new Date()) => {
  const mine = { teacherId: actor.userId, status: "ACTIVE" as const };
  // Tashkent calendar day and the week from it.
  const localMidnight = new Date(Math.floor((now.getTime() + TZ_OFFSET_MS) / DAY_MS) * DAY_MS - TZ_OFFSET_MS);
  const dayEnd = new Date(localMidnight.getTime() + DAY_MS);
  const weekEnd = new Date(localMidnight.getTime() + 7 * DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);

  const [groups, students, today, week, records, unmarked, next] = await Promise.all([
    prisma.teacherGroup.count({ where: mine }),
    prisma.groupMembership.findMany({ where: { leftAt: null, group: mine }, distinct: ["studentId"], select: { studentId: true } }),
    prisma.scheduleSlot.count({ where: { startsAt: { gte: localMidnight, lt: dayEnd }, status: { not: "CANCELLED" }, group: mine } }),
    prisma.scheduleSlot.count({ where: { startsAt: { gte: localMidnight, lt: weekEnd }, status: { not: "CANCELLED" }, group: mine } }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: { session: { slot: { startsAt: { gte: monthAgo, lt: now }, group: { teacherId: actor.userId } } } },
      _count: true,
    }),
    prisma.scheduleSlot.findMany({
      where: { startsAt: { gte: twoWeeksAgo, lt: now }, status: { not: "CANCELLED" }, group: mine, OR: [{ session: null }, { session: { finalizedAt: null } }] },
      orderBy: { startsAt: "desc" },
      take: 5,
      select: { id: true, startsAt: true, topic: true, group: { select: { id: true, name: true } } },
    }),
    prisma.scheduleSlot.findMany({
      where: { startsAt: { gte: now }, status: { not: "CANCELLED" }, group: mine },
      orderBy: { startsAt: "asc" },
      take: 5,
      select: { id: true, startsAt: true, endsAt: true, topic: true, room: true, group: { select: { id: true, name: true, _count: { select: { members: { where: { leftAt: null } } } } } } },
    }),
  ]);

  const marked = records.reduce((sum, r) => sum + r._count, 0);
  const present = records.filter((r) => ["PRESENT", "LATE", "ONLINE"].includes(r.status)).reduce((sum, r) => sum + r._count, 0);
  return {
    groups,
    students: students.length,
    lessonsToday: today,
    lessonsThisWeek: week,
    // null until attendance was marked at least once in the last 30 days.
    attendanceRate: marked ? Math.round((present / marked) * 100) : null,
    unmarked,
    next: next.map(({ group, ...slot }) => ({ ...slot, group: { id: group.id, name: group.name, students: group._count.members } })),
  };
};

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000; // Asia/Tashkent, no DST
const hhmm = (d: Date) => new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(11, 16);

/**
 * The student's current groups with their rhythm, read from the group's lessons around today:
 * Mon/Wed/Fri = "ODD" (toq kunlar), Tue/Thu/Sat = "EVEN" (juft kunlar), anything else "CUSTOM"
 * (with the weekdays), plus the usual lesson time in Tashkent.
 */
export const studentGroups = async (studentId: string, now = new Date()) => {
  const groups = await prisma.teacherGroup.findMany({
    where: { status: "ACTIVE", members: { some: { studentId, leftAt: null } } },
    select: {
      id: true,
      name: true,
      days: true,
      startTime: true,
      lessonMinutes: true,
      course: { select: { title: true } },
      slots: {
        where: { status: { not: "CANCELLED" }, startsAt: { gte: new Date(now.getTime() - 28 * 86_400_000), lt: new Date(now.getTime() + 56 * 86_400_000) } },
        select: { startsAt: true, endsAt: true },
      },
    },
    orderBy: { name: "asc" },
  });
  return groups.map((g) => {
    // A rhythm chosen when the group was opened is the answer; older groups are read from their lessons.
    if (g.days && g.startTime) {
      const [hh, mm] = g.startTime.split(":").map(Number);
      const end = hh * 60 + mm + (g.lessonMinutes ?? DEFAULT_LESSON_MINUTES);
      const endTime = `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
      return { id: g.id, name: g.name, course: g.course.title, days: g.days, weekdays: [...RHYTHM_WEEKDAYS[g.days]], time: `${g.startTime}–${endTime}` };
    }
    // Monday = 1 … Sunday = 7, in Tashkent.
    const weekdays = [...new Set(g.slots.map((s) => new Date(s.startsAt.getTime() + TZ_OFFSET_MS).getUTCDay() || 7))].sort();
    const within = (set: number[]) => weekdays.length > 0 && weekdays.every((d) => set.includes(d));
    const days = within([1, 3, 5]) ? "ODD" : within([2, 4, 6]) ? "EVEN" : "CUSTOM";
    const times = new Map<string, number>();
    for (const s of g.slots) {
      const key = `${hhmm(s.startsAt)}–${hhmm(s.endsAt)}`;
      times.set(key, (times.get(key) ?? 0) + 1);
    }
    const time = [...times.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { id: g.id, name: g.name, course: g.course.title, days, weekdays, time };
  });
};

/** A student's schedule: only groups they are currently a member of. */
export const studentSchedule = async (studentId: string, from: Date, to: Date) =>
  prisma.scheduleSlot.findMany({
    where: { startsAt: { gte: from, lt: to }, group: { status: "ACTIVE", members: { some: { studentId, leftAt: null } } } },
    orderBy: { startsAt: "asc" },
    select: { id: true, startsAt: true, endsAt: true, room: true, onlineUrl: true, topic: true, status: true, group: { select: { id: true, name: true } } },
  });
