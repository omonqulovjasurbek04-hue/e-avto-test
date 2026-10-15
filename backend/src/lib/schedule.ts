/**
 * Schedule helpers. All instants are UTC; Asia/Tashkent has no DST (fixed UTC+5), so adding
 * whole weeks in UTC keeps the local wall-clock time stable.
 */

export interface Interval {
  startsAt: Date;
  endsAt: Date;
}

/** Half-open overlap: back-to-back lessons (one ends exactly when the next starts) do not conflict. */
export const overlaps = (a: Interval, b: Interval): boolean => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

export interface Recurrence {
  /** Repeat every N weeks (1 = weekly). */
  everyWeeks: number;
  /** Total number of occurrences including the first (max 104). */
  count: number;
}

const WEEK_MS = 7 * 86_400_000;
export const MAX_OCCURRENCES = 104;

export const expandRecurrence = (first: Interval, rule?: Recurrence): Interval[] => {
  if (first.endsAt <= first.startsAt) throw new Error("endsAt must be after startsAt");
  if (!rule) return [first];
  if (rule.everyWeeks < 1 || rule.count < 1 || rule.count > MAX_OCCURRENCES) throw new Error("Invalid recurrence");
  return Array.from({ length: rule.count }, (_, i) => ({
    startsAt: new Date(first.startsAt.getTime() + i * rule.everyWeeks * WEEK_MS),
    endsAt: new Date(first.endsAt.getTime() + i * rule.everyWeeks * WEEK_MS),
  }));
};

export interface ExistingSlot extends Interval {
  id: string;
  teacherId: string;
  room: string | null;
  groupId: string;
}

export interface Conflict {
  slotId: string;
  kind: "teacher" | "room";
}

/** Candidate vs existing non-cancelled slots: the same teacher or the same room cannot be double-booked. */
export const findConflicts = (candidate: Interval & { teacherId: string; room: string | null }, existing: ExistingSlot[]): Conflict[] => {
  const out: Conflict[] = [];
  for (const slot of existing) {
    if (!overlaps(candidate, slot)) continue;
    if (slot.teacherId === candidate.teacherId) out.push({ slotId: slot.id, kind: "teacher" });
    else if (candidate.room && slot.room && slot.room.toLowerCase() === candidate.room.toLowerCase()) out.push({ slotId: slot.id, kind: "room" });
  }
  return out;
};
