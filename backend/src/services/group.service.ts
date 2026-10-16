import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors";
import { hasPermission } from "../lib/permissions";
import { expandRecurrence, findConflicts, Recurrence } from "../lib/schedule";
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

// ───────────── admin: groups ─────────────

const assertTeacher = async (teacherId: string) => {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { role: true, isActive: true } });
  if (!teacher || teacher.role !== "TEACHER" || !teacher.isActive) throw badRequest("teacherId must be an active user with the TEACHER role");
};

export const createGroup = async (actorId: string, data: Prisma.TeacherGroupUncheckedCreateInput) => {
  await assertTeacher(data.teacherId);
  if (!(await prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } }))) throw notFound("Course not found");
  if (data.endDate && new Date(data.endDate) <= new Date(data.startDate as Date)) throw badRequest("endDate must be after startDate");
  return prisma.$transaction(async (tx) => {
    const g = await tx.teacherGroup.create({ data });
    await writeAudit({ actorId, action: "group.create", entity: "TeacherGroup", entityId: g.id, after: g }, tx);
    return g;
  });
};

export const updateGroup = async (actorId: string, id: string, data: Prisma.TeacherGroupUncheckedUpdateInput) => {
  const before = await prisma.teacherGroup.findUnique({ where: { id }, include: { _count: { select: { members: { where: { leftAt: null } } } } } });
  if (!before) throw notFound("Group not found");
  if (typeof data.teacherId === "string") await assertTeacher(data.teacherId);
  if (typeof data.capacity === "number" && data.capacity < before._count.members) throw conflict("Capacity is below the current number of members");
  return prisma.$transaction(async (tx) => {
    const g = await tx.teacherGroup.update({ where: { id }, data });
    await writeAudit({ actorId, action: "group.update", entity: "TeacherGroup", entityId: id, before: { ...before, _count: undefined }, after: g }, tx);
    return g;
  });
};

export const archiveGroup = async (actorId: string, id: string) => {
  const before = await prisma.teacherGroup.findUnique({ where: { id } });
  if (!before) throw notFound("Group not found");
  return prisma.$transaction(async (tx) => {
    const g = await tx.teacherGroup.update({ where: { id }, data: { status: "ARCHIVED" } });
    await writeAudit({ actorId, action: "group.archive", entity: "TeacherGroup", entityId: id, before, after: g }, tx);
    return g;
  });
};

export const listGroups = (actor: Actor) =>
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

// ───────────── admin: membership ─────────────

export const addMember = async (actorId: string, groupId: string, studentId: string) => {
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

export const removeMember = async (actorId: string, groupId: string, studentId: string) => {
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
  // Only admins plan the schedule (schedule:manage); teachers see and annotate it.
  if (!hasPermission(actor.role, "schedule:manage")) throw forbidden("You cannot change the schedule");
  const group = await loadAccessibleGroup(actor, groupId);
  if (group.status !== "ACTIVE") throw conflict("Group is archived");

  let intervals;
  try {
    intervals = expandRecurrence({ startsAt: input.startsAt, endsAt: input.endsAt }, input.repeat);
  } catch (e) {
    throw badRequest((e as Error).message);
  }

  const from = intervals[0].startsAt;
  const to = intervals[intervals.length - 1].endsAt;
  const nearby = await prisma.scheduleSlot.findMany({
    where: { status: { not: "CANCELLED" }, startsAt: { lt: to }, endsAt: { gt: from } },
    include: { group: { select: { teacherId: true } } },
  });
  const existing = nearby.map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt, room: s.room, groupId: s.groupId, teacherId: s.group.teacherId }));

  const conflicts = intervals.flatMap((iv) => findConflicts({ ...iv, teacherId: group.teacherId, room: input.room ?? null }, existing).map((c) => ({ ...c, startsAt: iv.startsAt })));
  if (conflicts.length > 0) throw Object.assign(conflict("Schedule conflict"), { details: conflicts });

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

/** A student's schedule: only groups they are currently a member of. */
export const studentSchedule = async (studentId: string, from: Date, to: Date) =>
  prisma.scheduleSlot.findMany({
    where: { startsAt: { gte: from, lt: to }, group: { status: "ACTIVE", members: { some: { studentId, leftAt: null } } } },
    orderBy: { startsAt: "asc" },
    select: { id: true, startsAt: true, endsAt: true, room: true, onlineUrl: true, topic: true, status: true, group: { select: { id: true, name: true } } },
  });
