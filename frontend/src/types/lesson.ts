export interface Lesson {
  id: string;
  courseId: string;
  slug?: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  thumbnail?: string;
  duration?: number;
  durationMinutes?: number;
  order: number;
  completed?: boolean;
  objectives?: string[];
  category?: string;
  questionCount?: number;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  course?: {
    id: string;
    title: string;
    slug?: string;
  };
  attachments?: {
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
  }[];
}
