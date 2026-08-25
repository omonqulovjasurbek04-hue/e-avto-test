import { create } from "zustand";
import { ActiveTestSession } from "../types/test";

interface TestState {
  session: ActiveTestSession | null;
  remainingSeconds: number;
  isTimerRunning: boolean;
  isSubmitting: boolean;

  startSession: (session: ActiveTestSession) => void;
  selectOption: (questionId: string, optionId: string) => void;
  toggleFlag: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  decrementTimer: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
  resetSession: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  session: null,
  remainingSeconds: 0,
  isTimerRunning: false,
  isSubmitting: false,

  startSession: (session) => {
    set({
      session,
      remainingSeconds: session.timeLimitSeconds,
      isTimerRunning: true,
      isSubmitting: false,
    });
  },

  selectOption: (questionId, optionId) => {
    const { session } = get();
    if (!session) return;

    set({
      session: {
        ...session,
        userAnswers: {
          ...session.userAnswers,
          [questionId]: optionId,
        },
      },
    });
  },

  toggleFlag: (questionId) => {
    const { session } = get();
    if (!session) return;

    const currentFlag = !!session.markedForReview[questionId];
    set({
      session: {
        ...session,
        markedForReview: {
          ...session.markedForReview,
          [questionId]: !currentFlag,
        },
      },
    });
  },

  goToQuestion: (index) => {
    const { session } = get();
    if (!session) return;
    if (index >= 0 && index < session.questions.length) {
      set({
        session: {
          ...session,
          currentQuestionIndex: index,
        },
      });
    }
  },

  nextQuestion: () => {
    const { session } = get();
    if (!session) return;
    const nextIndex = session.currentQuestionIndex + 1;
    if (nextIndex < session.questions.length) {
      set({
        session: {
          ...session,
          currentQuestionIndex: nextIndex,
        },
      });
    }
  },

  prevQuestion: () => {
    const { session } = get();
    if (!session) return;
    const prevIndex = session.currentQuestionIndex - 1;
    if (prevIndex >= 0) {
      set({
        session: {
          ...session,
          currentQuestionIndex: prevIndex,
        },
      });
    }
  },

  decrementTimer: () => {
    const { remainingSeconds, isTimerRunning } = get();
    if (!isTimerRunning) return;
    if (remainingSeconds <= 1) {
      set({ remainingSeconds: 0, isTimerRunning: false });
    } else {
      set({ remainingSeconds: remainingSeconds - 1 });
    }
  },

  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  resetSession: () => {
    set({
      session: null,
      remainingSeconds: 0,
      isTimerRunning: false,
      isSubmitting: false,
    });
  },
}));
