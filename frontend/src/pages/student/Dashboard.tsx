import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, ClipboardList, Trophy, PlayCircle } from "lucide-react";
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
import { EmptyState } from "@/components/ui/EmptyState";
import LessonCard from "@/components/lesson/LessonCard";

export default function Dashboard() {
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

  const recommended = lessons.slice(0, 6);
  const continueLearning = lessons.find((l) => !l.completed) ?? lessons[0];

  return (
    <div className="container-page py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Salom, {user?.name ?? "foydalanuvchi"}!
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Bugun ham bilimlarni rivojlantirishga tayyormisiz?
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState onRetry={load} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Progress"
              value={`${stats?.progressPct ?? 0}%`}
              icon={<Trophy className="h-6 w-6" />}
              color="brand"
            />
            <StatCard
              label="Tugallangan darslar"
              value={stats?.completedLessons ?? 0}
              icon={<CheckCircle className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              label="Bajarilgan testlar"
              value={results.length}
              icon={<ClipboardList className="h-6 w-6" />}
              color="amber"
            />
            <StatCard
              label="O'rtacha ball"
              value={`${stats?.avgScore ?? 0}%`}
              icon={<BookOpen className="h-6 w-6" />}
              color="slate"
            />
          </div>

          {continueLearning && (
            <Card className="mt-8">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Davom etilishi kerak
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{continueLearning.title}</p>
                </div>
                <Link
                  to={ROUTES.lessonDetails(continueLearning.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <PlayCircle className="h-5 w-5" /> Darsni davom ettirish
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Tavsiya etilgan darslar
            </h2>
            {recommended.length === 0 ? (
              <EmptyState
                title="Hozircha darslar yo'q"
                description="Tez orada yangi darslar qo'shiladi."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {recommended.map((l, i) => (
                  <LessonCard key={l.id} lesson={l} index={i} courseId={l.courseId} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
