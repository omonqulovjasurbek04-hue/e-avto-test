import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, ClipboardList, Trophy, PlayCircle, Clock, LayoutDashboard } from "lucide-react";
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
import { Button } from "@/components/ui/Button";
import { can } from "@/lib/permissions";

/** Teachers and admins get their own start page; everyone else the student one. */
export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "TEACHER") return <TeacherDashboard />;
  // Whoever may read the platform statistics sees them here instead of a student's progress.
  if (can(user?.role, "users:manage")) return <AdminStart />;
  return <StudentDashboard />;
}

function AdminStart() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="container-page py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("dashboard.greeting", { name: user?.name ?? "" })}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("dashboard.adminSubtitle")}</p>
        </div>
        <Link to="/admin">
          <Button variant="outline" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
            {t("dashboard.openAdmin")}
          </Button>
        </Link>
      </motion.div>
      <div className="mt-6">
        <AdminStatsGrid />
      </div>
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
