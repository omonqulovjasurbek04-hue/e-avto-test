import Redis from "ioredis";
import { env } from "../config/env";
import type { RateCounter } from "./redisRateStore";

/**
 * Optional shared Redis connection. Used so rate limits hold across several API processes/containers.
 * Empty REDIS_URL = no Redis (single-process memory store, fine for one instance and for development).
 * Tests never use Redis (rate limiting is skipped there).
 */
type RateRedis = Redis & { rlHit(key: string, windowMs: number): Promise<[number, number]> };
let client: RateRedis | null = null;

const enabled = () => Boolean(env.REDIS_URL) && env.NODE_ENV !== "test";

// INCR + set the expiry on the first hit, atomically. ioredis runs it with EVALSHA and reloads it on NOSCRIPT.
const HIT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl <= 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {hits, ttl}`;

const getClient = (): RateRedis | null => {
  if (!enabled()) return null;
  if (!client) {
    const c = new Redis(env.REDIS_URL, {
      // While Redis is unreachable a command fails at once instead of queueing until a reconnect
      // (which held every rate-limited request, e.g. login, for 10+ seconds); the limiter lets it through.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });
    c.defineCommand("rlHit", { numberOfKeys: 1, lua: HIT_SCRIPT });
    let lastLog = 0;
    c.on("error", (err) => {
      // Reconnect errors repeat every few seconds; log at most once a minute.
      if (Date.now() - lastLog > 60_000) {
        lastLog = Date.now();
        console.error("Redis error:", err.message);
      }
    });
    client = c as RateRedis;
  }
  return client;
};

export const rateCounter = (): RateCounter | null => {
  const c = getClient();
  if (!c) return null;
  return {
    hit: async (key, windowMs) => {
      const [hits, ttl] = await c.rlHit(key, windowMs);
      return [Number(hits), Number(ttl)];
    },
    decrement: async (key) => {
      await c.decr(key);
    },
    reset: async (key) => {
      await c.del(key);
    },
  };
};

export const redisStatus = (): "disabled" | "ready" | "connecting" | "down" => {
  const c = getClient();
  if (!c) return "disabled";
  if (c.status === "ready") return "ready";
  if (["connecting", "connect", "reconnecting", "wait"].includes(c.status)) return "connecting";
  return "down";
};

export const closeRedis = async () => {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
};
