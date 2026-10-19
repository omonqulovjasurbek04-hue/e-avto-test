import { prisma } from "../config/database";
import { LessonProgressInput } from "../validators/progress";
import { forbidden, notFound } from "../utils/errors";
import { canAccessLesson } from "./access.service";

export const updateLessonProgress = async (
  userId: string,
  lessonId: string,
  input: LessonProgressInput,
  role = "USER"
) => {
  // Only lessons the user can actually see and open count towards progress and the leaderboard.
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, isPublished: true, course: { isPublished: true } },
    select: { id: true, courseId: true },
  });
  if (!lesson) throw notFound("Lesson not found");
  if (!(await canAccessLesson({ userId, role }, lesson))) throw forbidden("This lesson is not open for you yet");

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { percent: true, completed: true },
  });
  // Progress only moves forward.
  const percent = Math.max(existing?.percent ?? 0, input.percent);
  const completed = existing?.completed || percent >= 100;
  const lessonProgress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, percent, completed },
    update: { percent, completed },
  });

  const [completedLessons, totalLessons] = await Promise.all([
    prisma.lessonProgress.count({
      where: { userId, completed: true, lesson: { courseId: lesson.courseId, isPublished: true } },
    }),
    prisma.lesson.count({ where: { courseId: lesson.courseId, isPublished: true } }),
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
  return prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
};

export const listCompletedLessonIds = async (userId: string): Promise<string[]> => {
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, completed: true },
    select: { lessonId: true },
  });
  return rows.map((r) => r.lessonId);
};

export const getProgress = async (userId: string) => {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
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
