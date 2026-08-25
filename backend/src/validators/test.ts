import { z } from "zod";

export const testStartSchema = z.object({
  courseId: z.string().uuid().optional().nullable(),
  count: z.number().int().min(1).max(100).optional(),
});

export const testAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0),
});

export const testFinishSchema = z.object({
  timeSpent: z.number().int().min(0).optional(),
});

export type TestStartInput = z.infer<typeof testStartSchema>;
export type TestAnswerInput = z.infer<typeof testAnswerSchema>;
export type TestFinishInput = z.infer<typeof testFinishSchema>;
