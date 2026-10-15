import { useEffect, useState } from "react";
import { Users, BookOpen, HelpCircle, ClipboardCheck, Percent, Target } from "lucide-react";
import { adminService } from "@/services/admin.service";
import type { AdminStats } from "@/types/admin";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import StatCard from "@/components/common/StatCard";

export default function AdminDashboard() {
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
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Statistika</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5" />} label="Foydalanuvchilar" value={stats.totalUsers} />
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Kurslar / darslar" value={`${stats.totalCourses} / ${stats.totalLessons}`} />
        <StatCard icon={<HelpCircle className="h-5 w-5" />} label="Savollar" value={stats.totalQuestions} />
        <StatCard icon={<ClipboardCheck className="h-5 w-5" />} label="Yakunlangan testlar" value={stats.totalTests} />
        <StatCard icon={<Target className="h-5 w-5" />} label="O'rtacha ball" value={`${stats.averageScore}%`} />
        <StatCard icon={<Percent className="h-5 w-5" />} label="O'tish foizi" value={`${stats.passRate}%`} />
      </div>
    </div>
  );
}
