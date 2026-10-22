import fs from "fs";
import path from "path";
import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import { env } from "./config/env";
import { prisma } from "./config/database";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import courseRoutes from "./routes/course.routes";
import lessonRoutes from "./routes/lesson.routes";
import testRoutes from "./routes/test.routes";
import resultRoutes from "./routes/result.routes";
import adminRoutes from "./routes/admin.routes";
import progressRoutes from "./routes/progress.routes";
import { publicCatalogRoutes, adminCatalogRoutes } from "./routes/catalog.routes";
import orderRoutes from "./routes/order.routes";
import studentRoutes from "./routes/student.routes";
import auditRoutes from "./routes/audit.routes";
import financeRoutes from "./routes/finance.routes";
import examRoutes from "./routes/exam.routes";
import { mediaRoutes, adminMediaRoutes, adminImageRoutes } from "./routes/media.routes";
import { publicCmsRoutes, adminCmsRoutes, crawlerRoutes } from "./routes/cms.routes";
import { staffRoutes, adminGroupRoutes, studentTeachingRoutes } from "./routes/teaching.routes";
import { reportRoutes, systemRoutes } from "./routes/report.routes";
import { publicCategoryRoutes, adminCategoryRoutes } from "./routes/category.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { error } from "./utils/apiResponse";
import { redactUrl } from "./utils/redact";
import { asyncHandler } from "./middleware/asyncHandler";
import * as telegramController from "./controllers/telegram.controller";
import { metricsMiddleware, renderMetrics } from "./lib/monitoring";
import { redisStatus } from "./lib/redis";
import { safeEqual } from "./utils/safeEqual";

const app: Application = express();

// Needed so rate limiting sees the real client IP behind a hosting proxy.
if (env.NODE_ENV === "production") app.set("trust proxy", env.TRUST_PROXY_HOPS);

const allowedOrigins = env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean);

// One-service hosting: the API also serves the built site, so the browser talks to a single origin
// (first-party cookies, no CORS). The same CSP as deploy/nginx.conf.template then applies to the HTML.
const webDist = env.WEB_DIST_DIR ? path.resolve(env.WEB_DIST_DIR) : "";
const serveWeb = Boolean(webDist) && fs.existsSync(path.join(webDist, "index.html"));
if (env.WEB_DIST_DIR && !serveWeb) console.warn(`WEB_DIST_DIR set but ${webDist}/index.html is missing: serving the API only`);

app.use(metricsMiddleware);
app.use(
  helmet(
    serveWeb
      ? {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https:"],
              mediaSrc: ["'self'", "https:", "blob:"],
              // hls.js (adaptive lesson video) runs its segment demuxer in a blob: worker.
              workerSrc: ["'self'", "blob:"],
              fontSrc: ["'self'", "data:"],
              connectSrc: ["'self'"],
              frameSrc: ["https://www.google.com"],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          },
          referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        }
      : undefined
  )
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, health checks) send no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
// Credentials that live in the URL (signed media token, Telegram webhook secret, password-reset links) must not reach the logs.
morgan.token("safe-url", (req: Request) => redactUrl(req.originalUrl ?? req.url ?? ""));
const LOG_FORMAT =
  env.NODE_ENV === "production"
    ? ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    : ":method :safe-url :status :response-time ms - :res[content-length]";
app.use(morgan(LOG_FORMAT, { skip: () => env.NODE_ENV === "test" }));
// The raw bytes are kept so payment webhook signatures can be verified against exactly what was sent.
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
// Plain HTML form posts (no nested objects); payment providers may notify in this format.
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

const health = async (_req: Request, res: Response): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ success: true, status: "ok", service: "e-avto-test-api", database: "reachable" });
};

// Liveness (process is up, no database) vs readiness (database reachable) for orchestrators.
app.get("/api/health/live", (_req: Request, res: Response) => {
  res.json({ success: true, status: "alive" });
});
app.get("/health", asyncHandler(health));

// Prometheus scrape endpoint. Off unless METRICS_TOKEN is set; the token goes in "Authorization: Bearer".
app.get(
  "/api/metrics",
  asyncHandler(async (req: Request, res: Response) => {
    const auth = req.headers.authorization ?? "";
    if (!env.METRICS_TOKEN || !safeEqual(auth, `Bearer ${env.METRICS_TOKEN}`)) {
      error(res, "Not found", 404);
      return;
    }
    let dbUp = 1;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbUp = 0;
    }
    const redis = redisStatus();
    res.type("text/plain; version=0.0.4").send(
      renderMetrics({ app_database_up: dbUp, app_redis_up: redis === "ready" ? 1 : 0, app_redis_enabled: redis === "disabled" ? 0 : 1 })
    );
  })
);
app.get("/api/health", asyncHandler(health));

app.post("/api/telegram/webhook/:secret", asyncHandler(telegramController.webhook));
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", publicCategoryRoutes);
app.use("/api", lessonRoutes);
app.use("/api", testRoutes);
app.use("/api", resultRoutes);
app.use("/api", progressRoutes);
app.use("/api", publicCatalogRoutes);
app.use("/api", orderRoutes);
app.use("/api", studentRoutes);
app.use("/api", mediaRoutes);
app.use("/api", publicCmsRoutes);
app.use(crawlerRoutes);
app.use("/api", studentTeachingRoutes);
app.use("/api", staffRoutes);
app.use("/api/admin/catalog", adminCatalogRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/audit", auditRoutes);
app.use("/api/admin/finance", financeRoutes);
app.use("/api/admin/exam", examRoutes);
app.use("/api/admin/media", adminMediaRoutes);
app.use("/api/admin/cms/images", adminImageRoutes);
app.use("/api/admin/cms", adminCmsRoutes);
app.use("/api/admin/groups", adminGroupRoutes);
app.use("/api/admin/reports", reportRoutes);
app.use("/api/admin/system", systemRoutes);
app.use("/api/admin", adminRoutes);

if (serveWeb) {
  // Hashed build files never change: cache for a year. index.html is always revalidated.
  app.use("/assets", express.static(path.join(webDist, "assets"), { immutable: true, maxAge: "1y", index: false }));
  app.use(express.static(webDist, { index: false, maxAge: "1h" }));
  // Client-side routes (React Router) get the app; unknown /api paths still answer with JSON 404 below.
  app.get(/^(?!\/api(\/|$)).*/, (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((_req: Request, res: Response) => {
  error(res, "Not found", 404);
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  errorMiddleware(err, req, res, next);
});

export default app;
