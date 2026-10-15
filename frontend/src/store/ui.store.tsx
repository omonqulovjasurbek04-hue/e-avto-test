import React, { useEffect } from "react";
import { create } from "zustand";
import { storage } from "../utils/storage";

export type Theme = "light" | "dark";

interface UIState {
  theme: Theme;
  isSidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: storage.getTheme(),
  isSidebarOpen: false,
  setTheme: (theme) => {
    storage.setTheme(theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme: Theme = get().theme === "light" ? "dark" : "light";
    get().setTheme(nextTheme);
  },
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const saved = storage.getTheme();
    setTheme(saved);
  }, [setTheme]);

  return <>{children}</>;
}
