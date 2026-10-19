import { useEffect } from "react";
import { create } from "zustand";
import { studentService } from "@/services/platform.service";
import { env } from "@/config/env";

type Access = { all: boolean; courseIds: string[] };

interface AccessState {
  access: Access | null;
  loaded: boolean;
  refresh: () => Promise<void>;
}

/**
 * Which courses the signed-in student has bought (the server decides; the UI only mirrors it).
 * Shared by the sidebar locks and the lessons/tests guard, so it is fetched once per page change.
 */
const useAccessStore = create<AccessState>((set) => ({
  access: null,
  loaded: false,
  refresh: async () => {
    if (env.useMock) {
      set({ access: { all: true, courseIds: [] }, loaded: true });
      return;
    }
    try {
      set({ access: await studentService.courseAccess(), loaded: true });
    } catch {
      // Unknown: keep the menu usable; the server still refuses locked content.
      set({ access: null, loaded: true });
    }
  },
}));

/** `hasAnyCourse` is null while unknown (still loading, or the request failed). */
export function useCourseAccess(refreshKey?: unknown) {
  const { access, loaded, refresh } = useAccessStore();
  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);
  const hasAnyCourse = access ? access.all || access.courseIds.length > 0 : null;
  return { access, loaded, hasAnyCourse, refresh };
}
