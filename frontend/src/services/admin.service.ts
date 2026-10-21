import { apiGet, apiGetPage, apiPost, apiPut, apiPatch, apiDelete } from "./api";
import type { UserRole } from "../types/user";
import type {
  AdminStats,
  AdminUser,
  AdminCourse,
  AdminCourseInput,
  AdminLesson,
  AdminLessonInput,
  AdminQuestion,
  AdminQuestionInput,
  PageMeta,
} from "../types/admin";

interface Page<T> {
  items: T[];
  pagination: PageMeta;
}

// Admin screens always talk to the real API; authorization is enforced by the server.
export const adminService = {
  getStatistics: () => apiGet<AdminStats>("/admin/statistics"),

  listUsers: (params: { page?: number; search?: string; role?: string; kind?: "student" | "user"; limit?: number }): Promise<Page<AdminUser>> =>
    apiGetPage<AdminUser>("/admin/users", { limit: 10, ...params }),
  setUserActive: (id: string, isActive: boolean) =>
    apiPatch<{ id: string; isActive: boolean }>(`/admin/users/${id}/status`, { isActive }),
  setUserRole: (id: string, role: UserRole) => apiPatch<AdminUser>(`/admin/users/${id}/role`, { role }),
  /** Superadmin only: removes 2FA from an account that lost its authenticator and recovery codes. */
  resetUserTwoFactor: (id: string) => apiDelete<{ id: string; twoFactorEnabled: boolean }>(`/admin/users/${id}/two-factor`),

  listCourses: () => apiGet<AdminCourse[]>("/admin/courses"),
  createCourse: (input: AdminCourseInput) => apiPost<AdminCourse>("/admin/courses", input),
  updateCourse: (id: string, input: Partial<AdminCourseInput>) => apiPut<AdminCourse>(`/admin/courses/${id}`, input),
  deleteCourse: (id: string) => apiDelete<{ deleted: boolean }>(`/admin/courses/${id}`),

  listLessons: (courseId?: string) => apiGet<AdminLesson[]>("/admin/lessons", courseId ? { courseId } : undefined),
  createLesson: (input: AdminLessonInput) => apiPost<AdminLesson>("/admin/lessons", input),
  updateLesson: (id: string, input: Partial<AdminLessonInput>) => apiPut<AdminLesson>(`/admin/lessons/${id}`, input),
  deleteLesson: (id: string) => apiDelete<{ deleted: boolean }>(`/admin/lessons/${id}`),

  listQuestions: (params: { page?: number; search?: string }): Promise<Page<AdminQuestion>> =>
    apiGetPage<AdminQuestion>("/admin/questions", { ...params, limit: 10 }),
  createQuestion: (input: AdminQuestionInput) => apiPost<AdminQuestion>("/admin/questions", input),
  updateQuestion: (id: string, input: Partial<AdminQuestionInput>) =>
    apiPut<AdminQuestion>(`/admin/questions/${id}`, input),
  deleteQuestion: (id: string) => apiDelete<{ deleted: boolean }>(`/admin/questions/${id}`),
};
