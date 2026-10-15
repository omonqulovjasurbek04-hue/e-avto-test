import { defineConfig } from "@playwright/test";
import path from "path";

/**
 * End-to-end tests run the REAL backend (mock payment provider) on port 5055 against a dedicated
 * database (e_avto_test_e2e) and the real Vite frontend on 5173. Nothing here touches the dev DB.
 * Uses the Microsoft Edge that ships with Windows, so no browser download is needed.
 */
export const API = "http://localhost:5055/api";
export const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/e_avto_test_e2e?schema=public";
export const MOCK_SECRET = "e2e-mock-secret";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./global-setup.ts",
  projects: [
    { name: "desktop", testIgnore: /mobile.spec/ },
    // Phone-sized touch device: layout, menus and overflow checks only (the flows are covered on desktop).
    { name: "mobile", testMatch: /mobile.spec/, use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  use: { baseURL: "http://localhost:5173", channel: "msedge", trace: "retain-on-failure", locale: "uz-UZ" },
  webServer: [
    {
      command: "npx tsx src/server.ts",
      cwd: path.resolve(__dirname, "../backend"),
      url: "http://localhost:5055/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: "5055",
        // "test" keeps rate limiting off and stops the project .env from overriding these values.
        NODE_ENV: "test",
        DATABASE_URL: E2E_DB,
        PAYMENT_PROVIDER: "mock",
        PAYMENT_MOCK_SECRET: MOCK_SECRET,
        ENFORCE_ENROLLMENT: "true",
        LEADERBOARD_CACHE_SECONDS: "0", // tests compare screens with fresh API numbers
        // Private media is exercised end to end; files go to a throw-away folder.
        MEDIA_UPLOAD_ENABLED: "true",
        MEDIA_DIR: path.resolve(__dirname, ".media"),
        TELEGRAM_BOT_TOKEN: "",
        CLIENT_URL: "http://localhost:5173",
      },
    },
    {
      command: "npx vite --port 5173 --strictPort",
      cwd: path.resolve(__dirname, "../frontend"),
      url: "http://localhost:5173",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_URL: "http://localhost:5055/api", VITE_USE_MOCK: "false" },
    },
  ],
});
