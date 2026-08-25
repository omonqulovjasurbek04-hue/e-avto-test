import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTest } from "@/hooks/useTest";
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
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") ?? undefined;
  const test = useTest();
  const startedRef = useRef(false);
  const navRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (test.status !== "active") {
      void test.start(courseId || undefined);
    }
  }, []);

  useEffect(() => {
    if (test.status === "finished" && test.result) {
      if (navRef.current) return;
      navRef.current = true;
      navigate(ROUTES.testResult(test.result.id));
    }
  }, [test.status, test.result, navigate]);

  const handleFinish = async () => {
    const r = await test.finish();
    if (r && !navRef.current) {
      navRef.current = true;
      navigate(ROUTES.testResult(r.id));
    }
  };

  if (test.questions.length === 0) {
    return <FullSpinner />;
  }

  return (
    <div className="container-page py-8">
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
          />
          <div className="shrink-0">
            <TestTimer seconds={test.timeLeft} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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

          <div className="mt-6 flex items-center justify-between">
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

          <div className="mt-6 flex justify-end">
            <Button
              variant="success"
              loading={test.status === "finished"}
              onClick={handleFinish}
            >
              <Flag className="h-4 w-4" /> {t("testPage.finish")}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("common.questions", { count: 0 }).replace(/\d+\s*/, "").trim() || t("testPage.question", { current: 0, total: 0 }).replace(/\d+\s*\/\s*\d+/, "").trim()}
            </h3>
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
    </div>
  );
}
