import { z } from "zod";
import { prisma } from "../config/database";
import { badRequest, notFound } from "../utils/errors";
import { questionCreateSchema } from "../validators/course";
import { toPlainText } from "../lib/sanitize";
import { writeAudit } from "./audit.service";

export const testConfigSchema = z.object({
  questionCount: z.number().int().min(1).max(100),
  durationSeconds: z.number().int().min(60).max(4 * 3600).nullable().optional(),
  passScore: z.number().int().min(1).max(100),
  maxAttempts: z.number().int().min(1).max(100).nullable().optional(),
});

export const getConfig = async (courseId: string) => {
  if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw notFound("Course not found");
  return prisma.testConfig.findUnique({ where: { courseId } });
};

export const saveConfig = async (actorId: string, courseId: string, input: z.infer<typeof testConfigSchema>) => {
  if (!(await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw notFound("Course not found");
  const before = await prisma.testConfig.findUnique({ where: { courseId } });
  const data = { questionCount: input.questionCount, durationSeconds: input.durationSeconds ?? null, passScore: input.passScore, maxAttempts: input.maxAttempts ?? null };
  const config = await prisma.testConfig.upsert({ where: { courseId }, create: { courseId, ...data }, update: data });
  await writeAudit({ actorId, action: "testconfig.save", entity: "TestConfig", entityId: config.id, before, after: config });
  return config;
};

const MAX_IMPORT = 500;

/**
 * All-or-nothing import: every row is validated first; one bad row rejects the whole file and
 * reports the row numbers, so a half-imported question bank can never happen.
 */
export const importQuestions = async (actorId: string, rows: unknown[]) => {
  if (rows.length === 0) throw badRequest("No questions to import");
  if (rows.length > MAX_IMPORT) throw badRequest(`At most ${MAX_IMPORT} questions per import`);

  const errors: { row: number; message: string }[] = [];
  const valid: z.infer<typeof questionCreateSchema>[] = [];
  rows.forEach((r, i) => {
    const parsed = questionCreateSchema.safeParse(r);
    if (parsed.success) valid.push(parsed.data);
    else errors.push({ row: i + 1, message: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
  });
  if (errors.length > 0) throw Object.assign(badRequest("Import rejected: some rows are invalid"), { details: errors.slice(0, 50) });

  // Referenced course/lesson ids must exist.
  const courseIds = [...new Set(valid.map((q) => q.courseId).filter((x): x is string => Boolean(x)))];
  const lessonIds = [...new Set(valid.map((q) => q.lessonId).filter((x): x is string => Boolean(x)))];
  const [courses, lessons] = await Promise.all([
    prisma.course.count({ where: { id: { in: courseIds } } }),
    prisma.lesson.count({ where: { id: { in: lessonIds } } }),
  ]);
  if (courses !== courseIds.length || lessons !== lessonIds.length) throw badRequest("Unknown courseId or lessonId in the import");

  const created = await prisma.$transaction(async (tx) => {
    const res = await tx.question.createMany({
      data: valid.map((q) => ({
        ...q,
        text: toPlainText(q.text),
        explanation: q.explanation ? toPlainText(q.explanation) : null,
        options: q.options.map(toPlainText),
        // Imported questions start as drafts so nothing reaches students unreviewed.
        isPublished: q.isPublished ?? false,
      })),
    });
    await writeAudit({ actorId, action: "question.import", entity: "Question", after: { count: res.count } }, tx);
    return res.count;
  });
  return { imported: created };
};

export const exportQuestions = async (courseId?: string) => {
  const rows = await prisma.question.findMany({
    where: courseId ? { courseId } : {},
    orderBy: [{ courseId: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    select: { courseId: true, lessonId: true, text: true, imageUrl: true, options: true, correctIndex: true, explanation: true, difficulty: true, order: true, isPublished: true },
  });
  return rows;
};
