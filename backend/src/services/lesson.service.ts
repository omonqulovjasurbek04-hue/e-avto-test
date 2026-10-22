import { prisma } from "../config/database";
import { notFound } from "../utils/errors";
import { accessibleCourseIds, lessonState, lessonStates } from "./access.service";
import { watchState } from "./progress.service";

export type Viewer = { userId: string; role: string } | undefined;

export const listLessons = async (viewer?: Viewer) => {
  const allowed = await accessibleCourseIds(viewer);
  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true, course: { isPublished: true } },
    orderBy: [{ course: { order: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      courseId: true,
      title: true,
      description: true,
      thumbnail: true,
      videoUrl: true,
      duration: true,
      order: true,
      course: { select: { title: true } },
      _count: { select: { questions: true } },
    },
  });
  // Bought courses open lesson by lesson (attendance or the 2-lessons-per-3-days schedule).
  const states = allowed === "all" && !viewer ? new Map() : await lessonStates(viewer, [...new Set(lessons.map((l) => l.courseId))]);
  return lessons.map(({ course, _count, ...lesson }) => {
    const state = states.get(lesson.id) ?? (allowed === "all" ? { locked: false, reason: null, unlocksAt: null } : { locked: true, reason: "purchase", unlocksAt: null });
    const locked = state.locked;
    return {
    ...lesson,
    // Locked lessons expose metadata only; the video URL is withheld.
    videoUrl: locked ? "" : lesson.videoUrl,
    locked,
    lockReason: state.reason,
    unlocksAt: state.unlocksAt,
    category: course.title,
    questionCount: _count.questions,
    };
  });
};

export const getLesson = async (id: string, viewer?: Viewer) => {
  const lesson = await prisma.lesson.findFirst({
    where: { id, isPublished: true, course: { isPublished: true } },
    include: {
      video: { select: { url: true, title: true, duration: true } },
      course: { select: { title: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!lesson) throw notFound("Lesson not found");

  const state = await lessonState(viewer, lesson);
  const locked = state.locked;
  // A video uploaded to private storage is streamed through the signed-URL endpoints, never exposed as a link here.
  const privateVideo = locked ? null : await prisma.videoAsset.findFirst({ where: { lessonId: lesson.id, isArchived: false }, orderBy: { createdAt: "desc" }, select: { id: true } });

  // The next lesson of the course (by order), so the page can offer "next lesson" once this one is done.
  const next = await prisma.lesson.findFirst({
    where: { courseId: lesson.courseId, isPublished: true, OR: [{ order: { gt: lesson.order } }, { order: lesson.order, id: { gt: lesson.id } }] },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, title: true, order: true, courseId: true },
  });
  const nextState = next ? await lessonState(viewer, next) : null;

  // Questions (and their explanations) are only delivered through the test flow.
  return {
    id: lesson.id,
    courseId: lesson.courseId,
    title: lesson.title,
    description: lesson.description,
    content: locked ? null : lesson.content,
    locked,
    lockReason: state.reason,
    unlocksAt: state.unlocksAt,
    privateVideoId: privateVideo?.id ?? null,
    // Server-counted watching of the private video: the lesson completes only after it is really watched.
    watch: privateVideo && viewer ? await watchState(viewer.userId, lesson.id) : null,
    nextLesson: next ? { id: next.id, title: next.title, locked: nextState?.locked ?? true, unlocksAt: nextState?.unlocksAt ?? null } : null,
    thumbnail: lesson.thumbnail,
    duration: lesson.duration,
    order: lesson.order,
    videoUrl: locked ? "" : lesson.videoUrl || lesson.video?.url || "",
    category: lesson.course.title,
    questionCount: lesson._count.questions,
  };
};

export default { listLessons, getLesson };
