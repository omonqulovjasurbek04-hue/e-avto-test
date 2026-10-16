import { Prisma } from "@prisma/client";
import { writeAudit } from "./audit.service";
import { canAccessCourse } from "./access.service";
import { prisma } from "../config/database";
import {
  CourseCreateInput,
  CourseUpdateInput,
  LessonCreateInput,
  LessonUpdateInput,
  QuestionCreateInput,
  QuestionUpdateInput,
  ListQuery,
} from "../validators/course";
import { badRequest, notFound, conflict } from "../utils/errors";
import { getPagination } from "../utils/pagination";
import { BASE_LANGUAGE, type Language } from "../lib/languages";
import { localize } from "./cms.service";

const courseSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  level: true,
  order: true,
  isPublished: true,
  categoryId: true,
  category: { select: { id: true, slug: true, name: true, translations: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { lessons: true } },
} satisfies Prisma.CourseSelect;

/**
 * Public catalogue shows only published courses; admins see everything.
 * `categoryId`: a category id, or null for "uncategorised"; undefined = all.
 */
export const listCourses = async (includeUnpublished = false, opts: { categoryId?: string | null; lang?: Language } = {}) => {
  const courses = await prisma.course.findMany({
    where: { ...(includeUnpublished ? {} : { isPublished: true }), ...(opts.categoryId !== undefined && { categoryId: opts.categoryId }) },
    orderBy: { order: "asc" },
    select: courseSelect,
  });
  return courses.map(({ _count, category, ...course }) => ({
    ...course,
    category: category ? localize(category, opts.lang ?? BASE_LANGUAGE) : null,
    lessonCount: _count.lessons,
  }));
};

/** Public calls pass the viewer: lessons of a course they cannot open come without video link (`locked`). */
export const getCourse = async (id: string, includeUnpublished = false, viewer?: { userId: string; role: string }) => {
  const course = await prisma.course.findFirst({
    where: includeUnpublished ? { id } : { id, isPublished: true },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      lessons: {
        where: includeUnpublished ? {} : { isPublished: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          courseId: true,
          title: true,
          description: true,
          thumbnail: true,
          videoUrl: true,
          duration: true,
          order: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });
  if (!course) throw notFound("Course not found");

  const locked = includeUnpublished ? false : !(await canAccessCourse(viewer, course.id));
  return {
    ...course,
    lessons: course.lessons.map(({ _count, videoUrl, ...lesson }) => ({
      ...lesson,
      videoUrl: locked ? "" : videoUrl,
      locked,
      questionCount: _count.questions,
    })),
  };
};

export const createCourse = (input: CourseCreateInput) => prisma.course.create({ data: input });

export const updateCourse = async (id: string, input: CourseUpdateInput) => {
  await getCourse(id, true);
  return prisma.course.update({ where: { id }, data: input });
};

export const deleteCourse = async (id: string) => {
  await getCourse(id, true);
  await prisma.course.delete({ where: { id } });
  return { deleted: true };
};

// ---- lessons (admin) ----

export const listAdminLessons = (courseId?: string) =>
  prisma.lesson.findMany({
    where: courseId ? { courseId } : {},
    orderBy: [{ courseId: "asc" }, { order: "asc" }],
  });

export const createLesson = (input: LessonCreateInput) => prisma.lesson.create({ data: input });

export const updateLesson = async (id: string, input: LessonUpdateInput) => {
  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) throw notFound("Lesson not found");
  return prisma.lesson.update({ where: { id }, data: input });
};

export const deleteLesson = async (id: string) => {
  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) throw notFound("Lesson not found");
  await prisma.lesson.delete({ where: { id } });
  return { deleted: true };
};

// ---- questions (admin) ----

export const listQuestions = async (query: ListQuery) => {
  const { page, limit, skip, take } = getPagination(query.page, query.limit);
  const where: Prisma.QuestionWhereInput = query.search
    ? { text: { contains: query.search, mode: "insensitive" } }
    : {};
  const [items, total] = await Promise.all([
    prisma.question.findMany({ where, orderBy: [{ createdAt: "desc" }], skip, take }),
    prisma.question.count({ where }),
  ]);
  return { items, page, limit, total };
};

export const createQuestion = async (input: QuestionCreateInput, actorId: string | null = null) => {
  const q = await prisma.question.create({ data: { ...input, options: input.options } });
  await writeAudit({ actorId, action: "question.create", entity: "Question", entityId: q.id, after: q });
  return q;
};

export const updateQuestion = async (id: string, input: QuestionUpdateInput, actorId: string | null = null) => {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) throw notFound("Question not found");

  const options = input.options ?? (existing.options as string[]);
  const correctIndex = input.correctIndex ?? existing.correctIndex;
  if (correctIndex >= options.length) throw badRequest("correctIndex must point to an existing option");
  // Attempts store the shuffled option order by position; a different number of options would mis-grade them.
  if (options.length !== (existing.options as string[]).length && (await prisma.userAnswer.count({ where: { questionId: id } })) > 0) {
    throw conflict("This question has already been answered in tests; create a new question instead of changing the number of options");
  }

  const updated = await prisma.question.update({ where: { id }, data: { ...input, options } });
  // Edit history: before/after of every change (answer key included, so wrong-key edits can be traced).
  await writeAudit({ actorId, action: "question.update", entity: "Question", entityId: id, before: existing, after: updated });
  return updated;
};

export const deleteQuestion = async (id: string, actorId: string | null = null) => {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) throw notFound("Question not found");
  await prisma.question.delete({ where: { id } });
  await writeAudit({ actorId, action: "question.delete", entity: "Question", entityId: id, before: existing });
  return { deleted: true };
};

export default {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listAdminLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
