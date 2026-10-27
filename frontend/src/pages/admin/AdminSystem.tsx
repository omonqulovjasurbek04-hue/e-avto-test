import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { reportService, type CheckLevel, type SystemCheck } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime } from "@/utils/money";

const ICON: Record<CheckLevel, React.ReactNode> = {
  ok: <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400" />,
  error: <XCircle className="h-5 w-5 text-red-700 dark:text-red-400" />,
};

/** One human sentence per check, built only from the non-secret details the server returns. */
function useDescribe() {
  const { t } = useTranslation();
  return (c: SystemCheck): string => {
    const d = c.detail ?? {};
    switch (c.key) {
      case "database":
        return c.level === "ok" ? t("admin.system.dbOk", { ms: d.latencyMs, count: d.applied, latest: d.latest ?? "—" }) : t("admin.system.dbError");
      case "payments":
        return !d.provider ? t("admin.system.payNone") : d.provider === "mock" ? t("admin.system.payMock") : t("admin.system.payReal", { name: d.provider });
      case "email": {
        if (!d.configured) return t("admin.system.mailOff");
        const n = (d.last7days ?? {}) as Record<string, number>;
        return t("admin.system.mailOn", { sent: n.SENT ?? 0, failed: n.FAILED ?? 0, pending: n.PENDING ?? 0 });
      }
      case "telegram":
        return d.configured ? t("admin.system.tgOn", { mode: d.mode }) : t("admin.system.tgOff");
      case "media": {
        const base = d.uploadEnabled
          ? t(d.ownSigningSecret ? "admin.system.mediaOn" : "admin.system.mediaOnNoSecret", { video: d.maxVideoMb, file: d.maxFileMb })
          : t("admin.system.mediaOff");
        return `${base} ${t(d.storage === "s3" ? "admin.system.storageS3" : "admin.system.storageLocal")}`;
      }
      case "antivirus":
        return d.configured ? t("admin.system.avOn") : t("admin.system.avOff");
      case "monitoring":
        return [
          t(d.errorTracking ? "admin.system.sentryOn" : "admin.system.sentryOff"),
          t(d.metricsEndpoint ? "admin.system.metricsOn" : "admin.system.metricsOff"),
        ].join(" ");
      case "enrollment":
        return d.enforced ? t("admin.system.enrollOn") : t("admin.system.enrollOff");
      case "rateLimit":
        if (d.store !== "redis") return t("admin.system.rateMemory");
        return d.redis === "ready" ? t("admin.system.rateRedis") : d.redis === "down" ? t("admin.system.rateRedisDown") : t("admin.system.rateRedisConnecting");
      default:
        return "";
    }
  };
}

export default function AdminSystem() {
  const { t } = useTranslation();
  const describe = useDescribe();
  const status = useLoad(() => reportService.system(), []);
  const s = status.data;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("admin.system.title")}</h1>
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} loading={status.loading} onClick={() => void status.reload()}>{t("admin.system.refresh")}</Button>
      </div>
      <p className="text-xs text-slate-500">{t("admin.system.hint")}</p>

      {status.loading && !s ? <Skeleton className="h-64 rounded-2xl" /> : status.error ? <ErrorState message={status.error} onRetry={status.reload} /> : !s ? null : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
            {s.checks.map((c) => (
              <li key={c.key} className="flex items-start gap-3 px-4 py-3" data-check={c.key} data-level={c.level}>
                <span className="mt-0.5 shrink-0">{ICON[c.level]}</span>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{t(`admin.system.check_${c.key}`)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{describe(c)}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            {t("admin.system.meta", { env: s.environment, node: s.nodeVersion, hours: Math.floor(s.uptimeSeconds / 3600), at: formatDateTime(s.checkedAt) })}
          </p>
        </>
      )}
    </div>
  );
}
