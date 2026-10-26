import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, CheckCircle2, History, Repeat, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { studentService } from "@/services/platform.service";
import { resultService } from "@/services/result.service";
import { ROUTES } from "@/constants/routes";
import { formatTime } from "@/utils/formatTime";
import { useLoad } from "@/hooks/useLoad";
import { useStartTest } from "@/hooks/useStartTest";
import type { TestMode } from "@/types/result";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

// Practice draws from the student's own lists; at most this many questions per round.
const PRACTICE_MAX_QUESTIONS = 20;

type PracticeMode = Exclude<TestMode, "EXAM">;

/** Work on mistakes: questions last answered wrong and bookmarked ones, practised until they stick. */
export default function Mistakes() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => studentService.practice(), []);
  const results = useLoad(() => resultService.list(), []);
  const { startTest, starting } = useStartTest();
  const [startingMode, setStartingMode] = useState<PracticeMode | null>(null);

  const practise = async (mode: PracticeMode) => {
    setStartingMode(mode);
    await startTest(undefined, PRACTICE_MAX_QUESTIONS, mode);
    setStartingMode(null);
  };

  const cards = data
    ? [
        { mode: "MISTAKES" as const, count: data.mistakes, icon: XCircle, tone: "text-rose-600 bg-rose-50 dark:bg-rose-500/10", title: t("tests.practice.mistakesTitle"), desc: t("tests.practice.mistakesDesc"), empty: t("tests.practice.noMistakes") },
        { mode: "SAVED" as const, count: data.saved, icon: Bookmark, tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10", title: t("tests.practice.savedTitle"), desc: t("tests.practice.savedDesc"), empty: t("tests.practice.noSaved") },
      ]
    : [];

  const steps = [
    { icon: XCircle, text: t("mistakes.step1") },
    { icon: Repeat, text: t("mistakes.step2") },
    { icon: CheckCircle2, text: t("mistakes.step3") },
  ];

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("mistakes.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("mistakes.description")}</p>

      {loading && !data ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <Card key={c.mode}>
              <CardContent className="flex h-full flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", c.tone)}>
                    <c.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">{c.title}</h2>
                    <p className="text-sm text-slate-500">{t("mistakes.count", { count: c.count })}</p>
                  </div>
                </div>
                <p className="flex-1 text-sm text-slate-600 dark:text-slate-400">{c.count > 0 ? c.desc : c.empty}</p>
                <Button disabled={c.count === 0} loading={starting && startingMode === c.mode} onClick={() => practise(c.mode)}>
                  {t("tests.practice.start")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardContent>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("mistakes.howTitle")}</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400">{s.text}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Every finished test: open one to see the wrong answers and save hard questions. */}
      <div className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          <History className="h-5 w-5 text-brand-600" /> {t("tests.previousResults")}
        </h2>
        {results.loading && !results.data ? (
          <Skeleton className="h-20 w-full" />
        ) : results.error ? (
          <ErrorState message={results.error} onRetry={results.reload} />
        ) : !results.data || results.data.length === 0 ? (
          <EmptyState title={t("tests.noTests")} description={t("mistakes.noResultsDesc")} />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {results.data.map((r) => (
              <Link
                key={r.id}
                to={ROUTES.testReview(r.id)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-400 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {r.courseTitle || t("tests.generalTest")}
                    {r.mode && r.mode !== "EXAM" && (
                      <Badge variant="neutral" className="ml-2">{t("tests.practice.badge")}</Badge>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("tests.questionsCount", { count: r.totalQuestions })} · {formatTime(r.timeSpent)} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={r.passed ? "success" : "danger"}>{r.score}%</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
