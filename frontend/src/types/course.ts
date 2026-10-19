export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Catalogue block: single licence categories, combined/trailer categories, extra courses. */
export type CourseSection = "MAIN" | "COMBINED" | "EXTRA";

export interface Course {
  id: string;
  title: string;
  description: string;
  /** Category name in the visitor's language; empty when the course has no category. */
  category: string;
  categorySlug?: string;
  /** Learning period as entered by the admin, e.g. "2–2,5 oy". */
  studyPeriod?: string;
  section?: CourseSection;
  /** "From" price in minor units (tiyin); null = not set. */
  price?: { amount: number; currency: string; isSample: boolean } | null;
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
