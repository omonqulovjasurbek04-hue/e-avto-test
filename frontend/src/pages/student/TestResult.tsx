import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, MinusCircle, Clock, RotateCcw, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resultService } from "@/services/result.service";
import { ROUTES } from "@/constants/routes";
import type { TestResultDetail } from "@/types/result";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTime } from "@/utils/formatTime";

export default function TestResult() {
  const { t } = useTranslation();
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<TestResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!testId) return;
    setLoading(true);
    setError(false);
    try {
      const data = await resultService.get(testId);
      setDetail(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="container-page py-8 space-y-4">
        <Skeleton className="mx-auto h-40 w-40 rounded-full" />
        <Skeleton className="h-6 w-64" />
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

  if (!detail) {
    return (
      <div className="container-page py-8">
        <EmptyState
          title={t("common.noResults")}
          description={t("common.noResults")}
        />
      </div>
    );
  }

  const score = detail.score;

  return (
    <div className="container-page py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-2xl"
      >
        <div
          className={`rounded-2xl border p-8 text-center ${
            detail.passed
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
              : "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          }`}
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-900">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {score}%
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
            {detail.passed ? t("testResult.congratulations") + " " + t("testResult.passed") : t("testResult.failed")}
          </h1>
          <Badge variant={detail.passed ? "success" : "danger"} className="mt-2">
            {detail.passed ? t("common.passed") : t("common.failed")}
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {detail.correctAnswers}
              </span>
              <span className="text-xs text-slate-500">{t("testResult.correct")}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4">
              <XCircle className="h-6 w-6 text-red-500" />
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {detail.wrongAnswers}
              </span>
              <span className="text-xs text-slate-500">{t("testResult.incorrect")}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4">
              <MinusCircle className="h-6 w-6 text-slate-400" />
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {detail.skippedAnswers ?? detail.skipped ?? 0}
              </span>
              <span className="text-xs text-slate-500">{t("common.skipped")}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4">
              <Clock className="h-6 w-6 text-brand-500" />
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {formatTime(detail.timeSpent)}
              </span>
              <span className="text-xs text-slate-500">{t("testResult.timeSpent")}</span>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => navigate(ROUTES.testReview(detail.id))}
            leftIcon={<AlertTriangle className="h-5 w-5" />}
          >
            {t("testResult.reviewAnswers")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.tests)}
            leftIcon={<RotateCcw className="h-5 w-5" />}
          >
            {t("testResult.retakeTest")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
