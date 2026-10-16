export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Course {
  id: string;
  title: string;
  description: string;
  /** Category name in the visitor's language; empty when the course has no category. */
  category: string;
  categorySlug?: string;
  difficulty?: Difficulty;
  thumbnail?: string;
  imageUrl?: string;
  lessonsCount?: number;
  durationHours?: number;
  progress?: number;
  createdAt?: string;
  slug?: string;
  totalLessons?: number;
  totalDurationMinutes?: number;
  isPublished?: boolean;
  order?: number;
  updatedAt?: string;
}
