import { useTranslation } from "react-i18next";
import { studentService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime } from "@/utils/money";
import { ATTENDANCE_VARIANT } from "@/constants/attendance";

export default function Attendance() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => studentService.attendance(), []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">{t("attendance.title")}</h1>
      {loading && !data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.records.length === 0 ? (
        <EmptyState title={t("attendance.emptyTitle")} description={t("attendance.emptyDesc")} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("attendance.percent")} value={data.summary.percent === null ? "—" : `${data.summary.percent}%`} />
            <Stat label={t("attendance.attended")} value={data.summary.present + data.summary.late + data.summary.online} />
            <Stat label={t("attendance.absent")} value={data.summary.absent} />
            <Stat label={t("attendance.excused")} value={data.summary.excused} />
          </div>
          <div className="space-y-2">
            {data.records.map((r, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {r.session.slot.topic || t("attendance.lesson")} · {r.session.slot.group.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(r.session.slot.startsAt)}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                  </div>
                  <Badge variant={ATTENDANCE_VARIANT[r.status]}>{t(`attendance.status.${r.status}`)}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}
