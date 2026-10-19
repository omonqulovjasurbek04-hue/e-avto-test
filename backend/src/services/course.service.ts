import { Prisma } from "@prisma/client";
import { writeAudit } from "./audit.service";
import { lessonStates } from "./access.service";
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
import { currentPrice } from "./catalog.service";

const courseSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  level: true,
  order: true,
  isPublished: true,
  categoryId: true,
  studyPeriod: true,
  section: true,
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
  // Total length of the published lessons (seconds), so the catalogue can show how long a course takes.
  const sums = await prisma.lesson.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courses.map((c) => c.id) }, ...(includeUnpublished ? {} : { isPublished: true }) },
    _sum: { duration: true },
  });
  const durationOf = new Map(sums.map((s) => [s.courseId, s._sum.duration ?? 0]));
  // "From" price: the cheapest current price among the course's active packages (null = no price set).
  const packages = await prisma.coursePackage.findMany({
    where: { courseId: { in: courses.map((c) => c.id) }, isActive: true, archivedAt: null },
    select: { courseId: true, prices: true },
  });
  const priceOf = new Map<string, { amount: number; currency: string; isSample: boolean }>();
  for (const p of packages) {
    const price = currentPrice(p.prices);
    if (!price) continue;
    const prev = priceOf.get(p.courseId);
    if (!prev || price.amount < prev.amount) priceOf.set(p.courseId, { amount: price.amount, currency: price.currency, isSample: price.isSample });
  }
  return courses.map(({ _count, category, ...course }) => ({
    ...course,
    category: category ? localize(category, opts.lang ?? BASE_LANGUAGE) : null,
    lessonCount: _count.lessons,
    totalDuration: durationOf.get(course.id) ?? 0,
    price: priceOf.get(course.id) ?? null,
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

  const states = includeUnpublished ? null : await lessonStates(viewer, [course.id]);
  return {
    ...course,
    lessons: course.lessons.map(({ _count, videoUrl, ...lesson }) => {
      const state = states?.get(lesson.id) ?? { locked: !includeUnpublished, reason: includeUnpublished ? null : "purchase", unlocksAt: null };
      return {
        ...lesson,
        videoUrl: state.locked ? "" : videoUrl,
        locked: state.locked,
        lockReason: state.reason,
        unlocksAt: state.unlocksAt,
        questionCount: _count.questions,
      };
    }),
  };
};

/**
 * Price edited together with the course: it is the price of the course's main package (lowest order),
 * which is created as "Standart" when missing. A change closes the old price and adds a new one, so
 * orders keep their history; the admin-entered price is real (isSample=false). null closes the price.
 */
const setCoursePrice = async (courseId: string, priceSom: number | null, actorId: string | null) => {
  let pkg = await prisma.coursePackage.findFirst({ where: { courseId, archivedAt: null }, orderBy: [{ isActive: "desc" }, { order: "asc" }], include: { prices: true } });
  if (!pkg && priceSom === null) return;
  if (!pkg) pkg = await prisma.coursePackage.create({ data: { courseId, name: "Standart" }, include: { prices: true } });
  const amount = priceSom === null ? null : priceSom * 100;
  const open = pkg.prices.filter((p) => p.isActive && !p.validTo);
  if (open.length === 1 && open[0].amount === amount && !open[0].isSample) return;
  // One instant from this process's clock: the old price ends exactly where the new one starts, and the
  // new one is valid immediately (the DB engine's own "now" can run a little ahead of Node's).
  const at = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.price.updateMany({ where: { id: { in: open.map((p) => p.id) } }, data: { isActive: false, validTo: at } });
    if (amount !== null) await tx.price.create({ data: { packageId: pkg.id, amount, currency: "UZS", isSample: false, validFrom: at } });
    await writeAudit({ actorId, action: "price.set", entity: "CoursePackage", entityId: pkg.id, before: { amounts: open.map((p) => p.amount) }, after: { amount } }, tx);
  });
};

export const createCourse = async ({ price, ...input }: CourseCreateInput, actorId: string | null = null) => {
  const course = await prisma.course.create({ data: input });
  if (price !== undefined) await setCoursePrice(course.id, price, actorId);
  return course;
};

export const updateCourse = async (id: string, { price, ...input }: CourseUpdateInput, actorId: string | null = null) => {
  await getCourse(id, true);
  const course = await prisma.course.update({ where: { id }, data: input });
  if (price !== undefined) await setCoursePrice(id, price, actorId);
  return course;
};

export const deleteCourse = async (id: string) => {
  await getCourse(id, true);
  // Questions survive the delete (courseId/lessonId become NULL, so past results keep them), but a course-less
  // question is open to everyone in mixed tests. Unpublish them first so paid content does not leak into the free pool.
  await prisma.$transaction([
    prisma.question.updateMany({
      where: { OR: [{ courseId: id }, { lesson: { courseId: id } }] },
      data: { isPublished: false },
    }),
    prisma.course.delete({ where: { id } }),
  ]);
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
