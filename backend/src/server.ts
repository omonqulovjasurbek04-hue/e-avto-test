import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { startBot, stopBot } from "./services/telegram.service";
import { startCleanupJob } from "./services/cleanup.service";
import { initErrorTracking, captureError, flushErrorTracking } from "./lib/monitoring";
import { closeRedis } from "./lib/redis";

initErrorTracking();

const PORT = parseInt(env.PORT, 10) || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${env.NODE_ENV}]`);
});

const shutdown = async (signal: string) => {
  stopBot();
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    await closeRedis();
    await flushErrorTracking();
    process.exit(0);
  });
  // Force exit if connections do not close in time.
  setTimeout(() => process.exit(1), 10_000).unref();
};

startBot();
startCleanupJob();

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
