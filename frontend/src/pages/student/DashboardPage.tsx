import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { resultService } from "../../services/result.service";
import { ProgressSummary, TestResult } from "../../types/result";
import { Card, CardContent, Button, Badge, CircularProgress, Spinner } from "../../components/ui";
import {
  Car,
  CheckCircle2,
  Clock,
  Trophy,
  Flame,
  ArrowRight,
  PlayCircle,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Award,
} from "lucide-react";
import { formatDate } from "../../utils/formatDate";

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ProgressSummary | null>(null);
  const [recentResults, setRecentResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      const [summary, results] = await Promise.all([
        resultService.getProgressSummary(),
        resultService.getUserResults(),
      ]);
      setStats(summary);
      setRecentResults(results);
      setIsLoading(false);
    };
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-brand-500/15">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Flame className="h-4 w-4 text-amber-300" />
              <span>7 kunlik ketma-ket o'rganish (Streak)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Salom, {user?.name || "Bo'lajak haydovchi"}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
              Bugungi maqsadingiz: 20 talik davlat testini ishlash va kamida 18 ball to'plash.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/tests">
              <Button size="lg" variant="accent" className="font-bold shadow-lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Imtihonni Boshlash
              </Button>
            </Link>
            <Link to="/lessons">
              <Button size="lg" variant="secondary">
                Darslarga o'tish
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Umumiy O'tish Ko'rsatkichi</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats?.overallPassRate || 86}%
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Yaxshi natija!
            </span>
          </div>
          <CircularProgress percentage={stats?.overallPassRate || 86} size={60} strokeWidth={6} />
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Topshirilgan Testlar</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats?.totalTestsTaken || 28} ta
            </h3>
            <span className="text-[11px] text-slate-500">24 ta muvaffaqiyatli</span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">O'rtacha Vaqt</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              12 daq
            </h3>
            <span className="text-[11px] text-slate-500">20 daqiqa limitdan</span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Reytingdagi O'rningiz</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              #3 o'rin
            </h3>
            <span className="text-[11px] text-purple-600 font-semibold">Top 5% o'quvchi</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Recent Activity & Topic Strengths */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Results */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              So'nggi Topshirilgan Testlar
            </h3>
            <Link to="/history" className="text-xs font-semibold text-brand-600 hover:underline">
              Barchasini ko'rish
            </Link>
          </div>

          <div className="space-y-3">
            {recentResults.map((res) => (
              <Card key={res.id} className="p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs ${
                      res.isPassed
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {res.scorePercentage}%
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {res.mode === "EXAM_20" ? "20 talik Davlat Imtihoni" : res.lessonTitle || "Mavzuli Test"}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {res.correctAnswersCount}/{res.totalQuestions} to'g'ri · {formatDate(res.completedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={res.isPassed ? "success" : "danger"}>
                    {res.isPassed ? "O'tdi" : "Yiqildi"}
                  </Badge>
                  <Link to={`/tests/${res.id}/review`}>
                    <Button size="sm" variant="ghost">
                      Tahlil
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Category Strength Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Mavzular Bo'yicha Bilim Darajasi
          </h3>

          <Card className="p-5 space-y-4">
            {stats?.categoryStrengths.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{item.category}</span>
                  <span
                    className={
                      item.accuracyPercentage >= 90
                        ? "text-emerald-600 dark:text-emerald-400"
                        : item.accuracyPercentage >= 80
                        ? "text-amber-500"
                        : "text-red-500"
                    }
                  >
                    {item.accuracyPercentage}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      item.accuracyPercentage >= 90
                        ? "bg-emerald-500"
                        : item.accuracyPercentage >= 80
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${item.accuracyPercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};
