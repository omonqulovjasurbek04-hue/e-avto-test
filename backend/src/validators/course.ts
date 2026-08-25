import { z } from "zod";

export const courseCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  thumbnail: z.string().url().optional().nullable(),
  level: z.string().max(100).optional(),
  order: z.number().int().optional(),
});

export const courseUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  thumbnail: z.string().url().optional().nullable(),
  level: z.string().max(100).optional(),
  order: z.number().int().optional(),
});

export const questionCreateSchema = z.object({
  courseId: z.string().uuid().optional().nullable(),
  lessonId: z.string().uuid().optional().nullable(),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

export const questionUpdateSchema = z.object({
  courseId: z.string().uuid().optional().nullable(),
  lessonId: z.string().uuid().optional().nullable(),
  text: z.string().min(1).optional(),
  options: z.array(z.string().min(1)).min(2).optional(),
  correctIndex: z.number().int().min(0).optional(),
  explanation: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;
export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;
export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;
