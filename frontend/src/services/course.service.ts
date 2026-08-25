import { apiClient } from "./api";
import type { Course } from "../types/course";
import type { Lesson } from "../types/lesson";
import { mockCourses } from "../data/mockCourses";
import { mockLessons } from "../data/mockLessons";

export interface CourseFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  sort?: string;
}

export const courseService = {
  async getCourses(filters?: CourseFilters): Promise<Course[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Course[] }>(
        "/courses",
        { params: filters }
      );
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    let list = [...mockCourses];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    if (filters?.category && filters.category !== "all") {
      list = list.filter((c) => c.category === filters.category);
    }
    if (filters?.difficulty && filters.difficulty !== "all") {
      list = list.filter((c) => c.difficulty === filters.difficulty);
    }
    if (filters?.sort === "newest") {
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    } else if (filters?.sort === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  },

  async getCourse(id: string): Promise<Course | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Course }>(
        `/courses/${id}`
      );
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    return mockCourses.find((c) => c.id === id) ?? null;
  },

  async getLessons(courseId: string): Promise<Lesson[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Lesson[] }>(
        `/courses/${courseId}/lessons`
      );
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    return mockLessons.filter((l) => l.courseId === courseId);
  },
};
