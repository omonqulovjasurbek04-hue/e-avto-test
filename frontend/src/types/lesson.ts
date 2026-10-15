export interface Lesson {
  id: string;
  courseId: string;
  slug?: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  /** True when the course is not unlocked for this viewer (no video or text is delivered). */
  locked?: boolean;
  /** Id of a video stored in private storage; played through short-lived signed URLs. */
  privateVideoId?: string | null;
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
