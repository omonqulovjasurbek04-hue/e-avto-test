import { useCallback, useState } from "react";
import { useAuthStore } from "@/store/auth.store";

/** Storage key per signed-in account, so one person's choices never show up for another on the same browser. */
const keyFor = (userId: string | undefined, key: string) => `e_avto:${userId ?? "guest"}:${key}`;

export const readStored = (userId: string | undefined, key: string): string | null => {
  try {
    return localStorage.getItem(keyFor(userId, key));
  } catch {
    return null;
  }
};

export const writeStored = (userId: string | undefined, key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(keyFor(userId, key));
    else localStorage.setItem(keyFor(userId, key), value);
  } catch {
    // Private mode / storage full: the choice simply is not remembered.
  }
};

/**
 * A page choice (selected course, teacher, edit mode …) remembered in localStorage instead of the address
 * bar, so ids do not show up in URLs, history or shared links. Survives reloads and going back.
 */
export function useStoredState(key: string): [string | null, (value: string | null) => void] {
  const userId = useAuthStore((s) => s.user?.id);
  const [value, setValue] = useState<string | null>(() => readStored(userId, key));
  const set = useCallback(
    (next: string | null) => {
      writeStored(userId, key, next);
      setValue(next);
    },
    [userId, key]
  );
  return [value, set];
}
