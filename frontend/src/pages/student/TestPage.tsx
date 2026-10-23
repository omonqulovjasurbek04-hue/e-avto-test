import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTest } from "@/hooks/useTest";
import { useStudyTimer } from "@/hooks/useStudyTimer";
import { ROUTES } from "@/constants/routes";
import { FullSpinner } from "@/components/ui/Spinner";
import { ProgressBar } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import QuestionCard from "@/components/test/QuestionCard";
import TestTimer from "@/components/test/TestTimer";
import QuestionNavigator from "@/components/test/QuestionNavigator";

export default function TestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const test = useTest();
  const navRef = useRef(false);

  // The attempt is created on the tests/lesson screens; opening a stale URL goes back to the hub.
  const hasActiveTest = test.status === "active" && test.id === testId;
  // Time in a running test counts as study time.
  useStudyTimer("test", hasActiveTest);
  useEffect(() => {
    if (!hasActiveTest && !(test.status === "finished" && test.result)) {
      navigate(ROUTES.tests, { replace: true });
    }
  }, [hasActiveTest, test.status, test.result, navigate]);

  useEffect(() => {
    if (test.status === "finished" && test.result) {
      if (navRef.current) return;
      navRef.current = true;
      navigate(ROUTES.testResult(test.result.id));
    }
  }, [test.status, test.result, navigate]);

  const handleFinish = async () => {
    try {
      const r = await test.finish();
      if (r && !navRef.current) {
        navRef.current = true;
        navigate(ROUTES.testResult(r.id));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Testni yuborishda xatolik");
    }
  };

  if (test.questions.length === 0) {
    return <FullSpinner />;
  }

  return (
    <div className="container-page max-w-[1440px] py-6 sm:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t("testPage.question", { current: test.currentIndex + 1, total: test.questions.length })}
        </span>
        <div className="flex w-full items-center gap-3 sm:gap-4 lg:w-auto">
          <ProgressBar
            value={test.answeredCount}
            max={test.questions.length}
            className="min-w-0 flex-1 sm:w-48 sm:flex-none"
            showValueLabel
            label={t("testPage.progress")}
          />
          <div className="shrink-0">
            <TestTimer seconds={test.timeLeft} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-6">
        <div className="min-w-0">
          {test.currentQuestion && (
            <QuestionCard
              index={test.currentIndex}
              total={test.questions.length}
              text={test.currentQuestion.text}
              options={test.currentQuestion.options}
              imageUrl={test.currentQuestion.imageUrl ?? undefined}
              selected={test.answers[test.currentQuestion.id] ?? null}
              onSelect={(i) => test.setAnswer(test.currentQuestion!.id, i)}
              disabled={test.status !== "active"}
            />
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={test.prev}
              disabled={test.currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" /> {t("testPage.previous")}
            </Button>
            <Button
              variant="outline"
              onClick={test.next}
              disabled={test.currentIndex === test.questions.length - 1}
            >
              {t("testPage.next")} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

        </div>

        <aside className="flex min-h-[360px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("testPage.questions")}
            </h3>
            <QuestionNavigator
              total={test.questions.length}
              current={test.currentIndex}
              answered={test.questions.map((q) => (test.answers[q.id] ?? -1) >= 0)}
              marked={test.questions.map((q) => test.marked.includes(q.id))}
              onSelect={test.goTo}
            />
            <div className="mt-auto flex flex-col gap-4 pt-8">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-600" />{t("testPage.current")}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{t("testPage.answered")}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-slate-300 dark:border-slate-600" />{t("testPage.unanswered")}</span>
              </div>
              <Button className="w-full" variant="success" loading={test.finishing} onClick={handleFinish}>
                <Flag className="h-4 w-4" /> {t("testPage.finish")}
              </Button>
            </div>
        </aside>
      </div>
    </div>
  );
}
