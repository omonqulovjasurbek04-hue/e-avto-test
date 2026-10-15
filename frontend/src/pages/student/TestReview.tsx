import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resultService } from "@/services/result.service";
import { ROUTES } from "@/constants/routes";
import type { TestResultDetail } from "@/types/result";
import QuestionCard from "@/components/test/QuestionCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TestReview() {
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
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
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

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("testReview.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {detail.courseTitle || t("tests.generalTest")} · {t("common.question")} · {detail.score}%
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.tests)}
          leftIcon={<RotateCcw className="h-5 w-5" />}
        >
          {t("testResult.retakeTest")}
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        {detail.answers.map((a, i) => {
          const isCorrect = a.selectedIndex === a.correctIndex;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <QuestionCard
                index={i}
                total={detail.answers.length}
                text={a.text}
                options={a.options}
                imageUrl={undefined}
                selected={a.selectedIndex ?? null}
                review={{ correctIndex: a.correctIndex }}
                disabled
                onSelect={() => {}}
              />
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={isCorrect ? "success" : "danger"}>
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t("testReview.correct")}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" /> {t("testReview.incorrect")}
                    </>
                  )}
                </Badge>
              </div>
              {a.explanation && (
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {a.explanation}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
