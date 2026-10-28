import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, BookOpen, HelpCircle, ClipboardCheck, Percent, Target, GraduationCap } from "lucide-react";
import { adminService } from "@/services/admin.service";
import type { AdminStats } from "@/types/admin";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import StatCard from "@/components/common/StatCard";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "@/types/user";

const ROLE_ORDER: UserRole[] = ["USER", "TEACHER", "MODERATOR", "FINANCE", "MANAGER", "ADMIN", "SUPERADMIN"];

/** The platform's numbers (users, courses, questions, tests, scores), shown on an admin's start page. */
export function AdminStatsGrid() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminService
      .getStatistics()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error || !stats) return <ErrorState message={error ?? undefined} onRetry={load} />;

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5" />} label={t("admin.dashboard.users")} value={stats.totalUsers} />
        {stats.totalStudents !== undefined && (
          <StatCard icon={<GraduationCap className="h-5 w-5" />} label={t("admin.dashboard.students")} value={stats.totalStudents} />
        )}
        <StatCard icon={<BookOpen className="h-5 w-5" />} label={t("admin.dashboard.coursesLessons")} value={`${stats.totalCourses} / ${stats.totalLessons}`} />
        <StatCard icon={<HelpCircle className="h-5 w-5" />} label={t("admin.dashboard.questions")} value={stats.totalQuestions} />
        <StatCard icon={<ClipboardCheck className="h-5 w-5" />} label={t("admin.dashboard.tests")} value={stats.totalTests} />
        <StatCard icon={<Target className="h-5 w-5" />} label={t("admin.dashboard.avgScore")} value={`${stats.averageScore}%`} />
        <StatCard icon={<Percent className="h-5 w-5" />} label={t("admin.dashboard.passRate")} value={`${stats.passRate}%`} />
    </div>
    {/* Accounts per role; a role opens the users list filtered to it. */}
    {stats.byRole && (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("admin.dashboard.byRole")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {ROLE_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => navigate("/users", { state: { role: r } })}
              className="rounded-xl bg-slate-50 px-3 py-2.5 text-left transition hover:bg-brand-50 hover:ring-1 hover:ring-brand-300 dark:bg-slate-800/60 dark:hover:bg-brand-500/10"
            >
              <span className="block text-xl font-bold text-slate-900 dark:text-white">{stats.byRole![r] ?? 0}</span>
              <span className="block truncate text-xs text-slate-500">{t(`roles.${r}`)}</span>
            </button>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}
