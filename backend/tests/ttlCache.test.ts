import { describe, expect, it, vi } from "vitest";
import { ttlCache } from "../src/utils/ttlCache";

describe("ttlCache", () => {
  it("serves a fresh value from memory and recomputes after the ttl", async () => {
    vi.useFakeTimers();
    const compute = vi.fn(async () => Math.random());
    const get = ttlCache(compute, () => 1000);
    const first = await get();
    expect(await get()).toBe(first);
    expect(compute).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1001);
    await get();
    expect(compute).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not cache at all when the ttl is zero", async () => {
    const compute = vi.fn(async () => 1);
    const get = ttlCache(compute, () => 0);
    await get();
    await get();
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("lets simultaneous callers share one computation", async () => {
    let resolve!: (v: number) => void;
    const compute = vi.fn(() => new Promise<number>((r) => (resolve = r)));
    const get = ttlCache(compute, () => 0);
    const all = Promise.all([get(), get(), get(), get()]);
    resolve(7);
    expect(await all).toEqual([7, 7, 7, 7]);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("never caches a failure and recovers on the next call", async () => {
    const compute = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error("db down")).mockResolvedValue("ok");
    const get = ttlCache(compute, () => 1000);
    await expect(get()).rejects.toThrow("db down");
    expect(await get()).toBe("ok");
  });

  it("can be cleared", async () => {
    const compute = vi.fn(async () => 1);
    const get = ttlCache(compute, () => 60_000);
    await get();
    get.clear();
    await get();
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
