import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTestStore } from "../store/test.store";
import { ROUTES } from "../constants/routes";
import type { TestMode } from "../types/result";

/** Starts one attempt through the store (exactly one server call) and opens the test screen. */
export function useStartTest() {
  const navigate = useNavigate();
  const start = useTestStore((s) => s.start);
  const [starting, setStarting] = useState(false);

  const startTest = async (courseId?: string, count?: number, mode?: TestMode) => {
    setStarting(true);
    try {
      const id = await start(courseId, count, undefined, mode);
      navigate(ROUTES.testPage(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Testni boshlashda xatolik");
    } finally {
      setStarting(false);
    }
  };

  return { startTest, starting };
}
