import { defineConfig } from "vitest/config";

const testDb = process.env.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Integration tests run against a real PostgreSQL given by TEST_DATABASE_URL (skipped if unset).
    env: {
      ...(testDb ? { DATABASE_URL: testDb } : {}),
      NODE_ENV: "test",
      // Most suites test features, not the paywall: they run with everything open. The access suites
      // (enforce, media.access, refund, review-fixes) switch enforcement on themselves.
      ENFORCE_ENROLLMENT: "false",
      // Tests read fresh data right after writing it, so the public read caches stay off.
      LEADERBOARD_CACHE_SECONDS: "0",
      JWT_SECRET: "test-secret-test-secret-test-secret-123",
      TELEGRAM_BOT_TOKEN: "123:test-token",
      TELEGRAM_BOT_USERNAME: "test_bot",
    },
    fileParallelism: false,
    testTimeout: 30000,
    // The first suite imports the whole app cold (AWS SDK, Sentry, Prisma), which can exceed the 10 s default.
    hookTimeout: 30000,
  },
});
