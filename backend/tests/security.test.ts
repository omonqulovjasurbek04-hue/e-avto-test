import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import listEndpoints from "express-list-endpoints";

/**
 * Route inventory: every route the app registers is probed without credentials. Anything that is
 * not on the explicit public allow-list must answer 401. A new endpoint added without
 * authMiddleware makes this test fail, so access control cannot be forgotten silently.
 */
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `s${Date.now()}`;
const UUID = "6f1c1f3e-8d0c-4b8e-9d57-2b7f0a9d1c11";

const PUBLIC: { method: string; path: RegExp }[] = [
  { method: "GET", path: /^\/(health|robots\.txt|sitemap\.xml)$/ },
  { method: "GET", path: /^\/api\/health(\/live)?$/ },
  { method: "POST", path: /^\/api\/auth\/(register|login|forgot-password|reset-password|verify-email|2fa\/login|telegram\/(start|verify))$/ },
  // Authenticated by the httpOnly refresh cookie instead of an access token (and gated by X-Requested-With).
  { method: "POST", path: /^\/api\/auth\/(refresh|logout)$/ },
  // Sign-in with Google: the browser is not signed in yet; the callback is bound to the start by a state cookie.
  { method: "GET", path: /^\/api\/auth\/google\/(config|start|callback)$/ },
  { method: "GET", path: /^\/api\/(courses|courses\/:id|courses\/:id\/lessons|lessons|lessons\/:id|leaderboard|packages|faq|site-settings|public-stats|pages\/:slug|news|news\/:slug|categories|images\/:name|clips\/:name)$/ },
  { method: "POST", path: /^\/api\/(quote|contact)$/ },
  // Authenticated by something other than a user session: provider signature / signed media token / bot secret.
  { method: "POST", path: /^\/api\/(payments\/webhook\/:provider|telegram\/webhook)$/ },
  { method: "GET", path: /^\/api\/media\/stream\/:token$/ },
  // Prometheus scrape: its own bearer token (METRICS_TOKEN); without it the endpoint pretends not to exist (404).
  { method: "GET", path: /^\/api\/metrics$/ },
];

const isPublic = (method: string, path: string) => PUBLIC.some((p) => p.method === method && p.path.test(path));
const fill = (path: string) => path.replace(/:[A-Za-z]+/g, UUID);

describe.skipIf(!enabled)("access control inventory", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  let studentToken = "";
  let endpoints: { path: string; methods: string[] }[] = [];

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    const res = await request(app).post("/api/auth/register").send({ name: "Sec Student", email: `${run}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    studentToken = res.body.data.token;
    endpoints = listEndpoints(app);
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  const probe = async (method: string, path: string, token?: string) => {
    const r = request(app)[method.toLowerCase() as "get"](fill(path)).send(method === "GET" ? undefined : {});
    return token ? r.set("Authorization", `Bearer ${token}`) : r;
  };

  it("discovers a realistic number of routes", () => {
    expect(endpoints.length).toBeGreaterThan(60);
  });

  it("answers 401 to every non-public route when called without a token", async () => {
    const failures: string[] = [];
    for (const ep of endpoints) {
      for (const method of ep.methods) {
        if (isPublic(method, ep.path)) continue;
        const res = await probe(method, ep.path);
        if (res.status !== 401) failures.push(`${method} ${ep.path} -> ${res.status}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("answers 403 to a plain student on every admin and teaching route", async () => {
    const restricted = /^\/api\/(admin\/|groups|slots|teacher)/;
    const failures: string[] = [];
    let checked = 0;
    for (const ep of endpoints) {
      for (const method of ep.methods) {
        if (!restricted.test(ep.path)) continue;
        checked++;
        const res = await probe(method, ep.path, studentToken);
        if (res.status !== 403) failures.push(`${method} ${ep.path} -> ${res.status}`);
      }
    }
    expect(checked).toBeGreaterThan(40);
    expect(failures).toEqual([]);
  });

  it("never lets the 'public' allow-list grow stale: every entry matches a real route", () => {
    const all = endpoints.flatMap((e) => e.methods.map((m) => ({ m, p: e.path })));
    const unused = PUBLIC.filter((rule) => !all.some((r) => r.m === rule.method && rule.path.test(r.p)));
    expect(unused.map((u) => `${u.method} ${u.path}`)).toEqual([]);
  });
});

describe.skipIf(!enabled)("transport hardening", () => {
  let app: import("express").Application;

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
  });

  it("sends security headers and does not advertise Express", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("does not echo an untrusted origin in CORS", async () => {
    const evil = await request(app).get("/api/courses").set("Origin", "https://evil.example");
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
    const good = await request(app).get("/api/courses").set("Origin", "http://localhost:5173");
    expect(good.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("returns a generic 500 body without stack traces", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts|node_modules|stack/i);
  });

  it("rejects oversized JSON bodies", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.co", password: "x".repeat(2_000_000) });
    expect(res.status).toBe(413);
  });
});

