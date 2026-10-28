import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ReactNode } from "react";
import { BookOpen, CalendarRange, ClipboardCheck, Crown, GraduationCap, HelpCircle, PenLine, Percent, School, ShieldCheck, Target, UserRound, Users, Wallet } from "lucide-react";
import { adminService } from "@/services/admin.service";
import type { AdminStats } from "@/types/admin";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import StatCard from "@/components/common/StatCard";

type StatColor = "brand" | "green" | "amber" | "red" | "slate";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "@/types/user";


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

  // Accounts by what they are: students (bought a course) and plain users (only signed up) apart, then each
  // staff role. A card opens the users list filtered to exactly those accounts.
  const roleCards: { key: string; label: string; value: number; icon: ReactNode; color: StatColor; filter: { role: UserRole; kind?: "student" | "user" } }[] = stats.byRole
    ? [
        { key: "students", label: t("admin.dashboard.cards.students"), value: stats.studentUsers ?? 0, icon: <GraduationCap className="h-5 w-5" />, color: "green", filter: { role: "USER", kind: "student" } },
        { key: "users", label: t("admin.dashboard.cards.users"), value: (stats.byRole.USER ?? 0) - (stats.studentUsers ?? 0), icon: <UserRound className="h-5 w-5" />, color: "slate", filter: { role: "USER", kind: "user" } },
        { key: "TEACHER", label: t("admin.dashboard.cards.TEACHER"), value: stats.byRole.TEACHER ?? 0, icon: <School className="h-5 w-5" />, color: "brand", filter: { role: "TEACHER" } },
        { key: "MODERATOR", label: t("admin.dashboard.cards.MODERATOR"), value: stats.byRole.MODERATOR ?? 0, icon: <PenLine className="h-5 w-5" />, color: "amber", filter: { role: "MODERATOR" } },
        { key: "FINANCE", label: t("admin.dashboard.cards.FINANCE"), value: stats.byRole.FINANCE ?? 0, icon: <Wallet className="h-5 w-5" />, color: "green", filter: { role: "FINANCE" } },
        { key: "MANAGER", label: t("admin.dashboard.cards.MANAGER"), value: stats.byRole.MANAGER ?? 0, icon: <CalendarRange className="h-5 w-5" />, color: "brand", filter: { role: "MANAGER" } },
        { key: "ADMIN", label: t("admin.dashboard.cards.ADMIN"), value: stats.byRole.ADMIN ?? 0, icon: <ShieldCheck className="h-5 w-5" />, color: "amber", filter: { role: "ADMIN" } },
        { key: "SUPERADMIN", label: t("admin.dashboard.cards.SUPERADMIN"), value: stats.byRole.SUPERADMIN ?? 0, icon: <Crown className="h-5 w-5" />, color: "red", filter: { role: "SUPERADMIN" } },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5" />} label={t("admin.dashboard.users")} value={stats.totalUsers} />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label={t("admin.dashboard.coursesLessons")} value={`${stats.totalCourses} / ${stats.totalLessons}`} />
        <StatCard icon={<HelpCircle className="h-5 w-5" />} label={t("admin.dashboard.questions")} value={stats.totalQuestions} />
        <StatCard icon={<ClipboardCheck className="h-5 w-5" />} label={t("admin.dashboard.tests")} value={stats.totalTests} />
        <StatCard icon={<Target className="h-5 w-5" />} label={t("admin.dashboard.avgScore")} value={`${stats.averageScore}%`} />
        <StatCard icon={<Percent className="h-5 w-5" />} label={t("admin.dashboard.passRate")} value={`${stats.passRate}%`} />
      </div>

      {roleCards.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{t("admin.dashboard.byRole")}</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {roleCards.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => navigate("/users", { state: c.filter })}
                className="rounded-2xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <StatCard icon={c.icon} label={c.label} value={c.value} color={c.color} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
