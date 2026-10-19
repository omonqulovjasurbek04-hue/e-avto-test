import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { studentService, type NotificationPrefs } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Select } from "@/components/ui/Select";
import { SUPPORTED_LANGUAGES } from "@/i18n";

// No e-mail switch: the platform contacts students by phone and Telegram only.
type SwitchKey = "inApp" | "attendance";
const KEYS: SwitchKey[] = ["inApp", "attendance"];

/** Real, saved preferences (each switch is stored on the server the moment it is changed). */
export default function NotificationPreferences() {
  const { t } = useTranslation();
  const { data, loading, error, reload, setData } = useLoad(() => studentService.preferences(), []);
  const [busy, setBusy] = useState<string | null>(null);

  const save = async <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
    if (!data) return;
    setBusy(key);
    const previous = data;
    setData({ ...data, [key]: value });
    try {
      setData(await studentService.savePreferences({ [key]: value }));
    } catch (e) {
      setData(previous);
      toast.error(e instanceof Error ? e.message : t("notifications.prefs.saveError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Bell className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("notifications.prefs.title")}
        </CardTitle>
        <CardDescription>{t("notifications.prefs.saved")}</CardDescription>
      </CardHeader>
      <CardContent className="max-w-xl space-y-3">
        {loading && !data ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : error || !data ? (
          <ErrorState message={error ?? t("notifications.prefs.loadError")} onRetry={reload} />
        ) : (
          <>
          {KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
              <span>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{t(`notifications.prefs.${key}`)}</span>
                <span className="block text-xs text-slate-500">{t(`notifications.prefs.${key}Desc`)}</span>
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 rounded accent-brand-600"
                checked={data[key]}
                disabled={busy === key}
                onChange={(e) => void save(key, e.target.checked)}
              />
            </label>
          ))}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <Select
              label={t("notifications.prefs.language")}
              options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
              value={data.language}
              disabled={busy === "language"}
              onChange={(e) => void save("language", e.target.value as NotificationPrefs["language"])}
            />
            <p className="mt-2 text-xs text-slate-500">{t("notifications.prefs.languageDesc")}</p>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
