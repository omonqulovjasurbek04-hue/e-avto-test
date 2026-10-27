import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CalendarClock, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, MapPin, Percent, Users, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { teacherService } from "@/services/platform.service";
import StatCard from "@/components/common/StatCard";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const TZ = "Asia/Tashkent";
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
// 27.10 (Du) — the same in every language: the browser's Uzbek date names are unreliable.
const day = (iso: string, weekdays: string[]) => {
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: TZ }));
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} (${weekdays[d.getDay()]})`;
};

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
/** "in 25 min" / "today" / "tomorrow" / "28.10 (Ch)": how soon the lesson starts. */
const when = (iso: string, t: (k: string, o?: Record<string, unknown>) => string, weekdays: string[]) => {
  const start = new Date(iso);
  const minutes = Math.round((start.getTime() - Date.now()) / 60_000);
  if (minutes < 60) return t("teacherDash.inMinutes", { count: Math.max(0, minutes) });
  if (dayKey(start) === dayKey(new Date())) return t("teacherDash.todayAt", { time: time(iso) });
  if (dayKey(start) === dayKey(new Date(Date.now() + 86_400_000))) return t("teacherDash.tomorrowAt", { time: time(iso) });
  return `${day(iso, weekdays)} · ${time(iso)}`;
};

/** The teacher's start page: their groups and students, today's work and what still needs attendance. */
export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, loading, error, reload } = useLoad(() => teacherService.overview(), []);
  const weekdays = t("teacherDash.weekdays").split(",");

  return (
    <div className="container-page py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("dashboard.greeting", { name: user?.name ?? "" })}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("teacherDash.subtitle")}</p>
      </motion.div>

      {loading && !data ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error || !data ? (
        <div className="mt-6">
          <ErrorState message={error ?? undefined} onRetry={reload} />
        </div>
      ) : (
        <>
          {/* First thing to do: lessons that took place but still have no attendance. */}
          {data.unmarked.length === 0 ? (
            // Nothing to catch up on: a slim line instead of a whole card.
            <p className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> {t("teacherDash.allMarked")}
            </p>
          ) : (
          <Card className="mt-6 border-amber-200 dark:border-amber-500/30">
            <CardContent>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                <AlertCircle className="h-5 w-5 text-amber-500" /> {t("teacherDash.unmarkedTitle")}
              </h2>
                <ul className="space-y-2">
                  {data.unmarked.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/teacher/groups/${s.group.id}?attendance=${s.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{s.group.name}</span>
                          <span className="text-xs text-slate-500">
                            {day(s.startsAt, weekdays)} · {time(s.startsAt)}
                            {s.topic ? ` · ${s.topic}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-amber-700 dark:text-amber-300">{t("teacherDash.mark")} →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
            </CardContent>
          </Card>
          )}

          {/* The next lesson, with the actions a teacher needs right before class. */}
          {data.next[0] ? (
            <Card className="mt-6 overflow-hidden border-brand-200 bg-gradient-to-r from-brand-600 to-brand-500 text-white dark:border-brand-500/30">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-100">{t("teacherDash.nextLesson")}</p>
                  <p className="mt-1 text-2xl font-bold">{when(data.next[0].startsAt, t, weekdays)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-50">
                    <span className="font-semibold">{data.next[0].group.name}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" aria-hidden /> {t("teacherDash.studentsCount", { count: data.next[0].group.students })}
                    </span>
                    {data.next[0].room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" aria-hidden /> {data.next[0].room}
                      </span>
                    )}
                    {data.next[0].topic && <span>· {data.next[0].topic}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    to={`/teacher/groups/${data.next[0].group.id}?attendance=${data.next[0].id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                  >
                    <ClipboardCheck className="h-4 w-4" aria-hidden /> {t("teacherDash.takeAttendance")}
                  </Link>
                  <Link
                    to={`/teacher/groups/${data.next[0].group.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {t("teacherDash.openGroup")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-300">{t("teacherDash.noNextHint")}</p>
                <Link to="/teacher?new=1" className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  {t("groupForm.open")} →
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard label={t("teacherDash.groups")} value={data.groups} icon={<UsersRound className="h-6 w-6" />} color="brand" />
            <StatCard label={t("teacherDash.students")} value={data.students} icon={<Users className="h-6 w-6" />} color="green" />
            <StatCard label={t("teacherDash.today")} value={data.lessonsToday} icon={<CalendarClock className="h-6 w-6" />} color="amber" />
            <StatCard label={t("teacherDash.week")} value={data.lessonsThisWeek} icon={<CalendarDays className="h-6 w-6" />} color="slate" />
            <StatCard
              label={t("teacherDash.attendance")}
              value={data.attendanceRate === null ? "—" : `${data.attendanceRate}%`}
              icon={<Percent className="h-6 w-6" />}
              color="brand"
            />
          </div>

          <div className="mt-8">
            {/* What is coming next. */}
            <Card>
              <CardContent>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                    <CalendarClock className="h-5 w-5 text-brand-600" /> {t("teacherDash.nextTitle")}
                  </h2>
                  <Link to="/teacher" className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                    {t("teacherDash.allGroups")} →
                  </Link>
                </div>
                {data.next.length <= 1 ? (
                  <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/60">{t("teacherDash.noNext")}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.next.slice(1).map((s) => (
                      <li key={s.id}>
                        <Link to={`/teacher/groups/${s.group.id}`} className="flex items-center gap-4 py-3 transition hover:opacity-80">
                          <span className="w-20 shrink-0 text-center">
                            <span className="block text-lg font-bold text-slate-900 dark:text-white">{time(s.startsAt)}</span>
                            <span className="block text-xs text-slate-500">{day(s.startsAt, weekdays)}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{s.group.name}</span>
                            <span className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                              {s.topic && <span className="truncate">{s.topic}</span>}
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" aria-hidden /> {t("teacherDash.studentsCount", { count: s.group.students })}
                              </span>
                              {s.room && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {s.room}
                                </span>
                              )}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

          </div>
        </>
      )}
    </div>
  );
}
