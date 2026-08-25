import { useEffect } from "react";
import { useTestStore } from "../store/test.store";
import type { Question } from "../types/question";
import type { TestResultDetail } from "../types/result";

export function useTest() {
  const store = useTestStore();
  const currentQuestion: Question | null =
    store.questions.length > 0 ? store.questions[store.currentIndex] : null;

  const answeredCount = Object.keys(store.answers).length;

  useEffect(() => {
    if (store.status !== "active") return;
    const interval = setInterval(() => {
      const s = useTestStore.getState();
      if (s.timeLeft <= 1) {
        s.tick();
        void s.finish();
        clearInterval(interval);
        return;
      }
      s.tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [store.status]);

  return {
    ...store,
    currentQuestion,
    answeredCount,
  };
}
