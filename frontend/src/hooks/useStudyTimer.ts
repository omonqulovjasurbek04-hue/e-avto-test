import { useEffect } from "react";
import { studentService } from "@/services/platform.service";
import { useAuthStore } from "@/store/auth.store";

const REPORT_EVERY_MS = 30_000;
const TICK_MS = 1_000;

/**
 * Counts the time a lesson or test page is open and visible, and reports it every 30 s (and when the
 * page is left or hidden). The server credits only time that really passed, so this is a hint, not
 * the source of truth. Staff and guests are not tracked.
 */
export function useStudyTimer(kind: "lesson" | "test", enabled = true) {
  const isStudent = useAuthStore((s) => s.isAuthenticated && s.user?.role === "USER");

  useEffect(() => {
    if (!enabled || !isStudent) return;
    let pending = 0;

    const flush = () => {
      const seconds = Math.round(pending);
      if (seconds < 1) return;
      pending = 0;
      void studentService.reportStudyTime(kind, seconds).catch(() => undefined);
    };
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") pending += TICK_MS / 1000;
    }, TICK_MS);
    const report = setInterval(flush, REPORT_EVERY_MS);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(tick);
      clearInterval(report);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [kind, enabled, isStudent]);
}
