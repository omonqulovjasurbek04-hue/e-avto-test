/**
 * Tiny in-process cache for cheap-to-stale, expensive-to-compute public reads (leaderboard, landing statistics).
 * Concurrent callers during a refresh share ONE computation (no thundering herd). Per instance: with several
 * servers each keeps its own copy, which is fine for data that may be a minute old.
 */
export const ttlCache = <T>(compute: () => Promise<T>, ttlMs: () => number) => {
  let value: { at: number; data: T } | null = null;
  let inflight: Promise<T> | null = null;

  const get = async (): Promise<T> => {
    const ttl = ttlMs();
    if (ttl > 0 && value && Date.now() - value.at < ttl) return value.data;
    if (inflight) return inflight;
    inflight = compute()
      .then((data) => {
        value = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  return Object.assign(get, {
    clear: () => {
      value = null;
    },
  });
};
