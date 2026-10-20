import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Users, Video } from "lucide-react";
import { studentService, type MyGroup, type ScheduleItem } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatTime } from "@/utils/money";
import { cn } from "@/utils/cn";

const VARIANT = { PLANNED: "primary", DONE: "success", CANCELLED: "danger" } as const;
const DOT = { PLANNED: "bg-brand-500", DONE: "bg-emerald-500", CANCELLED: "bg-red-400" } as const;

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

/**
 * The student's class timetable on the dashboard: a month calendar with the lesson days marked
 * (tap a day to see its lessons), and the student's group with its rhythm (juft/toq kunlar) and time.
 */
export default function UpcomingSchedule({ className }: { className?: string }) {
  const { t } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  // Monday-first grid that covers the whole month.
  const gridStart = useMemo(() => {
    const d = new Date(month);
    d.setDate(1 - ((d.getDay() + 6) % 7));
    return d;
  }, [month]);
  const cells = useMemo(
    () => Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)),
    [gridStart]
  );
  const visible = cells[35].getMonth() === month.getMonth() ? cells : cells.slice(0, 35);

  const groups = useLoad<MyGroup[]>(() => studentService.groups(), []);
  const slots = useLoad<ScheduleItem[]>(
    () => studentService.schedule(visible[0].toISOString(), new Date(visible[visible.length - 1].getTime() + 86_400_000).toISOString()),
    [month.getTime()]
  );

  const byDay = useMemo(() => {
    const m = new Map<string, ScheduleItem[]>();
    for (const s of slots.data ?? []) {
      const k = dayKey(new Date(s.startsAt));
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots.data]);
  const dayItems = byDay.get(dayKey(selected)) ?? [];

  const weekdays = t("schedule.weekdaysShort", { returnObjects: true }) as string[];
  const months = t("schedule.months", { returnObjects: true }) as string[];
  const rhythm = (g: MyGroup) =>
    g.days === "CUSTOM" ? g.weekdays.map((d) => weekdays[d - 1]).join(", ") : t(`schedule.days.${g.days}`);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-600" /> {t("schedule.title")}
        </CardTitle>
        {/* Only for students an admin has put into a group: name · juft/toq kunlar · time. */}
        {groups.data && groups.data.length > 0 && (
          <div className="flex flex-col items-end gap-1.5">
            {groups.data.map((g) => (
              <span
                key={g.id}
                className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl bg-brand-50 px-3 py-1.5 text-sm text-brand-800 dark:bg-brand-950/50 dark:text-brand-200"
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{g.name}</span>
                <span aria-hidden="true">·</span>
                <span>{rhythm(g)}</span>
                {g.time && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="h-3.5 w-3.5" />{g.time}</span>
                  </>
                )}
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label={t("schedule.prevMonth")}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="font-semibold text-slate-900 dark:text-white">
            {months[month.getMonth()]} {month.getFullYear()}
          </p>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={t("schedule.nextMonth")}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {slots.error ? (
          <ErrorState message={slots.error} onRetry={slots.reload} />
        ) : (
          <div role="grid" className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((w) => (
              <div key={w} role="columnheader" className="pb-1 text-xs font-semibold uppercase text-slate-400">
                {w}
              </div>
            ))}
            {visible.map((d) => {
              const items = byDay.get(dayKey(d)) ?? [];
              const inMonth = d.getMonth() === month.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selected);
              return (
                <button
                  key={dayKey(d)}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${d.getDate()} ${months[d.getMonth()]}${items.length ? ` — ${t("schedule.lessonsCount", { count: items.length })}` : ""}`}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "relative flex h-11 flex-col items-center justify-center rounded-xl text-sm transition",
                    inMonth ? "text-slate-800 dark:text-slate-100" : "text-slate-300 dark:text-slate-600",
                    isSelected
                      ? "bg-brand-600 font-bold text-white dark:text-white"
                      : isToday
                        ? "font-bold ring-2 ring-inset ring-brand-500"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {d.getDate()}
                  {items.length > 0 && (
                    <span className="absolute bottom-1.5 flex gap-0.5">
                      {items.slice(0, 3).map((s) => (
                        <span key={s.id} className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-white" : DOT[s.status])} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Lessons of the chosen day. */}
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {sameDay(selected, today) ? t("schedule.today") : `${selected.getDate()} ${months[selected.getMonth()]}`}
          </p>
          {slots.loading && !slots.data ? (
            <Skeleton className="h-12 rounded-xl" />
          ) : dayItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("schedule.noLessonsDay")}</p>
          ) : (
            <ul className="space-y-2">
              {dayItems.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {s.topic || t("schedule.lesson")} · {s.group.name}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-600 dark:text-slate-400">
                      <span className="tabular-nums">{formatTime(s.startsAt)} – {formatTime(s.endsAt)}</span>
                      {s.room && (
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.room}</span>
                      )}
                      {s.onlineUrl && (
                        <a className="inline-flex items-center gap-1 text-brand-600 underline dark:text-brand-400" href={s.onlineUrl} target="_blank" rel="noopener noreferrer">
                          <Video className="h-3.5 w-3.5" /> {t("schedule.online")}
                        </a>
                      )}
                    </p>
                  </div>
                  <Badge variant={VARIANT[s.status]}>{t(`schedule.status.${s.status}`)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
