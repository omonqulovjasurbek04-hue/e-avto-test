import { z } from "zod";
import { httpsUrl } from "./common";

const id = z.string().uuid();

const groupFields = {
  name: z.string().trim().min(2).max(120),
  courseId: id,
  teacherId: id,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  capacity: z.number().int().min(1).max(200).default(20),
  // Weekly rhythm: toq kunlar (ODD: Mon/Wed/Fri) or juft kunlar (EVEN: Tue/Thu/Sat) at startTime (Tashkent).
  days: z.enum(["ODD", "EVEN"]).nullable().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM").nullable().optional(),
  lessonMinutes: z.number().int().min(30).max(240).nullable().optional(),
  room: z.string().trim().max(60).nullable().optional(),
};

/** Days and time come together: one without the other cannot produce a schedule. */
const rhythmComplete = (g: { days?: string | null; startTime?: string | null }) =>
  (g.days === undefined && g.startTime === undefined) || !g.days === !g.startTime;
const rhythmIssue = { message: "Choose both the days (toq/juft) and the start time", path: ["startTime"] };

export const groupSchema = z.object(groupFields).refine(rhythmComplete, rhythmIssue);
/** A teacher opens a group for themselves: the teacher is the caller, not a field. */
export const ownGroupSchema = z.object(groupFields).omit({ teacherId: true }).refine(rhythmComplete, rhythmIssue);
export const groupUpdateSchema = z.object(groupFields).partial().refine(rhythmComplete, rhythmIssue);
/** What a teacher may change on their own group (not the teacher, not the course). */
export const ownGroupUpdateSchema = z.object(groupFields).omit({ teacherId: true, courseId: true }).partial().refine(rhythmComplete, rhythmIssue);

export const memberSchema = z.object({ studentId: id });

export const slotSchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    room: z.string().trim().max(60).nullable().optional(),
    onlineUrl: httpsUrl.nullable().optional(),
    topic: z.string().trim().max(200).nullable().optional(),
    repeat: z.object({ everyWeeks: z.number().int().min(1).max(8), count: z.number().int().min(2).max(104) }).optional(),
  })
  .refine((s) => s.endsAt > s.startsAt, { message: "endsAt must be after startsAt", path: ["endsAt"] })
  .refine((s) => s.endsAt.getTime() - s.startsAt.getTime() <= 12 * 3_600_000, { message: "A lesson cannot exceed 12 hours", path: ["endsAt"] })
  .refine((s) => !s.onlineUrl || /^https:\/\//i.test(s.onlineUrl), { message: "Online link must use https", path: ["onlineUrl"] });

export const slotUpdateSchema = z.object({
  topic: z.string().trim().max(200).nullable().optional(),
  room: z.string().trim().max(60).nullable().optional(),
  onlineUrl: httpsUrl.nullable().optional(),
  status: z.enum(["PLANNED", "DONE", "CANCELLED"]).optional(),
});

export const attendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: id,
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "ONLINE"]),
        note: z.string().trim().max(300).nullable().optional(),
      })
    )
    .min(1)
    .max(200),
  // Required when changing an already-saved record.
  reason: z.string().trim().min(3).max(300).optional(),
});
