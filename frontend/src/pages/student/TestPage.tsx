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
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 lg:grid-cols-[minmax(180px,0.8fr)_minmax(320px,1.6fr)_auto]">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t("testPage.question", { current: test.currentIndex + 1, total: test.questions.length })}
        </span>
        <div className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <ProgressBar
            value={test.answeredCount}
            max={test.questions.length}
            className="min-w-0 w-full"
            showValueLabel
          />
        </div>
        <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2 lg:col-start-3">
          <div className="shrink-0">
            <TestTimer seconds={test.timeLeft} />
          </div>
          <Button
            className="shrink-0 px-3 sm:px-4"
            variant="success"
            loading={test.finishing}
            onClick={handleFinish}
          >
            <Flag className="h-4 w-4" /> {t("testPage.finish")}
          </Button>
        </div>
      </div>

      <div className="mt-5 min-w-0">
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
            showPosition={false}
          />
        )}
      </div>

      <div className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={test.prev} disabled={test.currentIndex === 0}>
            <ChevronLeft className="h-4 w-4" /> {t("testPage.previous")}
          </Button>
          <Button variant="outline" onClick={test.next} disabled={test.currentIndex === test.questions.length - 1}>
            {t("testPage.next")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("testPage.questions")}</h3>
          </div>
          <QuestionNavigator
            total={test.questions.length}
            current={test.currentIndex}
            answered={test.questions.map((q) => (test.answers[q.id] ?? -1) >= 0)}
            marked={test.questions.map((q) => test.marked.includes(q.id))}
            onSelect={test.goTo}
          />
        </div>
      </div>
    </div>
  );
}
