import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import type { ProgressStats } from "@/types/result";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

/** Tests taken per day over the last week (from the progress stats). */
export default function WeeklyActivityChart({ weekly, className }: { weekly: ProgressStats["weekly"]; className?: string }) {
  const { t } = useTranslation();
  const data = weekly.map((w) => ({ name: w.date, count: w.count }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("progress.weeklyActivity")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-slate-500" />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="text-slate-500" />
              <Tooltip
                cursor={{ fill: "rgba(99,102,241,0.08)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid rgb(203 213 225)", fontSize: 12 }}
              />
              <Bar dataKey="count" name={t("nav.tests")} fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
