export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
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
