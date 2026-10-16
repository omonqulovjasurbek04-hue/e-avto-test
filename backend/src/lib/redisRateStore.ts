import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";

/** The two Redis operations the store needs; ioredis implements them, tests pass a fake. */
export interface RateCounter {
  /** Increments the counter, starting a `windowMs` expiry on the first hit. Returns [hits, msUntilReset]. */
  hit(key: string, windowMs: number): Promise<[number, number]>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
}

/** Fixed-window counter shared by all API processes (one Redis key per client and limiter). */
export class RedisRateStore implements Store {
  localKeys = false;
  private windowMs = 60_000;

  constructor(private readonly counter: RateCounter, readonly prefix: string) {}

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const [totalHits, ttl] = await this.counter.hit(this.prefix + key, this.windowMs);
    return { totalHits, resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)) };
  }

  async decrement(key: string) {
    await this.counter.decrement(this.prefix + key);
  }

  async resetKey(key: string) {
    await this.counter.reset(this.prefix + key);
  }
}
