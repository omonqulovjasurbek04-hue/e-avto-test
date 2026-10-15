import { apiGet, apiPut } from "./api";
import { env } from "../config/env";
import { storage } from "../utils/storage";
import type { Lesson } from "../types/lesson";
import { toLesson, type ApiLesson } from "./course.service";

async function completedIds(): Promise<Set<string>> {
  if (!storage.getToken()) return new Set();
  try {
    return new Set(await apiGet<string[]>("/progress/completed"));
  } catch {
    return new Set();
  }
}

export const lessonService = {
  async getLessons(): Promise<Lesson[]> {
    if (env.useMock) return (await import("../data/mockLessons")).mockLessons;
    const [lessons, done] = await Promise.all([apiGet<ApiLesson[]>("/lessons"), completedIds()]);
    return lessons.map((l) => ({ ...toLesson(l), completed: done.has(l.id) }));
  },

  async getLesson(id: string): Promise<Lesson | null> {
    if (env.useMock) return (await import("../data/mockLessons")).mockLessons.find((l) => l.id === id) ?? null;
    const [lesson, done] = await Promise.all([apiGet<ApiLesson>(`/lessons/${id}`), completedIds()]);
    return { ...toLesson(lesson), completed: done.has(id) };
  },

  /** Reports the watched share of a lesson video; the server only ever moves progress forward. */
  async updateProgress(id: string, percent: number): Promise<void> {
    if (env.useMock || !storage.getToken()) return;
    await apiPut<unknown>(`/progress/${id}`, { percent: Math.min(100, Math.max(0, Math.round(percent))) });
  },

  async getVideo(id: string): Promise<Lesson | null> {
    return this.getLesson(id);
  },
};
