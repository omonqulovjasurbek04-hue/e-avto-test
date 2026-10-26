import { z } from "zod";

/** Exam tickets per course ("bilet 1..60"), each a fixed set of up to TICKET_SIZE questions. */
export const TICKET_COUNT = 60;
export const TICKET_SIZE = 50;

export const testStartSchema = z
  .object({
    courseId: z.string().uuid().optional().nullable(),
    lessonId: z.string().uuid().optional().nullable(),
    count: z.number().int().min(1).max(100).optional(),
    // EXAM follows the course rules; MISTAKES / SAVED are practice drawn from the student's own lists.
    mode: z.enum(["EXAM", "MISTAKES", "SAVED"]).optional(),
    ticket: z.number().int().min(1).max(TICKET_COUNT).optional(),
  })
  .refine((v) => v.ticket === undefined || (Boolean(v.courseId) && !v.lessonId && (v.mode ?? "EXAM") === "EXAM"), {
    message: "A ticket belongs to a course exam",
    path: ["ticket"],
  });

export const ticketListSchema = z.object({ courseId: z.string().uuid() });

export const testAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(7),
});

export const testFinishSchema = z.object({
  // Optional batch of answers collected on the client; validated and graded on the server.
  answers: z.array(testAnswerSchema).max(100).optional(),
});

export type TestStartInput = z.infer<typeof testStartSchema>;
export type TestAnswerInput = z.infer<typeof testAnswerSchema>;
export type TestFinishInput = z.infer<typeof testFinishSchema>;
