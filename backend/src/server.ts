import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";

const PORT = parseInt(env.PORT, 10) || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${env.NODE_ENV}]`);
});

const shutdown = async () => {
  console.log("Shutting down...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
