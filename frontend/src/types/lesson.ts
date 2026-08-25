export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description?: string;
  content: string;
  videoUrl?: string;
  durationMinutes: number;
  duration?: number;
  completed?: boolean;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
    slug: string;
  };
  attachments?: {
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
  }[];
  questionCount?: number;
  userProgress?: {
    isCompleted: boolean;
    watchedSeconds: number;
    lastAccessedAt: string;
  };
}

export interface CreateLessonPayload {
  courseId: string;
  title: string;
  slug?: string;
  description?: string;
  content: string;
  videoUrl?: string;
  durationMinutes?: number;
  order?: number;
  isPublished?: boolean;
}
