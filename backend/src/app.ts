import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import courseRoutes from "./routes/course.routes";
import lessonRoutes from "./routes/lesson.routes";
import testRoutes from "./routes/test.routes";
import resultRoutes from "./routes/result.routes";
import adminRoutes from "./routes/admin.routes";
import progressRoutes from "./routes/progress.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { error } from "./utils/apiResponse";
import { asyncHandler } from "./middleware/asyncHandler";

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const health = async (_req: Request, res: Response): Promise<void> => {
  await import("./config/database").then(({ prisma }) => prisma.$queryRaw`SELECT 1`);
  res.json({ success: true, data: { status: "ok", database: "reachable" } });
};

app.get("/health", asyncHandler(health));
app.get("/api/health", asyncHandler(health));

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", lessonRoutes);
app.use("/api", testRoutes);
app.use("/api", resultRoutes);
app.use("/api", progressRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req: Request, res: Response) => {
  error(res, "Not found", 404);
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  errorMiddleware(err, req, res, next);
});

export default app;
