import { z } from "zod";
import { httpUrl } from "./common";

/** A question a teacher writes into an exam ticket. */
export const ticketQuestionSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
    imageUrl: httpUrl.optional().nullable(),
    options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
    correctIndex: z.number().int().min(0),
    explanation: z.string().trim().max(5000).optional().nullable(),
    lessonId: z.string().uuid().optional().nullable(),
  })
  .refine((q) => q.correctIndex < q.options.length, { message: "correctIndex must point to an existing option", path: ["correctIndex"] });

export type TicketQuestionInput = z.infer<typeof ticketQuestionSchema>;
