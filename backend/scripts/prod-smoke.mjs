// Production smoke test: runs the COMPILED server (dist/) in NODE_ENV=production against a throw-away
// database and checks the things a deploy can silently get wrong.
//
//   npm run build
//   SMOKE_DATABASE_URL=postgresql://user:pass@host:5432/smoke_db npm run smoke
//
// The database must exist and have the migrations applied (prisma migrate deploy). Nothing is written to it.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const dbUrl = process.env.SMOKE_DATABASE_URL;
if (!dbUrl) {
  console.error("Set SMOKE_DATABASE_URL (a disposable database with migrations applied).");
  process.exit(2);
}

const PORT = process.env.SMOKE_PORT || "5077";
const base = `http://localhost:${PORT}`;
const ORIGIN = "https://smoke.example.uz";

const baseEnv = {
  PATH: process.env.PATH,
  SystemRoot: process.env.SystemRoot, // required by Node on Windows
  NODE_ENV: "production",
  PORT,
  DATABASE_URL: dbUrl,
  JWT_SECRET: "smoke-test-secret-".padEnd(48, "x"),
  CLIENT_URL: ORIGIN,
};

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function startServer(env) {
  const child = spawn(process.execPath, ["dist/server.js"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));
  return { child, exited, output: () => out };
}

async function waitHealthy(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${base}/api/health/live`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  return false;
}

// 1) Misconfigured production must refuse to start.
{
  const s = await startServer({ ...baseEnv, JWT_SECRET: "too-short" });
  const code = await Promise.race([s.exited, sleep(8000).then(() => "timeout")]);
  check("refuses to start with a weak JWT secret", code !== "timeout" && code !== 0, `exit=${code}`);
  s.child.kill();
}

// 2) Correct configuration starts and behaves.
const server = await startServer(baseEnv);
try {
  check("starts in production mode", await waitHealthy());

  const live = await fetch(`${base}/api/health/live`);
  check("liveness endpoint answers without the database", live.status === 200);

  const ready = await fetch(`${base}/api/health`);
  const readyBody = await ready.json();
  check("readiness endpoint reaches the database", ready.status === 200 && readyBody.database === "reachable");

  check("no X-Powered-By header", ready.headers.get("x-powered-by") === null);
  check("HSTS header present", ready.headers.get("strict-transport-security") !== null);

  const unknown = await fetch(`${base}/api/does-not-exist`);
  const unknownText = await unknown.text();
  check("unknown route is a clean JSON 404", unknown.status === 404 && !/at .*\.(js|ts)|node_modules/i.test(unknownText));

  const bad = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
  const badText = await bad.text();
  check("malformed JSON gives 400 without a stack trace", bad.status === 400 && !/\.js:\d+|node_modules/i.test(badText));

  const cors = await fetch(`${base}/api/courses`, { headers: { Origin: "https://evil.example" } });
  check("CORS does not allow an unknown origin", cors.headers.get("access-control-allow-origin") === null);
  const corsOk = await fetch(`${base}/api/courses`, { headers: { Origin: ORIGIN } });
  check("CORS allows the configured site origin", corsOk.headers.get("access-control-allow-origin") === ORIGIN);

  const admin = await fetch(`${base}/api/admin/users`);
  check("admin API refuses anonymous callers", admin.status === 401);

  const order = await fetch(`${base}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check("ordering is closed without a session", order.status === 401);

  check("no secrets or stack traces in server output", !/smoke-test-secret|at .*\.(ts|js):\d+/i.test(server.output()));
} finally {
  server.child.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
