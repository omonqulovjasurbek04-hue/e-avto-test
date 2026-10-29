import { prisma } from "../config/database";
import { expireStaleOrders } from "./payment.service";
import { processEmailQueue, processTelegramReminders } from "./notification.service";
import { pruneRefreshTokens } from "./session.service";
import { archiveFinishedGroups } from "./group.service";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Removes data that can never be used again: abandoned attempts and expired one-time records. */
export const runCleanup = async () => {
  const now = Date.now();
  const [abandonedTests, resets, telegram, refreshTokens, verifications] = await Promise.all([
    // An unfinished attempt older than a day is past any possible deadline (max 90 minutes).
    prisma.test.deleteMany({ where: { finishedAt: null, startedAt: { lt: new Date(now - DAY_MS) } } }),
    prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: new Date(now - DAY_MS) } } }),
    prisma.telegramLogin.deleteMany({ where: { expiresAt: { lt: new Date(now - DAY_MS) } } }),
    pruneRefreshTokens(),
    prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: new Date(now - DAY_MS) } } }),
  ]);
  // Groups past their end date go to the archive.
  const finishedGroups = await archiveFinishedGroups(new Date(now));
  return { abandonedTests: abandonedTests.count, resets: resets.count, telegram: telegram.count, refreshTokens, verifications: verifications.count, finishedGroups };
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
    // Telegram reminders (missed class: now, +1 hour, next day) ride on the same 5-minute cycle.
    void processTelegramReminders().catch((e: Error) => console.error("Telegram reminders failed:", e.message));
    return expireStaleOrders().catch((e: Error) => console.error("Order expiry failed:", e.message));
  };
  void expire();
  setInterval(expire, 5 * 60 * 1000).unref();
  return timer;
};
