import { apiClient } from "./api";
import type { Lesson } from "../types/lesson";
import { mockLessons } from "../data/mockLessons";

export const lessonService = {
  async getLessons(): Promise<Lesson[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Lesson[] }>(
        "/lessons"
      );
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    return mockLessons;
  },

  async getLesson(id: string): Promise<Lesson | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Lesson }>(
        `/lessons/${id}`
      );
      if (response.data?.data) return response.data.data;
    } catch {
      // mock fallback
    }
    return mockLessons.find((l) => l.id === id) ?? null;
  },

  async getVideo(id: string): Promise<Lesson | null> {
    return this.getLesson(id);
  },
};
