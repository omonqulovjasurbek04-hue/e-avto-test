import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LogOut, Monitor, MonitorSmartphone, Smartphone, Tablet } from "lucide-react";
import { authService, type ConnectedDevice } from "@/services/auth.service";
import { useLoad } from "@/hooks/useLoad";
import { useAuthStore } from "@/store/auth.store";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet } as const;

// 26.10.2026 19:14 — the same in every language (browsers render "uz-UZ" dates as "2026 M10 26").
const when = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Devices signed in to this account: this one first, the others below with a sign-out each. */
export function ConnectedDevices() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { data, loading, error, reload } = useLoad(() => authService.devices(), []);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);


  const signOut = async (device: ConnectedDevice) => {
    setBusy(device.id);
    try {
      const { current } = await authService.signOutDevice(device.id);
      if (current) {
        await logout();
        navigate(ROUTES.login);
        return;
      }
      toast.success(t("devices.signedOut"));
      await reload();
    } catch {
      toast.error(t("security.error"));
    } finally {
      setBusy(null);
    }
  };

  const signOutOthers = async () => {
    setConfirmOthers(false);
    setBusy("others");
    try {
      await authService.signOutOtherDevices();
      toast.success(t("devices.othersSignedOut"));
      await reload();
    } catch {
      toast.error(t("security.error"));
    } finally {
      setBusy(null);
    }
  };

  const others = data?.filter((d) => !d.current).length ?? 0;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <MonitorSmartphone className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("devices.title")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{t("devices.description")}</p>
      </div>

      {loading && !data ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <ul className="space-y-3">
          {data.map((d) => {
            const Icon = ICON[d.type];
            return (
              <li
                key={d.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4",
                  d.current ? "border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/10" : "border-slate-200 dark:border-slate-800"
                )}
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", d.current ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                    {[d.browser, d.os].filter(Boolean).join(" · ")}
                    {d.current && <Badge variant="success">{t("devices.current")}</Badge>}
                  </p>
                  <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-xs text-slate-500 sm:grid-cols-2">
                    <div>
                      <dt className="inline">{t("devices.type")}: </dt>
                      <dd className="inline">{t(`devices.types.${d.type}`)}</dd>
                    </div>
                    {d.ip && (
                      <div>
                        <dt className="inline">{t("devices.ip")}: </dt>
                        <dd className="inline font-mono">{d.ip}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="inline">{t("devices.signedInAt")}: </dt>
                      <dd className="inline">{when(d.signedInAt)}</dd>
                    </div>
                    <div>
                      <dt className="inline">{t("devices.lastActiveAt")}: </dt>
                      <dd className="inline">{when(d.lastActiveAt)}</dd>
                    </div>
                  </dl>
                </div>
                {!d.current && (
                  <Button variant="outline" size="sm" loading={busy === d.id} onClick={() => void signOut(d)} aria-label={t("devices.signOut")}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="outline" disabled={others === 0} loading={busy === "others"} onClick={() => setConfirmOthers(true)}>
        {t("devices.signOutOthers")}
      </Button>
      <ConfirmDialog
        isOpen={confirmOthers}
        message={t("devices.signOutOthersConfirm")}
        confirmText={t("devices.signOutOthers")}
        onConfirm={() => void signOutOthers()}
        onCancel={() => setConfirmOthers(false)}
      />
    </section>
  );
}
