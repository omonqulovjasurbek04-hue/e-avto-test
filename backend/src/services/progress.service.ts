import { prisma } from "../config/database";
import { LessonProgressInput } from "../validators/progress";

const notFound = (message: string) => {
  const err: Error & { status?: number } = new Error(message);
  err.status = 404;
  return err;
};

export const updateLessonProgress = async (
  userId: string,
  lessonId: string,
  input: LessonProgressInput
) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  });
  if (!lesson) throw notFound("Lesson not found");

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { percent: true, completed: true },
  });
  const percent = Math.max(existing?.percent ?? 0, input.percent);
  const completed = existing?.completed || percent >= 100;
  const lessonProgress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, percent, completed },
    update: { percent, completed },
  });

  const [completedLessons, totalLessons] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId, completed: true, lesson: { courseId: lesson.courseId } } }),
    prisma.lesson.count({ where: { courseId: lesson.courseId } }),
  ]);
  const coursePercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  await prisma.progress.upsert({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
    create: { userId, courseId: lesson.courseId, completedLessons, percent: coursePercent },
    update: { completedLessons, percent: coursePercent },
  });

  return lessonProgress;
};

export const getLessonProgress = async (userId: string, lessonId: string) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) throw notFound("Lesson not found");
  return prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
};

export const getProgress = async (userId: string) => {
  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      _count: { select: { lessons: true } },
      progress: { where: { userId }, select: { completedLessons: true, percent: true, updatedAt: true } },
    },
  });
  return courses.map((course) => ({
    courseId: course.id,
    course: course.title,
    totalLessons: course._count.lessons,
    completedLessons: course.progress[0]?.completedLessons ?? 0,
    pct: course.progress[0]?.percent ?? 0,
    updatedAt: course.progress[0]?.updatedAt ?? null,
  }));
};
