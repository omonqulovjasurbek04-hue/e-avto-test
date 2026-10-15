// Usage: PERF_DB=<scratch database url> node scripts/perf-check.mjs   (server on :5099, see docs/PERFORMANCE.md)
import { createRequire } from "node:module";
const require = createRequire(new URL("../package.json", import.meta.url));
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.PERF_DB } } });
const base = "http://localhost:5099";
const secret = "change_this_long_random_secret";
const sign = (userId, role) => jwt.sign({ userId, role, tv: 0 }, secret, { expiresIn: "1h" });

const heavy = await prisma.$queryRaw`SELECT "userId" AS id FROM tests GROUP BY "userId" ORDER BY count(*) DESC LIMIT 1`;
const user = (await prisma.user.findFirst({ where: { email: "perf777@example.com" } })).id;
const admin = "perf-admin-0000-0000-0000-000000000001";
const tUser = sign(user, "USER");
const tAdmin = sign(admin, "ADMIN");
const course = (await prisma.course.findFirst()).id;

const cases = [
  ["GET /courses (public)", "GET", "/api/courses"],
  ["GET /leaderboard (public)", "GET", "/api/leaderboard"],
  ["GET /public-stats", "GET", "/api/public-stats"],
  ["GET /packages", "GET", "/api/packages"],
  ["GET /lessons", "GET", "/api/lessons"],
  ["GET /me/notifications", "GET", "/api/me/notifications", tUser],
  ["GET /me/enrollments", "GET", "/api/me/enrollments", tUser],
  ["GET /orders", "GET", "/api/orders", tUser],
  ["GET /statistics (user)", "GET", "/api/statistics", tUser],
  ["POST /tests/start", "POST", "/api/tests/start", tUser, { courseId: course, count: 20 }],
  ["GET /admin/statistics", "GET", "/api/admin/statistics", tAdmin],
  ["GET /admin/users", "GET", "/api/admin/users", tAdmin],
  ["GET /admin/users?search", "GET", "/api/admin/users?search=perf1999", tAdmin],
  ["GET /admin/finance/orders", "GET", "/api/admin/finance/orders?status=PAID&page=50", tAdmin],
  ["GET /admin/finance/summary", "GET", "/api/admin/finance/summary", tAdmin],
  ["GET /admin/audit", "GET", "/api/admin/audit?page=100", tAdmin],
  ["GET /admin/audit?action", "GET", "/api/admin/audit?action=perf.7", tAdmin],
  ["GET /admin/questions", "GET", "/api/admin/questions", tAdmin],
];

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const one = async ([, method, path, token, body]) => {
  const t0 = performance.now();
  const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  await res.arrayBuffer();
  return { ms: performance.now() - t0, status: res.status };
};

console.log("endpoint".padEnd(34), "status", " p50ms", " p95ms", " conc20 p95");
for (const c of cases) {
  await one(c); // warm up
  const seq = [];
  let status = 0;
  for (let i = 0; i < 25; i++) { const r = await one(c); seq.push(r.ms); status = r.status; }
  const conc = (await Promise.all(Array.from({ length: 20 }, () => one(c)))).map((r) => r.ms);
  console.log(c[0].padEnd(34), String(status).padEnd(6), pct(seq, 0.5).toFixed(0).padStart(6), pct(seq, 0.95).toFixed(0).padStart(6), pct(conc, 0.95).toFixed(0).padStart(10));
}
await prisma.$disconnect();
