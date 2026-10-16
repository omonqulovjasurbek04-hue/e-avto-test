import type { UserRole } from "./user";
import type { Question } from "./question";

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalQuestions: number;
  totalTests: number;
  averageScore: number;
  passRate: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  emailVerifiedAt?: string | null;
  totpEnabledAt?: string | null;
}

export interface AdminCourse {
  id: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  level: string;
  order: number;
  isPublished: boolean;
  lessonCount: number;
  categoryId?: string | null;
  category?: { id: string; slug: string; name: string } | null;
}

export interface AdminCourseInput {
  title: string;
  description: string;
  thumbnail?: string | null;
  level?: string;
  order?: number;
  isPublished?: boolean;
  categoryId?: string | null;
}

export interface AdminLesson {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  duration: number;
  order: number;
  isPublished: boolean;
}

export interface AdminLessonInput {
  courseId: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  /** Seconds. */
  duration?: number;
  order?: number;
  isPublished?: boolean;
}

export interface AdminQuestion extends Question {
  courseId?: string | null;
}

export interface AdminQuestionInput {
  courseId?: string | null;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
