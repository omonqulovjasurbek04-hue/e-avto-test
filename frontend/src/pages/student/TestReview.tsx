import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RotateCcw, Bookmark, BookmarkCheck, Target } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { resultService } from "@/services/result.service";
import { studentService } from "@/services/platform.service";
import { useStartTest } from "@/hooks/useStartTest";
import { env } from "@/config/env";
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
  // Bookmarked question ids; the toggle is hidden in mock mode (no server to keep the list).
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const { startTest, starting } = useStartTest();

  const load = useCallback(async () => {
    if (!testId) return;
    setLoading(true);
    setError(false);
    try {
      const [data, practice] = await Promise.all([
        resultService.get(testId),
        env.useMock ? null : studentService.practice().catch(() => null),
      ]);
      setDetail(data);
      if (practice) setSaved(new Set(practice.savedIds));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSaved = async (questionId: string) => {
    const isSaved = saved.has(questionId);
    setSavingId(questionId);
    try {
      if (isSaved) await studentService.unsaveQuestion(questionId);
      else await studentService.saveQuestion(questionId);
      setSaved((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(questionId);
        else next.add(questionId);
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSavingId(null);
    }
  };

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
            {detail.courseTitle || t("tests.generalTest")} · {t("tests.questionsCount", { count: detail.totalQuestions })} · {detail.score}%
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!env.useMock && detail.answers.some((a) => a.selectedIndex !== null && a.selectedIndex !== a.correctIndex) && (
            <Button
              variant="outline"
              loading={starting}
              onClick={() => startTest(undefined, 20, "MISTAKES")}
              leftIcon={<Target className="h-5 w-5" />}
            >
              {t("tests.practice.mistakesTitle")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.tests)}
            leftIcon={<RotateCcw className="h-5 w-5" />}
          >
            {t("testResult.retakeTest")}
          </Button>
        </div>
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
                imageUrl={a.imageUrl}
                selected={a.selectedIndex ?? null}
                review={{ correctIndex: a.correctIndex }}
                disabled
                onSelect={() => {}}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
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
                {!env.useMock && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={savingId === a.questionId}
                    aria-pressed={saved.has(a.questionId)}
                    onClick={() => toggleSaved(a.questionId)}
                    leftIcon={saved.has(a.questionId) ? <BookmarkCheck className="h-4 w-4 text-amber-500" /> : <Bookmark className="h-4 w-4" />}
                  >
                    {saved.has(a.questionId) ? t("tests.practice.unsave") : t("tests.practice.save")}
                  </Button>
                )}
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
