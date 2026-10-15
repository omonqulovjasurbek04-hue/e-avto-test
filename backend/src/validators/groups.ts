import { z } from "zod";
import { httpsUrl } from "./common";

const id = z.string().uuid();

export const groupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  courseId: id,
  teacherId: id,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  capacity: z.number().int().min(1).max(200).default(20),
});
export const groupUpdateSchema = groupSchema.partial();

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
