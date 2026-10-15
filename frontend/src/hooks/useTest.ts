import { useEffect } from "react";
import { toast } from "sonner";
import { useTestStore } from "../store/test.store";
import type { TestQuestion } from "../types/question";

export function useTest() {
  const store = useTestStore();
  const currentQuestion: TestQuestion | null =
    store.questions.length > 0 ? store.questions[store.currentIndex] : null;

  const answeredCount = Object.keys(store.answers).length;

  useEffect(() => {
    if (store.status !== "active") return;
    let warned = false;
    const interval = setInterval(() => {
      const s = useTestStore.getState();
      s.tick();
      // Time is up: submit automatically (the server rechecks the deadline).
      if (useTestStore.getState().timeLeft <= 0 && !s.finishing) {
        s.finish().catch(() => {
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
