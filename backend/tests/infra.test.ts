import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import fs from "fs";
import http from "http";
import net from "net";
import os from "os";
import path from "path";
import request from "supertest";
import { rateLimit } from "express-rate-limit";
import { RedisRateStore, type RateCounter } from "../src/lib/redisRateStore";
import { scanFile, ScannerUnavailableError } from "../src/lib/media/antivirus";
import { renderMetrics, resetMetrics, metricsMiddleware } from "../src/lib/monitoring";

// Infrastructure pieces that need no database: shared rate-limit store, antivirus protocol, metrics.

/** Behaves like the Redis Lua script: INCR + expiry set on the first hit. */
const fakeCounter = () => {
  const keys = new Map<string, { hits: number; expiresAt: number }>();
  const counter: RateCounter = {
    async hit(key, windowMs) {
      const now = Date.now();
      let e = keys.get(key);
      if (!e || e.expiresAt <= now) e = { hits: 0, expiresAt: now + windowMs };
      e.hits += 1;
      keys.set(key, e);
      return [e.hits, e.expiresAt - now];
    },
    async decrement(key) {
      const e = keys.get(key);
      if (e) e.hits -= 1;
    },
    async reset(key) {
      keys.delete(key);
    },
  };
  return { counter, keys };
};

describe("shared rate-limit store", () => {
  it("counts hits in the shared counter and blocks after the limit, across two app instances", async () => {
    const { counter, keys } = fakeCounter();
    // Two "processes" with their own limiter but the same backing store, as with Redis.
    const makeApp = () => {
      const app = express();
      app.use(rateLimit({ windowMs: 60_000, max: 3, store: new RedisRateStore(counter, "rl:test:"), standardHeaders: true, legacyHeaders: false }));
      app.get("/", (_req, res) => res.send("ok"));
      return app;
    };
    const a = makeApp();
    const b = makeApp();
    expect((await request(a).get("/")).status).toBe(200);
    expect((await request(b).get("/")).status).toBe(200);
    expect((await request(a).get("/")).status).toBe(200);
    expect((await request(b).get("/")).status).toBe(429);
    expect([...keys.keys()].every((k) => k.startsWith("rl:test:"))).toBe(true);
  });

  it("lets requests through when the store fails (passOnStoreError)", async () => {
    const broken: RateCounter = { hit: async () => Promise.reject(new Error("redis down")), decrement: async () => undefined, reset: async () => undefined };
    const app = express();
    app.use(rateLimit({ windowMs: 60_000, max: 1, store: new RedisRateStore(broken, "rl:x:"), passOnStoreError: true }));
    app.get("/", (_req, res) => res.send("ok"));
    expect((await request(app).get("/")).status).toBe(200);
    expect((await request(app).get("/")).status).toBe(200);
  });
});

describe("antivirus (clamd INSTREAM)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eavto-av-"));
  const file = path.join(dir, "upload.bin");
  let server: net.Server;
  let port = 0;
  let mode: "clean" | "infected" | "garbage" = "clean";
  let received = Buffer.alloc(0);

  beforeAll(async () => {
    fs.writeFileSync(file, Buffer.alloc(200_000, 0x41)); // several 64 KiB chunks
    server = net.createServer((sock) => {
      let buf = Buffer.alloc(0);
      sock.on("data", (d) => {
        buf = Buffer.concat([buf, d]);
        const cmd = "zINSTREAM\0";
        if (buf.length < cmd.length) return;
        expect(buf.subarray(0, cmd.length).toString()).toBe(cmd);
        // Decode <len><data> chunks until the zero-length terminator.
        let off = cmd.length;
        const parts: Buffer[] = [];
        while (off + 4 <= buf.length) {
          const len = buf.readUInt32BE(off);
          if (len === 0) {
            received = Buffer.concat(parts);
            const reply = mode === "clean" ? "stream: OK\0" : mode === "infected" ? "stream: Eicar-Test-Signature FOUND\0" : "WHAT\0";
            sock.end(reply);
            return;
          }
          if (off + 4 + len > buf.length) return;
          parts.push(buf.subarray(off + 4, off + 4 + len));
          off += 4 + len;
        }
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    port = (server.address() as net.AddressInfo).port;
  });
  afterAll(() => {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("sends the whole file in framed chunks and reports a clean result", async () => {
    mode = "clean";
    expect(await scanFile(file, { host: "127.0.0.1", port })).toEqual({ status: "clean" });
    expect(received.equals(fs.readFileSync(file))).toBe(true);
  });

  it("reports the signature of an infected file", async () => {
    mode = "infected";
    expect(await scanFile(file, { host: "127.0.0.1", port })).toEqual({ status: "infected", signature: "Eicar-Test-Signature" });
  });

  it("treats an unexpected reply or an unreachable scanner as unavailable (fail closed)", async () => {
    mode = "garbage";
    await expect(scanFile(file, { host: "127.0.0.1", port })).rejects.toBeInstanceOf(ScannerUnavailableError);
    const closed = net.createServer();
    await new Promise<void>((r) => closed.listen(0, "127.0.0.1", () => r()));
    const deadPort = (closed.address() as net.AddressInfo).port;
    await new Promise<void>((r) => closed.close(() => r()));
    await expect(scanFile(file, { host: "127.0.0.1", port: deadPort, timeoutMs: 2000 })).rejects.toBeInstanceOf(ScannerUnavailableError);
  });

  it("skips scanning when no scanner is configured", async () => {
    expect(await scanFile(file, { host: "" })).toEqual({ status: "skipped" });
  });
});

describe("metrics", () => {
  it("records route templates (not raw URLs with ids) and status classes", async () => {
    resetMetrics();
    const app = express();
    app.use(metricsMiddleware);
    app.get("/api/things/:id", (_req, res) => res.send("ok"));
    app.get("/api/boom", (_req, res) => res.status(500).send("x"));
    const srv = http.createServer(app);
    await request(srv).get("/api/things/7b0c6f6e-0000-4000-8000-000000000001");
    await request(srv).get("/api/things/another-id");
    await request(srv).get("/api/boom");
    await request(srv).get("/nope");
    const text = renderMetrics({ app_database_up: 1 });
    expect(text).toContain('http_requests_total{method="GET",route="/api/things/:id",status="2xx"} 2');
    expect(text).toContain('route="unmatched",status="4xx"} 1');
    expect(text).toContain("http_server_errors_total 1");
    expect(text).toContain("app_database_up 1");
    expect(text).not.toContain("7b0c6f6e");
  });
});
