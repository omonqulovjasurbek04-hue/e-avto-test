import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TestQuestion } from "../types/question";
import type { TestResultDetail } from "../types/result";
import { testService } from "../services/test.service";
import { DEFAULT_QUESTION_COUNT } from "../constants/config";

interface TestState {
  id: string | null;
  courseId?: string;
  questions: TestQuestion[];
  answers: Record<string, number>;
  currentIndex: number;
  marked: string[];
  timeLeft: number;
  duration: number;
  /** Local clock reference; the server enforces the real deadline. */
  startedAtMs: number;
  status: "idle" | "active" | "finished";
  finishing: boolean;
  result: TestResultDetail | null;
  start: (courseId?: string, count?: number, topicId?: string) => Promise<string>;
  setAnswer: (qid: string, idx: number) => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  toggleMark: (qid: string) => void;
  tick: () => void;
  finish: () => Promise<TestResultDetail | null>;
  reset: () => void;
}

const initial = {
  id: null,
  courseId: undefined,
  questions: [],
  answers: {},
  currentIndex: 0,
  marked: [],
  timeLeft: 0,
  duration: 0,
  startedAtMs: 0,
  status: "idle" as const,
  finishing: false,
  result: null,
};

const lastWritten = new Map<string, string>();
const dedupedSessionStorage = {
  getItem: (key: string) => sessionStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (lastWritten.get(key) === value) return;
    lastWritten.set(key, value);
    sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    lastWritten.delete(key);
    sessionStorage.removeItem(key);
  },
};

export const useTestStore = create<TestState>()(
  persist(
    (set, get) => ({
      ...initial,

      start: async (courseId, count = DEFAULT_QUESTION_COUNT, topicId) => {
        const res = await testService.start({ courseId, count, topicId });
        const duration = res.test.duration ?? 45 * 60;
        set({
          ...initial,
          id: res.test.id,
          courseId,
          questions: res.questions,
          timeLeft: duration,
          duration,
          startedAtMs: Date.now(),
          status: "active",
        });
        return res.test.id;
      },

      setAnswer: (qid, idx) => {
        set((s) => ({ answers: { ...s.answers, [qid]: idx } }));
        // Survives a closed tab; /finish still sends every answer again.
        const id = get().id;
        if (id) testService.saveAnswer(id, qid, idx);
      },

      next: () => set((s) => ({ currentIndex: Math.min(s.currentIndex + 1, s.questions.length - 1) })),

      prev: () => set((s) => ({ currentIndex: Math.max(s.currentIndex - 1, 0) })),

      goTo: (i) =>
        set((s) => ({ currentIndex: Math.max(0, Math.min(i, s.questions.length - 1)) })),

      toggleMark: (qid) =>
        set((s) => ({
          marked: s.marked.includes(qid) ? s.marked.filter((x) => x !== qid) : [...s.marked, qid],
        })),

      // Derived from the wall clock so throttled background tabs and page reloads stay accurate.
      tick: () =>
        set((s) => {
          if (s.status !== "active") return s;
          const elapsed = Math.floor((Date.now() - s.startedAtMs) / 1000);
          return { timeLeft: Math.max(0, s.duration - elapsed) };
        }),

      finish: async () => {
        const { id, answers, duration, startedAtMs, finishing, status } = get();
        if (!id || finishing || status === "finished") return get().result;

        set({ finishing: true });
        try {
          const timeSpent = Math.min(duration, Math.floor((Date.now() - startedAtMs) / 1000));
          const result = await testService.finish(id, answers, timeSpent);
          set({ result, status: "finished", finishing: false });
          return result;
        } catch (e) {
          set({ finishing: false });
          throw e;
        }
      },

      reset: () => set({ ...initial }),
    }),
    {
      name: "ea_active_test",
      // tick() runs every second but only changes timeLeft (not persisted): skip identical writes.
      storage: createJSONStorage(() => dedupedSessionStorage),
      // Keep an unfinished attempt across reloads; the server still owns grading and the deadline.
      partialize: (s) => ({
        id: s.id,
        courseId: s.courseId,
        questions: s.questions,
        answers: s.answers,
        currentIndex: s.currentIndex,
        marked: s.marked,
        duration: s.duration,
        startedAtMs: s.startedAtMs,
        status: s.status === "active" ? s.status : "idle",
      }),
      onRehydrateStorage: () => (state) => {
        state?.tick();
      },
    }
  )
);
