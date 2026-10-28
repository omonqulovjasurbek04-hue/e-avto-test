import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, BookOpen, CalendarRange, CheckCircle, ClipboardList, Library, Newspaper, Receipt, Repeat, ScrollText, Trophy, PlayCircle, Clock, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { lessonService } from "@/services/lesson.service";
import { userService } from "@/services/user.service";
import { resultService } from "@/services/result.service";
import { ROUTES } from "@/constants/routes";
import type { Lesson } from "@/types/lesson";
import type { ProgressStats, TestResultSummary } from "@/types/result";
import StatCard from "@/components/common/StatCard";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import GuideList from "@/components/guide/GuideList";
import WeeklyActivityChart, { formatStudyMinutes } from "@/components/common/WeeklyActivityChart";
import UpcomingSchedule from "@/components/common/UpcomingSchedule";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import AdminReports from "@/pages/admin/AdminReports";
import { can, type Permission } from "@/lib/permissions";

/** Teachers and every staff role get their own start page; students the study one. */
export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "TEACHER") return <TeacherDashboard />;
  // Staff (admins, front desk, finance, moderators) see their work here, not a student's progress.
  if (user && user.role !== "USER") return <AdminStart />;
  return <StudentDashboard />;
}

/** The staff sections, each shown to whoever holds its right (the same rights as the side menu). */
const STAFF_LINKS: { perm: Permission; to: string; label: string; icon: ReactNode }[] = [
  { perm: "groups:manage", to: "/teacher", label: "admin.nav.groups", icon: <CalendarRange className="h-5 w-5" /> },
  { perm: "groups:manage", to: "/mistakes", label: "nav.knowledge", icon: <Repeat className="h-5 w-5" /> },
  { perm: "users:manage", to: "/users", label: "admin.nav.users", icon: <Users className="h-5 w-5" /> },
  { perm: "catalog:manage", to: "/my-courses", label: "nav.courses", icon: <Library className="h-5 w-5" /> },
  { perm: "tickets:edit", to: "/tests", label: "nav.tests", icon: <CheckCircle className="h-5 w-5" /> },
  { perm: "orders:read", to: "/revenue", label: "admin.nav.orders", icon: <Receipt className="h-5 w-5" /> },
  { perm: "content:manage", to: "/site-content", label: "admin.nav.cms", icon: <Newspaper className="h-5 w-5" /> },
  { perm: "tests:manage", to: "/exam-settings", label: "admin.nav.exam", icon: <ClipboardList className="h-5 w-5" /> },
  { perm: "audit:read", to: "/audit", label: "admin.nav.audit", icon: <ScrollText className="h-5 w-5" /> },
  { perm: "settings:manage", to: "/system", label: "admin.nav.system", icon: <Activity className="h-5 w-5" /> },
];

function AdminStart() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="container-page py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {/* Staff are greeted by their role, the same word as the badge in the top bar; the name is underneath. */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("dashboard.greeting", { name: user?.role ? t(`roles.${user.role}`, user.role) : user?.name ?? "" })}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {user?.name ? `${user.name} · ` : ""}
            {can(user?.role, "users:manage") ? t("dashboard.adminSubtitle") : t("dashboard.staffSubtitle")}
          </p>
        </div>
      </motion.div>
      {/* One click to each section this role works in. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAFF_LINKS.filter((l) => can(user?.role, l.perm)).map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{l.icon}</span>
            {t(l.label)}
          </Link>
        ))}
      </div>
      {can(user?.role, "users:manage") && (
        <div className="mt-6">
          <AdminStatsGrid />
        </div>
      )}
      {/* Test results and teacher load by period, right under the totals. */}
      {can(user?.role, "reports:read") && (
        <div className="mt-10">
          <AdminReports />
        </div>
      )}
    </div>
  );
}

function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [progress, res, ls] = await Promise.all([
        userService.getProgressStats(),
        resultService.list(),
        lessonService.getLessons(),
      ]);
      setStats(progress);
      setResults(res);
      setLessons(ls);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // The next lesson to study: open (bought and already unlocked) and not finished yet.
  const continueLearning = lessons.find((l) => !l.locked && !l.completed) ?? lessons.find((l) => !l.locked);

  return (
    <div className="container-page py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("dashboard.greeting", { name: user?.name ?? "foydalanuvchi" })}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("dashboard.subtitle")}
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState onRetry={load} />
        </div>
      ) : (
        <>
          {/* Progress at a glance (the former "Rivojlanish" page lives here now). */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label={t("dashboard.stats.progress")}
              value={`${Math.round(stats?.progressPct ?? 0)}%`}
              icon={<Trophy className="h-6 w-6" />}
              color="brand"
            />
            <StatCard
              label={t("dashboard.stats.completedLessons")}
              value={stats?.completedLessons ?? 0}
              icon={<CheckCircle className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              label={t("dashboard.stats.completedTests")}
              value={results.length}
              icon={<ClipboardList className="h-6 w-6" />}
              color="amber"
            />
            <StatCard
              label={t("dashboard.stats.avgScore")}
              value={`${Math.round(stats?.avgScore ?? 0)}%`}
              icon={<BookOpen className="h-6 w-6" />}
              color="slate"
            />
            <StatCard
              label={t("progress.studyTime")}
              value={formatStudyMinutes(t, stats?.learningMinutes ?? 0)}
              icon={<Clock className="h-6 w-6" />}
              color="brand"
            />
          </div>

          {/* Class timetable and weekly activity side by side on wide screens. */}
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <UpcomingSchedule />
            <WeeklyActivityChart />
          </div>

          {continueLearning && (
            <Card className="mt-8">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {t("dashboard.continueLearning.title")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{continueLearning.title}</p>
                </div>
                <Link
                  to={ROUTES.lessonDetails(continueLearning.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <PlayCircle className="h-5 w-5" /> {t("dashboard.continueLearning.button")}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Always-open guides about the site (instead of course lessons that may still be locked). */}
          <section className="mt-8" aria-labelledby="guide-title">
            <h2 id="guide-title" className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t("guide.section")}
            </h2>
            <p className="mb-4 text-sm text-slate-500">{t("guide.sectionHint")}</p>
            <GuideList />
          </section>
        </>
      )}
    </div>
  );
}
