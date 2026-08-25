import { create } from "zustand";
import type { Question } from "../types/question";
import type { TestResultDetail } from "../types/result";
import { testService } from "../services/test.service";
import { resultService } from "../services/result.service";
import { DEFAULT_TEST_DURATION, DEFAULT_QUESTION_COUNT } from "../constants/config";

interface TestState {
  id: string | null;
  courseId?: string;
  topicId?: string;
  questions: Question[];
  answers: Record<string, number>;
  currentIndex: number;
  marked: string[];
  timeLeft: number;
  duration: number;
  status: "idle" | "active" | "finished";
  result: TestResultDetail | null;
  start: (
    courseId?: string,
    count?: number,
    duration?: number,
    topicId?: string
  ) => Promise<void>;
  setAnswer: (qid: string, idx: number) => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  toggleMark: (qid: string) => void;
  tick: () => void;
  finish: () => Promise<TestResultDetail | null>;
  reset: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  id: null,
  courseId: undefined,
  topicId: undefined,
  questions: [],
  answers: {},
  currentIndex: 0,
  marked: [],
  timeLeft: 0,
  duration: 0,
  status: "idle",
  result: null,

  start: async (courseId, count, duration, topicId) => {
    const qCount = count ?? DEFAULT_QUESTION_COUNT;
    const dur = duration ?? (qCount === 20 ? 20 * 60 : DEFAULT_TEST_DURATION);
    const res = await testService.start(courseId, qCount, topicId);

    set({
      id: res.test.id,
      courseId,
      topicId,
      questions: res.questions,
      answers: {},
      currentIndex: 0,
      marked: [],
      timeLeft: dur,
      duration: dur,
      status: "active",
      result: null,
    });
  },

  setAnswer: (qid, idx) =>
    set((s) => ({ answers: { ...s.answers, [qid]: idx } })),

  next: () =>
    set((s) => ({
      currentIndex: Math.min(s.currentIndex + 1, s.questions.length - 1),
    })),

  prev: () =>
    set((s) => ({ currentIndex: Math.max(s.currentIndex - 1, 0) })),

  goTo: (i) =>
    set((s) => ({
      currentIndex: Math.max(0, Math.min(i, s.questions.length - 1)),
    })),

  toggleMark: (qid) =>
    set((s) => ({
      marked: s.marked.includes(qid)
        ? s.marked.filter((x) => x !== qid)
        : [...s.marked, qid],
    })),

  tick: () =>
    set((s) => {
      if (s.status !== "active") return s;
      if (s.timeLeft <= 1) return { ...s, timeLeft: 0 };
      return { ...s, timeLeft: s.timeLeft - 1 };
    }),

  finish: async () => {
    const { id, questions, answers, duration, timeLeft, courseId } = get();
    if (!id) return null;
    const timeSpent = Math.max(0, duration - timeLeft);
    const detail = testService.computeResult(
      id,
      questions,
      answers,
      timeSpent,
      courseId
    );
    await resultService.saveResult(detail);
    set({ result: detail, status: "finished" });
    return detail;
  },

  reset: () =>
    set({
      id: null,
      courseId: undefined,
      topicId: undefined,
      questions: [],
      answers: {},
      currentIndex: 0,
      marked: [],
      timeLeft: 0,
      duration: 0,
      status: "idle",
      result: null,
    }),
}));