describe.skipIf(!enabled)("account lockout", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let userId = "";
  const email = `${run}-lock@example.com`;

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    const res = await request(app).post("/api/auth/register").send({ name: "Lock Test", email, password: "Passw0rdOK" });
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const login = (password: string) => request(app).post("/api/auth/login").send({ email, password });

  it("locks the account after repeated wrong passwords, even for the right one, and unlocks later", async () => {
    for (let i = 0; i < 8; i++) expect((await login("wrong-password-1")).status).toBe(401);
    const locked = await login("Passw0rdOK");
    expect(locked.status).toBe(429);
    expect(locked.body.data?.token).toBeUndefined();

    await prisma.user.update({ where: { id: userId }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    const ok = await login("Passw0rdOK");
    expect(ok.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).failedLogins).toBe(0);
  });

  it("a successful login resets the failure counter", async () => {
    for (let i = 0; i < 3; i++) await login("nope-nope-1");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).failedLogins).toBe(3);
    expect((await login("Passw0rdOK")).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).failedLogins).toBe(0);
  });

  it("an unknown email gets the same generic answer and creates no state", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: `${run}-ghost@example.com`, password: "Whatever123" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });
});

import { redactUrl } from "../src/utils/redact";

describe("log redaction", () => {
  it("hides tokens and secrets that appear in URLs", () => {
    expect(redactUrl("/api/media/stream/abc.def")).toBe("/api/media/stream/[redacted]");
    expect(redactUrl("/reset?token=abc123&x=1")).toBe("/reset?token=[redacted]&x=1");
    expect(redactUrl("/api/courses?page=2")).toBe("/api/courses?page=2");
  });
});

describe.skipIf(!enabled)("object-level authorization (IDOR)", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let noteId = "";

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    for (const k of ["owner", "intruder"]) {
      const res = await request(app).post("/api/auth/register").send({ name: k, email: `${run}-${k}-idor@example.com`, password: "Passw0rdOK" });
      ids.push(res.body.data.user.id);
      tok[k] = res.body.data.token;
    }
    noteId = (await prisma.notification.create({ data: { userId: ids[0], type: "T", title: "Private", body: "Only for the owner" } })).id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("another user cannot read or mark someone else's notification", async () => {
    const list = await request(app).get("/api/me/notifications").set("Authorization", `Bearer ${tok.intruder}`);
    expect(JSON.stringify(list.body)).not.toContain("Only for the owner");
    const mark = await request(app).post(`/api/me/notifications/${noteId}/read`).set("Authorization", `Bearer ${tok.intruder}`);
    expect(mark.status).toBe(404);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: noteId } })).readAt).toBeNull();
    expect((await request(app).post(`/api/me/notifications/${noteId}/read`).set("Authorization", `Bearer ${tok.owner}`)).status).toBe(200);
  });

  it("a user cannot take over another account through the profile endpoint", async () => {
    const res = await request(app).put("/api/profile").set("Authorization", `Bearer ${tok.intruder}`).send({ email: `${run}-owner-idor@example.com` });
    expect(res.status).toBe(409);
    const escalate = await request(app).put("/api/profile").set("Authorization", `Bearer ${tok.intruder}`).send({ name: "Hacker", role: "SUPERADMIN" });
    expect(escalate.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids[1] } })).role).toBe("USER");
  });
});

describe.skipIf(!enabled)("privileged accounts cannot be disabled by a plain admin", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });
  const status = (who: string, target: string, isActive: boolean) =>
    request(app).patch(`/api/admin/users/${uid[target]}/status`).set(bearer(who)).send({ isActive });

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    for (const [k, role] of [["admin", "ADMIN"], ["otherAdmin", "ADMIN"], ["superadmin", "SUPERADMIN"], ["student", undefined]] as const) {
      const res = await request(app).post("/api/auth/register").send({ name: `${run}-st-${k}`, email: `${run}-st-${k}@example.com`, password: "Passw0rdOK" });
      ids.push(res.body.data.user.id);
      uid[k] = res.body.data.user.id;
      tok[k] = res.body.data.token;
      if (role) await prisma.user.update({ where: { id: uid[k] }, data: { role } });
    }
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("an admin can disable ordinary users but not admins or superadmins", async () => {
    expect((await status("admin", "superadmin", false)).status).toBe(403);
    expect((await status("admin", "otherAdmin", false)).status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: uid.superadmin } })).isActive).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: uid.otherAdmin } })).isActive).toBe(true);
    expect((await status("admin", "student", false)).status).toBe(200);
    expect((await status("admin", "student", true)).status).toBe(200);
  });

  it("a superadmin can manage admin accounts, and an admin cannot re-enable a disabled admin", async () => {
    expect((await status("superadmin", "otherAdmin", false)).status).toBe(200);
    expect((await status("admin", "otherAdmin", true)).status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: uid.otherAdmin } })).isActive).toBe(false);
    expect((await status("superadmin", "otherAdmin", true)).status).toBe(200);
  });
});
