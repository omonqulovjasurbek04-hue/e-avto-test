import { useEffect } from "react";
import { toast } from "sonner";
import { useTestStore } from "../store/test.store";
import { ApiError } from "../services/api";
import type { TestQuestion } from "../types/question";

export function useTest() {
  const store = useTestStore();
  const currentQuestion: TestQuestion | null =
    store.questions.length > 0 ? store.questions[store.currentIndex] : null;

  const answeredCount = Object.keys(store.answers).length;

  useEffect(() => {
    if (store.status !== "active") return;
    let warned = false;
    let nextTryAt = 0;
    let delay = 5000;
    const interval = setInterval(() => {
      const s = useTestStore.getState();
      s.tick();
      // Time is up: submit automatically (the server rechecks the deadline).
      if (useTestStore.getState().timeLeft <= 0 && !s.finishing && Date.now() >= nextTryAt) {
        s.finish().catch((e: unknown) => {
          const status = e instanceof ApiError ? e.status : undefined;
          // 4xx (attempt gone, not yours...) will never succeed: stop instead of retrying forever.
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            clearInterval(interval);
            useTestStore.getState().reset();
            toast.error("Bu test endi mavjud emas yoki sizga tegishli emas.");
            return;
          }
          // Network or server trouble: try again later, waiting longer each time (max 1 min).
          nextTryAt = Date.now() + delay;
          delay = Math.min(delay * 2, 60_000);
          if (warned) return;
          warned = true;
          toast.error("Testni yuborishda xatolik. Aloqa tiklanganda qayta urinamiz.");
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [store.status]);

  return {
    ...store,
    currentQuestion,
    answeredCount,
  };
}
