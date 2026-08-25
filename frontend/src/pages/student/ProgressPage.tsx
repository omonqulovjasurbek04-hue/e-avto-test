import React, { useEffect, useState } from "react";
import { resultService } from "../../services/result.service";
import { ProgressSummary } from "../../types/result";
import { Card, CardContent, Badge, Spinner } from "../../components/ui";
import { TrendingUp, Target, Award, CheckCircle2, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export const ProgressPage: React.FC = () => {
  const [stats, setStats] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const data = await resultService.getProgressSummary();
      setStats(data);
      setIsLoading(false);
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Bilim Darajasi & Statistika
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          O'zlashtirish dinamikasi va mavzular bo'yicha kuchli/zaif tomonlaringiz
        </p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 space-y-1">
          <span className="text-xs font-semibold text-slate-500">Jami Yechilgan Savollar</span>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalQuestionsSolved} ta
          </h3>
          <span className="text-xs text-emerald-600 font-medium">92% to'g'ri ko'rsatkich</span>
        </Card>

        <Card className="p-6 space-y-1">
          <span className="text-xs font-semibold text-slate-500">O'rtacha Imtihon Bali</span>
          <h3 className="text-3xl font-black text-brand-600 dark:text-brand-400">
            {stats.overallPassRate}%
          </h3>
          <span className="text-xs text-slate-500">Imtihonga 100% tayyor</span>
        </Card>

        <Card className="p-6 space-y-1">
          <span className="text-xs font-semibold text-slate-500">O'rtacha Sarflangan Vaqt</span>
          <h3 className="text-3xl font-black text-amber-500">
            12.3 daq
          </h3>
          <span className="text-xs text-slate-500">20 daqiqa limit me'yori</span>
        </Card>
      </div>

      {/* Chart: Score trend */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          So'nggi Testlar Bo'yicha Natijalar Dinamikasi (%)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.recentActivity}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" stroke="#888888" fontSize={12} />
              <YAxis domain={[50, 100]} stroke="#888888" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                name="Ball (%)"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5, fill: "#3b82f6" }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Strengths */}
      <Card className="p-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Mavzular Bo'yicha O'zlashtirish Ko'rsatkichlari
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.categoryStrengths.map((item) => (
            <div key={item.category} className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-800 dark:text-slate-200">{item.category}</span>
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
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{item.correct} ta to'g'ri</span>
                <span>Jami {item.total} ta savol</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
