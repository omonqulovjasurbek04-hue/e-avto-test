import fs from "fs";
import path from "path";
import os from "os";
import { afterEach, describe, expect, it, vi } from "vitest";

const strong = "x".repeat(40);
const prodEnv = { NODE_ENV: "production", JWT_SECRET: strong, DATABASE_URL: "postgresql://u:p@db:5432/x", CLIENT_URL: "https://eavto.example.uz", PUBLIC_API_ORIGIN: "https://api.eavto.example.uz" };

const load = async (overrides: Record<string, string | undefined>) => {
  vi.resetModules();
  const saved = { ...process.env };
  // dotenv reads ./.env relative to the working directory; production hosts have none, so test the same way.
  const cwd = process.cwd();
  process.chdir(os.tmpdir());
  for (const k of ["NODE_ENV", "JWT_SECRET", "DATABASE_URL", "CLIENT_URL", "PAYMENT_PROVIDER", "MEDIA_UPLOAD_ENABLED", "MEDIA_SIGNING_SECRET", "PUBLIC_API_ORIGIN", "STORAGE_DRIVER", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "METRICS_TOKEN"]) delete process.env[k];
  Object.assign(process.env, prodEnv, overrides);
  for (const [k, v] of Object.entries(overrides)) if (v === undefined) delete process.env[k];
  try {
    return await import("../src/config/env");
  } finally {
    process.chdir(cwd);
    process.env = saved;
  }
};

afterEach(() => vi.resetModules());

describe("production configuration guards", () => {
  it("starts with a complete, safe production configuration", async () => {
    const { env } = await load({});
    expect(env.NODE_ENV).toBe("production");
  });

  it.each([
    ["a weak JWT secret", { JWT_SECRET: "short" }, /JWT_SECRET/],
    ["the development JWT secret", { JWT_SECRET: "change_this_long_random_secret" }, /JWT_SECRET/],
    ["a missing database URL", { DATABASE_URL: undefined }, /DATABASE_URL/],
    ["localhost as the site origin", { CLIENT_URL: "https://localhost:5173" }, /CLIENT_URL/],
    ["a plain http origin", { CLIENT_URL: "http://eavto.example.uz" }, /CLIENT_URL/],
    ["a missing public API URL", { PUBLIC_API_ORIGIN: undefined }, /PUBLIC_API_ORIGIN/],
    ["an http public API URL", { PUBLIC_API_ORIGIN: "http://api.eavto.example.uz" }, /PUBLIC_API_ORIGIN/],
    ["a public API origin with a path", { PUBLIC_API_ORIGIN: "https://api.eavto.example.uz/api" }, /PUBLIC_API_ORIGIN/],
    ["S3 storage without credentials", { STORAGE_DRIVER: "s3", S3_BUCKET: "media" }, /S3_ACCESS_KEY_ID/],
    ["an unknown storage driver", { STORAGE_DRIVER: "ftp" }, /STORAGE_DRIVER/],
    ["a short metrics token", { METRICS_TOKEN: "short" }, /METRICS_TOKEN/],
    ["a wildcard origin", { CLIENT_URL: "https://*.example.uz" }, /CLIENT_URL/],
    ["the mock payment provider", { PAYMENT_PROVIDER: "mock" }, /mock/],
    ["uploads enabled without a media signing secret", { MEDIA_UPLOAD_ENABLED: "true" }, /MEDIA_SIGNING_SECRET/],
  ])("refuses to start with %s", async (_name, overrides, message) => {
    await expect(load(overrides)).rejects.toThrow(message);
  });
});

describe(".env.example", () => {
  it("documents every variable the backend reads", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../src/config/env.ts"), "utf8");
    const used = [...new Set([...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]))];
    const example = fs.readFileSync(path.resolve(__dirname, "../.env.example"), "utf8");
    const documented = new Set([...example.matchAll(/^#?\s*([A-Z0-9_]+)=/gm)].map((m) => m[1]));
    const missing = used.filter((k) => !documented.has(k));
    expect(missing).toEqual([]);
  });
});
