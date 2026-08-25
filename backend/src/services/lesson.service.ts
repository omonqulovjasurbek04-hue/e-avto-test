import { prisma } from "../config/database";

export const getLesson = async (id: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      video: {
        select: {
          url: true,
          title: true,
          duration: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          text: true,
          options: true,
          explanation: true,
          order: true,
        },
      },
    },
  });

  if (!lesson) {
    const err: any = new Error("Lesson not found");
    err.status = 404;
    throw err;
  }

  return {
    id: lesson.id,
    courseId: lesson.courseId,
    title: lesson.title,
    description: lesson.description,
    thumbnail: lesson.thumbnail,
    duration: lesson.duration,
    order: lesson.order,
    videoUrl: lesson.videoUrl || lesson.video?.url || "",
    questions: lesson.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options as unknown as string[],
      explanation: q.explanation ?? undefined,
      order: q.order,
    })),
  };
};

export default { getLesson };
