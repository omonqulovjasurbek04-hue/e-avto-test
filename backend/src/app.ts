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
import { mediaRoutes, adminMediaRoutes } from "./routes/media.routes";
import { publicCmsRoutes, adminCmsRoutes, crawlerRoutes } from "./routes/cms.routes";
import { staffRoutes, adminGroupRoutes, studentTeachingRoutes } from "./routes/teaching.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { error } from "./utils/apiResponse";
import { redactUrl } from "./utils/redact";
import { asyncHandler } from "./middleware/asyncHandler";
import * as telegramController from "./controllers/telegram.controller";

const app: Application = express();

// Needed so rate limiting sees the real client IP behind a hosting proxy.
if (env.NODE_ENV === "production") app.set("trust proxy", 1);

const allowedOrigins = env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean);

app.use(helmet());
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
app.get("/api/health", asyncHandler(health));

app.post("/api/telegram/webhook/:secret", asyncHandler(telegramController.webhook));
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", courseRoutes);
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
app.use("/api/admin/audit", auditRoutes);
app.use("/api/admin/finance", financeRoutes);
app.use("/api/admin/exam", examRoutes);
app.use("/api/admin/media", adminMediaRoutes);
app.use("/api/admin/cms", adminCmsRoutes);
app.use("/api/admin/groups", adminGroupRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req: Request, res: Response) => {
  error(res, "Not found", 404);
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  errorMiddleware(err, req, res, next);
});

export default app;
