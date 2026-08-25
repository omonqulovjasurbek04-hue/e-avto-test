import { prisma } from "../config/database";
import {
  CourseCreateInput,
  CourseUpdateInput,
  QuestionCreateInput,
  QuestionUpdateInput,
} from "../validators/course";

export const listCourses = async () => {
  return prisma.course.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnail: true,
      level: true,
      order: true,
      createdAt: true,
      _count: {
        select: { lessons: true },
      },
    },
  });
};

export const getCourse = async (id: string) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: {
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
        },
      },
    },
  });

  if (!course) {
    const err: any = new Error("Course not found");
    err.status = 404;
    throw err;
  }

  return course;
};

export const createCourse = async (input: CourseCreateInput) => {
  return prisma.course.create({
    data: {
      title: input.title,
      description: input.description,
      thumbnail: input.thumbnail,
      level: input.level,
      order: input.order,
    },
  });
};

export const updateCourse = async (id: string, input: CourseUpdateInput) => {
  await getCourse(id);
  return prisma.course.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
      ...(input.level !== undefined ? { level: input.level } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
    },
  });
};

export const deleteCourse = async (id: string) => {
  await getCourse(id);
  await prisma.course.delete({ where: { id } });
  return { success: true };
};

export const listQuestions = async () => {
  return prisma.question.findMany({
    orderBy: { order: "asc" },
  });
};

export const createQuestion = async (input: QuestionCreateInput) => {
  return prisma.question.create({
    data: {
      courseId: input.courseId,
      lessonId: input.lessonId,
      text: input.text,
      options: input.options as any,
      correctIndex: input.correctIndex,
      explanation: input.explanation,
      order: input.order,
    },
  });
};

export const updateQuestion = async (
  id: string,
  input: QuestionUpdateInput
) => {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    const err: any = new Error("Question not found");
    err.status = 404;
    throw err;
  }

  return prisma.question.update({
    where: { id },
    data: {
      ...(input.courseId !== undefined ? { courseId: input.courseId } : {}),
      ...(input.lessonId !== undefined ? { lessonId: input.lessonId } : {}),
      ...(input.text !== undefined ? { text: input.text } : {}),
      ...(input.options !== undefined
        ? { options: input.options as any }
        : {}),
      ...(input.correctIndex !== undefined
        ? { correctIndex: input.correctIndex }
        : {}),
      ...(input.explanation !== undefined
        ? { explanation: input.explanation }
        : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
    },
  });
};

export const deleteQuestion = async (id: string) => {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    const err: any = new Error("Question not found");
    err.status = 404;
    throw err;
  }
  await prisma.question.delete({ where: { id } });
  return { success: true };
};

export default {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
