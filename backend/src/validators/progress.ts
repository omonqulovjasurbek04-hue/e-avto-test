import { z } from "zod";

export const lessonProgressSchema = z.object({
  percent: z.number().int().min(0).max(100),
});

export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;

/** A player heartbeat: video seconds played since the previous beat (seeking excluded) and the current position. */
export const videoWatchSchema = z.object({
  seconds: z.number().min(0).max(120),
  position: z.number().min(0).max(24 * 3600),
});
