import { z } from "zod";
import { httpUrl } from "./common";

const optionalUrl = httpUrl.optional().nullable();

export const courseCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  thumbnail: optionalUrl,
  level: z.string().max(100).optional(),
  order: z.number().int().optional(),
  isPublished: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  studyPeriod: z.string().trim().max(40).nullable().optional(),
  section: z.enum(["MAIN", "COMBINED", "EXTRA"]).optional(),
  /** Main package price in so'm (whole number). null = no price. Stored as a new price row, history kept. */
  price: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
});

export const courseUpdateSchema = courseCreateSchema.partial();

export const lessonCreateSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  content: z.string().max(50000).optional().nullable(),
  // Only an external storage/CDN URL is stored; video files are never uploaded to this server.
  videoUrl: optionalUrl,
  thumbnail: optionalUrl,
  duration: z.number().int().min(0).optional(),
  order: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

export const lessonUpdateSchema = lessonCreateSchema.partial();

const questionBase = z.object({
  courseId: z.string().uuid().optional().nullable(),
  lessonId: z.string().uuid().optional().nullable(),
  text: z.string().trim().min(1).max(2000),
  imageUrl: optionalUrl,
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
  correctIndex: z.number().int().min(0),
  explanation: z.string().max(5000).optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  order: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

export const questionCreateSchema = questionBase.refine(
  (q) => q.correctIndex < q.options.length,
  { message: "correctIndex must point to an existing option", path: ["correctIndex"] }
);

export const questionUpdateSchema = questionBase.partial();

export const userRoleSchema = z.object({
  role: z.enum(["USER", "TEACHER", "MODERATOR", "FINANCE", "MANAGER", "ADMIN", "SUPERADMIN"]),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  // Only used by the user list (e.g. to pick teachers/students for a group).
  role: z.enum(["USER", "TEACHER", "MODERATOR", "FINANCE", "MANAGER", "ADMIN", "SUPERADMIN"]).optional(),
  // User list: "student" = bought a course (has a student number), "user" = only signed up.
  kind: z.enum(["student", "user"]).optional(),
});

export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>;
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;
export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;
export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
