import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { studentService, type StudyWeek } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

/** "1 soat 20 daqiqa" / "1 ч 20 мин" from the shared hour/minute texts. */
export const formatStudyMinutes = (t: TFunction, minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${t("courses.hours", { count: h })} ${t("courses.minutes", { count: m })}`;
  return h ? t("courses.hours", { count: h }) : t("courses.minutes", { count: m });
};

/**
 * Time actually spent in lessons and tests this week (Monday–Sunday, Tashkent), per day.
 * Recorded while a lesson or test page is open (see useStudyTimer).
 */
export default function WeeklyActivityChart({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad<StudyWeek>(() => studentService.studyWeek(), []);
  const weekdays = t("schedule.weekdaysShort", { returnObjects: true }) as string[];
  const rows = (data?.days ?? []).map((d, i) => ({
    name: weekdays[i],
    date: d.date,
    lesson: d.lessonMinutes,
    test: d.testMinutes,
    isToday: d.date === data?.today,
  }));
  const empty = data !== null && data !== undefined && data.totalMinutes === 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2">
        <CardTitle>{t("progress.weeklyActivity")}</CardTitle>
        {data && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t("progress.weekTotal")}: <b className="text-slate-900 dark:text-white">{formatStudyMinutes(t, data.totalMinutes)}</b>
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <div className="relative h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} className="text-slate-500" />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} tickLine={false} axisLine={false} unit={` ${t("progress.minShort")}`} width={64} className="text-slate-500" />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.08)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid rgb(203 213 225)", fontSize: 12 }}
                    formatter={(v: number, name: string) => [formatStudyMinutes(t, v), name]}
                  />
                  <Bar dataKey="lesson" stackId="time" name={t("nav.lessons")} fill="#2563eb">
                    {rows.map((r) => <Cell key={r.date} fillOpacity={r.isToday ? 1 : 0.75} />)}
                  </Bar>
                  <Bar dataKey="test" stackId="time" name={t("nav.tests")} fill="#f59e0b" radius={[6, 6, 0, 0]}>
                    {rows.map((r) => <Cell key={r.date} fillOpacity={r.isToday ? 1 : 0.75} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {empty && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t("progress.weekEmpty")}
                </p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> {t("nav.lessons")}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> {t("nav.tests")}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
