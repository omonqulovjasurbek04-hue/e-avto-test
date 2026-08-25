import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, BookCheck, Clock, Target, Award } from "lucide-react";
import { userService } from "@/services/user.service";
import type { ProgressStats } from "@/types/result";
import StatCard from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatMinutesToDuration } from "@/utils/formatTime";

export default function Progress() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    userService
      .getProgressStats()
      .then((data) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="container-page py-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-8">
        <ErrorState onRetry={load} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container-page py-8">
        <EmptyState title="Statistika mavjud emas" />
      </div>
    );
  }

  const chartData = stats.weekly.map((w) => ({
    name: w.date,
    count: w.count,
  }));

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
          <TrendingUp className="h-6 w-6 text-brand-600" />
          Statistika va Bilim
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          O'quv jarayoni bo'yicha shaxsiy ko'rsatkichlaringiz.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="O'rtacha ball"
          value={`${Math.round(stats.avgScore)}%`}
          icon={<Award className="h-6 w-6" />}
          color="brand"
        />
        <StatCard
          label="Bajarilgan dars"
          value={stats.completedLessons}
          icon={<BookCheck className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          label="O'qish vaqti"
          value={formatMinutesToDuration(stats.learningMinutes)}
          icon={<Clock className="h-6 w-6" />}
          color="amber"
        />
        <StatCard
          label="Umumiy jarayon"
          value={`${Math.round(stats.progressPct)}%`}
          icon={<Target className="h-6 w-6" />}
          color="slate"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Haftalik faollik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="text-slate-500"
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="text-slate-500" />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.08)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgb(203 213 225)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" name="Testlar" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
