import { prisma } from "../config/database";
import { expireStaleOrders } from "./payment.service";
import { processEmailQueue } from "./notification.service";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Removes data that can never be used again: abandoned attempts and expired one-time records. */
export const runCleanup = async () => {
  const now = Date.now();
  const [abandonedTests, resets, telegram] = await Promise.all([
    // An unfinished attempt older than a day is past any possible deadline (max 90 minutes).
    prisma.test.deleteMany({ where: { finishedAt: null, startedAt: { lt: new Date(now - DAY_MS) } } }),
    prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: new Date(now - DAY_MS) } } }),
    prisma.telegramLogin.deleteMany({ where: { expiresAt: { lt: new Date(now - DAY_MS) } } }),
  ]);
  return { abandonedTests: abandonedTests.count, resets: resets.count, telegram: telegram.count };
};

export const startCleanupJob = (): NodeJS.Timeout => {
  const run = () =>
    runCleanup().catch((e: Error) => console.error("Cleanup failed:", e.message));
  void run();
  const timer = setInterval(run, 6 * 60 * 60 * 1000);
  timer.unref();
  // Unpaid orders expire quickly, so they get their own, shorter cycle.
  const expire = () => {
    void processEmailQueue().catch((e: Error) => console.error("Notification e-mail queue failed:", e.message));
    return expireStaleOrders().catch((e: Error) => console.error("Order expiry failed:", e.message));
  };
  void expire();
  setInterval(expire, 5 * 60 * 1000).unref();
  return timer;
};
