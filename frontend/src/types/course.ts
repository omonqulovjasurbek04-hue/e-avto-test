export type Difficulty = "beginner" | "intermediate" | "advanced" | "EASY" | "MEDIUM" | "HARD";

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: "B" | "A" | "C" | "D" | "YHQ_GENERAL" | string;
  difficulty?: Difficulty;
  imageUrl?: string;
  totalLessons: number;
  lessonsCount?: number;
  totalDurationMinutes: number;
  durationHours?: number;
  progress?: number;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  lessons?: LessonSummary[];
}

export interface LessonSummary {
  id: string;
  title: string;
  slug: string;
  order: number;
  durationMinutes: number;
  hasVideo: boolean;
  questionCount: number;
  isCompleted?: boolean;
}

export interface CreateCoursePayload {
  title: string;
  slug?: string;
  description: string;
  category: string;
  difficulty?: Difficulty;
  imageUrl?: string;
  isPublished?: boolean;
  order?: number;
}
