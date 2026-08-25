import { apiClient } from "./api";
import { Lesson } from "../types/lesson";
import { mockLessons } from "../data/mockLessons";

export const lessonService = {
  async getLessons(): Promise<Lesson[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Lesson[] }>("/lessons");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return mockLessons;
  },

  async getLessonById(id: string): Promise<Lesson | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Lesson }>(`/lessons/${id}`);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    const found = mockLessons.find((l) => l.id === id || l.slug === id);
    return found || null;
  },

  async markLessonCompleted(lessonId: string): Promise<boolean> {
    try {
      await apiClient.post(`/lessons/${lessonId}/complete`);
      return true;
    } catch {
      return true;
    }
  },
};
