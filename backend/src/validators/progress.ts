import { z } from "zod";

export const lessonProgressSchema = z.object({
  percent: z.number().int().min(0).max(100),
});

export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;
