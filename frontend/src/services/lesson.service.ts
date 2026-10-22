import { apiGet, apiPost, apiPut } from "./api";
import { env } from "../config/env";
import { getAccessToken } from "./session";
import type { Lesson, WatchState } from "../types/lesson";
import { toLesson, type ApiLesson } from "./course.service";

async function completedIds(): Promise<Set<string>> {
  if (!getAccessToken()) return new Set();
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
    if (env.useMock || !getAccessToken()) return;
    await apiPut<unknown>(`/progress/${id}`, { percent: Math.min(100, Math.max(0, Math.round(percent))) });
  },

  /**
   * Player heartbeat for a lesson video: seconds played since the last one (seeking excluded) and the
   * position. The server decides whether the video now counts as watched and returns the new state.
   */
  async recordWatch(id: string, seconds: number, position: number): Promise<WatchState | null> {
    if (env.useMock || !getAccessToken()) return null;
    return apiPost<WatchState>(`/progress/${id}/watch`, { seconds: Math.round(seconds * 10) / 10, position: Math.round(position * 10) / 10 });
  },

  async getVideo(id: string): Promise<Lesson | null> {
    return this.getLesson(id);
  },
};
