import { prisma } from "../config/database";
import { env } from "../config/env";
import { activeProvider } from "../lib/payments";
import { isMailConfigured } from "./mail.service";
import { redisStatus } from "../lib/redis";
import { errorTrackingEnabled } from "../lib/monitoring";
import { antivirusEnabled } from "../lib/media/antivirus";

export type CheckLevel = "ok" | "warning" | "error";
export interface Check { key: string; level: CheckLevel; detail?: Record<string, unknown> }

/**
 * Integration status for administrators. Reports only whether something is configured and how it
 * behaves — never hosts, tokens, secrets or connection strings.
 */
export const systemStatus = async () => {
  const checks: Check[] = [];

  const t0 = Date.now();
  let migrations: { applied: number; latest: string | null } = { applied: 0, latest: null };
  try {
    await prisma.$queryRaw`SELECT 1`;
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC`;
    migrations = { applied: rows.length, latest: rows[0]?.migration_name ?? null };
    checks.push({ key: "database", level: "ok", detail: { latencyMs: Date.now() - t0, ...migrations } });
  } catch {
    checks.push({ key: "database", level: "error" });
  }

  const provider = activeProvider();
  checks.push({
    key: "payments",
    level: !provider ? "error" : env.PAYMENT_PROVIDER === "mock" ? "warning" : "ok",
    detail: { provider: provider ? env.PAYMENT_PROVIDER : null },
  });

  const since = new Date(Date.now() - 7 * 86_400_000);
  const email = await prisma.notification.groupBy({ by: ["emailStatus"], where: { createdAt: { gte: since }, emailStatus: { not: "NONE" } }, _count: { _all: true } });
  const emailCounts = Object.fromEntries(email.map((e) => [e.emailStatus, e._count._all]));
  checks.push({
    key: "email",
    level: !isMailConfigured() ? "warning" : (emailCounts.FAILED ?? 0) > 0 ? "warning" : "ok",
    detail: { configured: isMailConfigured(), last7days: emailCounts },
  });

  checks.push({
    key: "telegram",
    level: env.TELEGRAM_BOT_TOKEN ? "ok" : "warning",
    detail: { configured: Boolean(env.TELEGRAM_BOT_TOKEN), mode: env.TELEGRAM_BOT_TOKEN ? (env.TELEGRAM_WEBHOOK_SECRET ? "webhook" : "polling") : null },
  });

  checks.push({
    key: "media",
    level: env.MEDIA_UPLOAD_ENABLED && !env.MEDIA_SIGNING_SECRET ? "warning" : "ok",
    detail: { uploadEnabled: env.MEDIA_UPLOAD_ENABLED, ownSigningSecret: Boolean(env.MEDIA_SIGNING_SECRET), maxVideoMb: env.MAX_VIDEO_MB, maxFileMb: env.MAX_FILE_MB, maxImageMb: env.MAX_IMAGE_MB, storage: env.STORAGE_DRIVER },
  });

  // Uploads (videos, files, CMS images) without a scanner are stored unchecked.
  checks.push({ key: "antivirus", level: antivirusEnabled() ? "ok" : "warning", detail: { configured: antivirusEnabled() } });

  checks.push({ key: "enrollment", level: env.ENFORCE_ENROLLMENT ? "ok" : "warning", detail: { enforced: env.ENFORCE_ENROLLMENT } });
  // Without Redis the counters live in process memory: fine for one server, not shared across several.
  const redis = redisStatus();
  checks.push({ key: "rateLimit", level: redis === "down" ? "error" : redis === "connecting" ? "warning" : "ok", detail: { store: redis === "disabled" ? "memory" : "redis", redis } });

  checks.push({ key: "monitoring", level: errorTrackingEnabled() ? "ok" : "warning", detail: { errorTracking: errorTrackingEnabled(), metricsEndpoint: Boolean(env.METRICS_TOKEN) } });

  return {
    environment: env.NODE_ENV,
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    checkedAt: new Date(),
    checks,
  };
};
