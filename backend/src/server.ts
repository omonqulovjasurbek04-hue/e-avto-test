import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { startBot, stopBot } from "./services/telegram.service";
import { startCleanupJob } from "./services/cleanup.service";
import { initErrorTracking, captureError, flushErrorTracking } from "./lib/monitoring";
import { closeRedis } from "./lib/redis";
import { loadJwtSecretFromDb } from "./lib/appSecrets";

initErrorTracking();

const PORT = parseInt(env.PORT, 10) || 5000;

let server: ReturnType<typeof app.listen> | null = null;

const shutdown = async (signal: string) => {
  stopBot();
  console.log(`${signal} received, shutting down...`);
  if (!server) process.exit(0);
  server.close(async () => {
    await prisma.$disconnect();
    await closeRedis();
    await flushErrorTracking();
    process.exit(0);
  });
  // Force exit if connections do not close in time.
  setTimeout(() => process.exit(1), 10_000).unref();
};

// The signing secret must be known before the first request (JWT_SECRET_FROM_DB).
void loadJwtSecretFromDb()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${env.NODE_ENV}]`);
    });
    startBot();
    startCleanupJob();
  })
  .catch((e: Error) => {
    console.error("Start-up failed:", e.message);
    process.exit(1);
  });


process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  captureError(reason);
  console.error("Unhandled promise rejection:", reason instanceof Error ? reason.message : reason);
});
process.on("uncaughtException", (err) => {
  captureError(err);
  console.error("Uncaught exception:", err.message);
  void flushErrorTracking().finally(() => process.exit(1));
});
