import * as Sentry from "@sentry/node";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { redactUrl } from "../utils/redact";

// ───────────── error tracking (Sentry / GlitchTip) ─────────────

let sentryOn = false;

/** Call once at process start. Without SENTRY_DSN nothing is sent anywhere. */
export const initErrorTracking = () => {
  if (!env.SENTRY_DSN || sentryOn) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    // No IPs, cookies or request bodies: the platform holds students' personal data.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
    },
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          for (const h of Object.keys(event.request.headers)) {
            if (/authorization|cookie|token|secret/i.test(h)) delete event.request.headers[h];
          }
        }
        if (event.request.url) event.request.url = redactUrl(event.request.url);
        delete event.request.query_string;
      }
      if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
      return event;
    },
  });
  sentryOn = true;
};

export const errorTrackingEnabled = () => sentryOn;

export const captureError = (err: unknown, ctx?: { userId?: string; method?: string; route?: string }) => {
  if (!sentryOn) return;
  Sentry.withScope((scope) => {
    if (ctx?.userId) scope.setUser({ id: ctx.userId });
    if (ctx?.method) scope.setTag("method", ctx.method);
    if (ctx?.route) scope.setTag("route", ctx.route);
    Sentry.captureException(err);
  });
};

export const flushErrorTracking = async () => {
  if (sentryOn) await Sentry.flush(2000).catch(() => undefined);
};

// ───────────── metrics (Prometheus text format) ─────────────

const BUCKETS = [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

interface Histo { buckets: number[]; sum: number; count: number }
const requests = new Map<string, number>();
const durations = new Map<string, Histo>();
let errors5xx = 0;

/** Route template (e.g. /api/courses/:id), never the raw URL — keeps label cardinality bounded and ids out of metrics. */
export const routeLabel = (req: Request) => (req.route?.path ? `${req.baseUrl}${typeof req.route.path === "string" ? req.route.path : ""}` : "unmatched");

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = routeLabel(req);
    const status = `${Math.floor(res.statusCode / 100)}xx`;
    const key = `${req.method}|${route}|${status}`;
    requests.set(key, (requests.get(key) ?? 0) + 1);
    const dkey = `${req.method}|${route}`;
    const h = durations.get(dkey) ?? { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 };
    BUCKETS.forEach((b, i) => {
      if (seconds <= b) h.buckets[i] += 1;
    });
    h.sum += seconds;
    h.count += 1;
    durations.set(dkey, h);
    if (res.statusCode >= 500) errors5xx += 1;
  });
  next();
};

const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

export const renderMetrics = (extra: Record<string, number> = {}): string => {
  const lines: string[] = [];
  lines.push("# HELP http_requests_total HTTP requests by method, route and status class.", "# TYPE http_requests_total counter");
  for (const [key, n] of requests) {
    const [method, route, status] = key.split("|");
    lines.push(`http_requests_total{method="${esc(method)}",route="${esc(route)}",status="${status}"} ${n}`);
  }
  lines.push("# HELP http_request_duration_seconds Request latency.", "# TYPE http_request_duration_seconds histogram");
  for (const [key, h] of durations) {
    const [method, route] = key.split("|");
    const l = `method="${esc(method)}",route="${esc(route)}"`;
    BUCKETS.forEach((b, i) => lines.push(`http_request_duration_seconds_bucket{${l},le="${b}"} ${h.buckets[i]}`));
    lines.push(`http_request_duration_seconds_bucket{${l},le="+Inf"} ${h.count}`);
    lines.push(`http_request_duration_seconds_sum{${l}} ${h.sum.toFixed(6)}`);
    lines.push(`http_request_duration_seconds_count{${l}} ${h.count}`);
  }
  lines.push("# HELP http_server_errors_total Responses with status 5xx.", "# TYPE http_server_errors_total counter", `http_server_errors_total ${errors5xx}`);
  const mem = process.memoryUsage();
  lines.push("# TYPE process_resident_memory_bytes gauge", `process_resident_memory_bytes ${mem.rss}`);
  lines.push("# TYPE nodejs_heap_used_bytes gauge", `nodejs_heap_used_bytes ${mem.heapUsed}`);
  lines.push("# TYPE process_uptime_seconds gauge", `process_uptime_seconds ${Math.round(process.uptime())}`);
  for (const [name, value] of Object.entries(extra)) {
    lines.push(`# TYPE ${name} gauge`, `${name} ${value}`);
  }
  return `${lines.join("\n")}\n`;
};

/** Test helper. */
export const resetMetrics = () => {
  requests.clear();
  durations.clear();
  errors5xx = 0;
};
