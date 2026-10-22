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

// ───────────── weekly rhythm (toq / juft kunlar) ─────────────

export type GroupDays = "ODD" | "EVEN";

/** ODD = toq kunlar (Mon/Wed/Fri), EVEN = juft kunlar (Tue/Thu/Sat). JS weekday numbers (0 = Sunday). */
export const RHYTHM_WEEKDAYS: Record<GroupDays, readonly number[]> = { ODD: [1, 3, 5], EVEN: [2, 4, 6] };

const TASHKENT_OFFSET_MS = 5 * 3_600_000;
const DAY_MS = 86_400_000;
/** Without an end date the lessons are planned this far ahead; they can be extended later. */
export const DEFAULT_RHYTHM_WEEKS = 12;

export interface Rhythm {
  /** Calendar dates (only the Y-M-D part is used, as a Tashkent date). */
  startDate: Date;
  endDate?: Date | null;
  days: GroupDays;
  /** "HH:MM", Tashkent time. */
  startTime: string;
  lessonMinutes: number;
}

/**
 * Every lesson of the rhythm between the start and end dates (both inclusive), in UTC.
 * `from` skips lessons that start earlier (used when the rhythm of a running group changes).
 */
export const rhythmIntervals = (r: Rhythm, from?: Date): Interval[] => {
  const [hh, mm] = r.startTime.split(":").map(Number);
  const firstDay = Date.UTC(r.startDate.getUTCFullYear(), r.startDate.getUTCMonth(), r.startDate.getUTCDate());
  const lastDay = r.endDate
    ? Date.UTC(r.endDate.getUTCFullYear(), r.endDate.getUTCMonth(), r.endDate.getUTCDate())
    : firstDay + DEFAULT_RHYTHM_WEEKS * WEEK_MS - DAY_MS;
  const weekdays = RHYTHM_WEEKDAYS[r.days];
  const out: Interval[] = [];
  for (let day = firstDay; day <= lastDay; day += DAY_MS) {
    if (!weekdays.includes(new Date(day).getUTCDay())) continue;
    const startsAt = new Date(day + (hh * 60 + mm) * 60_000 - TASHKENT_OFFSET_MS);
    if (from && startsAt < from) continue;
    out.push({ startsAt, endsAt: new Date(startsAt.getTime() + r.lessonMinutes * 60_000) });
    if (out.length > MAX_OCCURRENCES) throw new Error(`Too many lessons (over ${MAX_OCCURRENCES}); choose an earlier end date`);
  }
  return out;
};
