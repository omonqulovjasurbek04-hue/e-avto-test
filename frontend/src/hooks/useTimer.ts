import { useEffect } from "react";
import { useTestStore } from "../store/test.store";

export function useTimer() {
  const { remainingSeconds, isTimerRunning, decrementTimer } = useTestStore();

  useEffect(() => {
    if (!isTimerRunning || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, remainingSeconds, decrementTimer]);

  return {
    remainingSeconds,
    isTimerRunning,
  };
}
