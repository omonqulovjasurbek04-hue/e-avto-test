import type { UserRole } from "./user";
import type { Question } from "./question";

export interface AdminStats {
  totalUsers: number;
  /** Accounts that bought a course. */
  totalStudents?: number;
  totalCourses: number;
  totalLessons: number;
  totalQuestions: number;
  totalTests: number;
  averageScore: number;
  passRate: number;
  /** Accounts per role (every role, 0 when nobody has it). */
  byRole?: Record<UserRole, number>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  /** null while the account is a teacher (the number was freed for a new sign-up). */
  userNumber: number | null;
  /** null = never had a course. */
  studentNumber: number | null;
  /** Set once the account was made a teacher; kept as history afterwards. */
  teacherNumber: number | null;
  /** Staff roles: admin0001, manager0001, … (null for students and teachers). */
  staffNumber: number | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  emailVerifiedAt?: string | null;
  totpEnabledAt?: string | null;
}

export interface UserIdentifierRow {
  id: string;
  kind: "USER" | "STUDENT" | "TEACHER" | "MODERATOR" | "FINANCE" | "MANAGER" | "ADMIN" | "SUPERADMIN";
  number: number;
  assignedAt: string;
  releasedAt: string | null;
  releaseReason: string | null;
}

export interface AdminEnrollment {
  id: string;
  status: string;
  startsAt: string;
  expiresAt: string | null;
  /** null = opened by an admin without payment. */
  orderId: string | null;
  course: { id: string; title: string };
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
  studyPeriod?: string | null;
  section?: "MAIN" | "COMBINED" | "EXTRA";
  /** Current price of the main package (minor units). */
  price?: { amount: number; currency: string; isSample: boolean } | null;
}

export interface AdminCourseInput {
  title: string;
  description: string;
  thumbnail?: string | null;
  level?: string;
  order?: number;
  isPublished?: boolean;
  categoryId?: string | null;
  studyPeriod?: string | null;
  section?: "MAIN" | "COMBINED" | "EXTRA";
  /** Main package price in whole so'm; null removes it; omitted = unchanged. */
  price?: number | null;
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
