import { useTranslation } from "react-i18next";
import { studentService, type ScheduleItem } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime, formatTime } from "@/utils/money";

const VARIANT = { PLANNED: "primary", DONE: "success", CANCELLED: "danger" } as const;

export default function Schedule() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad<ScheduleItem[]>(() => {
    const from = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const to = new Date(Date.now() + 60 * 86_400_000).toISOString();
    return studentService.schedule(from, to);
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{t("schedule.title")}</h1>
      <p className="mb-6 text-xs text-slate-500">{t("schedule.tz")}</p>
      {loading && !data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState title={t("schedule.emptyTitle")} description={t("schedule.emptyDesc")} />
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {s.topic || t("schedule.lesson")} · {s.group.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {formatDateTime(s.startsAt)} – {formatTime(s.endsAt)}
                    {s.room ? ` · ${s.room}` : ""}
                  </p>
                  {s.onlineUrl && (
                    <a className="text-sm text-primary-600 underline" href={s.onlineUrl} target="_blank" rel="noopener noreferrer">
                      {t("schedule.online")}
                    </a>
                  )}
                </div>
                <Badge variant={VARIANT[s.status]}>{t(`schedule.status.${s.status}`)}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
