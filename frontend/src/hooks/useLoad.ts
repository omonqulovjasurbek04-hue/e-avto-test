import { useCallback, useEffect, useState } from "react";

/** Loads data on mount and on demand; exposes loading/error so pages can show the right state. */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetcher()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Xatolik yuz berdi"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
