import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// One-service hosting (Railway): with WEB_DIST_DIR the API also serves the built site. No database needed.
describe("serving the built site (WEB_DIST_DIR)", () => {
  let app: import("express").Application;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eavto-web-"));

  beforeAll(async () => {
    fs.mkdirSync(path.join(dir, "assets"));
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>E-Avto</title><div id=root></div>");
    fs.writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log(1)");
    fs.writeFileSync(path.join(dir, "favicon.svg"), "<svg/>");
    process.env.WEB_DIST_DIR = dir;
    ({ default: app } = await import("../src/app"));
  });

  afterAll(() => {
    delete process.env.WEB_DIST_DIR;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("serves the app shell with the site CSP and no caching", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id=root>');
    expect(res.headers["cache-control"]).toBe("no-cache");
    const csp = res.headers["content-security-policy"];
    expect(csp).toContain("frame-src https://www.google.com");
    expect(csp).toContain("img-src 'self' data: https:");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("answers client-side routes with the app, and static files as they are", async () => {
    expect((await request(app).get("/courses/some-id")).text).toContain("<div id=root>");
    expect((await request(app).get("/admin/cms")).text).toContain("<div id=root>");
    const asset = await request(app).get("/assets/app-abc123.js");
    expect(asset.status).toBe(200);
    expect(asset.headers["cache-control"]).toContain("immutable");
    expect((await request(app).get("/favicon.svg")).status).toBe(200);
  });

  it("keeps the API: unknown /api paths are JSON 404, not the app", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false });
    expect((await request(app).get("/api/health/live")).body).toMatchObject({ status: "alive" });
  });
});
