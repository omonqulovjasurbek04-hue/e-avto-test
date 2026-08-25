import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { History as HistoryIcon, Eye, Clock, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resultService } from "@/services/result.service";
import type { TestResultSummary } from "@/types/result";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/utils/formatDate";
import { formatTime } from "@/utils/formatTime";
import { cn } from "@/utils/cn";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

type FilterId = "all" | "passed" | "failed";

export default function History() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");

  const load = () => {
    setLoading(true);
    setError(false);
    resultService
      .list()
      .then((data) => setResults(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      all: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    }),
    [results]
  );

  const filtered = useMemo(() => {
    if (filter === "passed") return results.filter((r) => r.passed);
    if (filter === "failed") return results.filter((r) => !r.passed);
    return results;
  }, [results, filter]);

  const tabs = [
    { id: "all", label: t("common.all"), count: counts.all },
    { id: "passed", label: t("common.passed"), count: counts.passed },
    { id: "failed", label: t("common.failed"), count: counts.failed },
  ];

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("history.title")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("history.description")}
        </p>
      </header>

      <Tabs tabs={tabs} activeTab={filter} onChange={(id) => setFilter(id as FilterId)} className="mb-6" />

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {error && <ErrorState onRetry={load} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<HistoryIcon className="h-12 w-12" />}
          title={t("history.noHistory")}
          description={t("history.noHistoryDesc")}
          action={
            <Button onClick={() => navigate(ROUTES.tests)}>{t("tests.startTest")}</Button>
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:shadow-md">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                      {r.courseTitle ?? t("tests.generalTest")}
                    </h3>
                    <Badge variant={r.passed ? "success" : "danger"}>
                      {r.passed ? t("common.passed") : t("common.failed")}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDate(r.createdAt)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(r.timeSpent)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5" />
                      {r.correctAnswers}/{r.totalQuestions} {t("testResult.correct")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-xl font-bold",
                        r.passed
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {Math.round(r.score)}%
                    </p>
                    <p className="text-[11px] text-slate-400">{t("testResult.score")}</p>
                  </div>
                  <Link to={ROUTES.testReview(r.id)}>
                    <Button variant="outline" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                      Ko'rish
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
