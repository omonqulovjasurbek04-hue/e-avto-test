import { useCallback, useEffect, useRef, useState } from "react";

/** Loads data on mount and on demand; exposes loading/error so pages can show the right state. */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const run = useCallback(() => {
    // Only the newest request may update the state (filters/pages can change faster than responses arrive).
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    return fetcher()
      .then((d) => {
        if (id === latest.current) setData(d);
      })
      .catch((e: unknown) => {
        if (id === latest.current) setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
      })
      .finally(() => {
        if (id === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
