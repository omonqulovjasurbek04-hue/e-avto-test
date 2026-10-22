export interface WatchState {
  watchedSeconds: number;
  requiredSeconds: number;
  durationSec: number;
  completed: boolean;
}

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
  /** Why it is closed: not bought, waits for the next attended class, or opens on a date (distance learning). */
  lockReason?: "purchase" | "attendance" | "schedule" | null;
  /** schedule: when the lesson opens (ISO date). */
  unlocksAt?: string | null;
  /** Id of a video stored in private storage; played through short-lived signed URLs. */
  privateVideoId?: string | null;
  /** Server-counted watching of the private video; the lesson completes only once it is really watched. */
  watch?: WatchState | null;
  /** The course's next lesson (for the "next lesson" button). */
  nextLesson?: { id: string; title: string; locked: boolean; unlocksAt: string | null } | null;
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
