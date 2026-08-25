import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useTest } from "@/hooks/useTest";
import { ROUTES } from "@/constants/routes";
import { FullSpinner } from "@/components/ui/Spinner";
import { ProgressBar } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import QuestionCard from "@/components/test/QuestionCard";
import TestTimer from "@/components/test/TestTimer";
import QuestionNavigator from "@/components/test/QuestionNavigator";

export default function TestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") ?? undefined;
  const t = useTest();
  const startedRef = useRef(false);
  const navRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (t.status !== "active") {
      void t.start(courseId || undefined);
    }
  }, []);

  useEffect(() => {
    if (t.status === "finished" && t.result) {
      if (navRef.current) return;
      navRef.current = true;
      navigate(ROUTES.testResult(t.result.id));
    }
  }, [t.status, t.result, navigate]);

  const handleFinish = async () => {
    const r = await t.finish();
    if (r && !navRef.current) {
      navRef.current = true;
      navigate(ROUTES.testResult(r.id));
    }
  };

  if (t.questions.length === 0) {
    return <FullSpinner />;
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Savol {t.currentIndex + 1} / {t.questions.length}
        </span>
        <div className="flex items-center gap-4">
          <ProgressBar
            value={t.answeredCount}
            max={t.questions.length}
            className="w-48"
            showValueLabel
          />
          <TestTimer seconds={t.timeLeft} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {t.currentQuestion && (
            <QuestionCard
              index={t.currentIndex}
              total={t.questions.length}
              text={t.currentQuestion.text}
              options={t.currentQuestion.options}
              imageUrl={t.currentQuestion.imageUrl ?? undefined}
              selected={t.answers[t.currentQuestion.id] ?? null}
              onSelect={(i) => t.setAnswer(t.currentQuestion!.id, i)}
              disabled={t.status !== "active"}
            />
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={t.prev}
              disabled={t.currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Oldingi
            </Button>
            <Button
              variant="outline"
              onClick={t.next}
              disabled={t.currentIndex === t.questions.length - 1}
            >
              Keyingi <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="success"
              loading={t.status === "finished"}
              onClick={handleFinish}
            >
              <Flag className="h-4 w-4" /> Yakunlash
            </Button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Savollar ro'yxati
            </h3>
            <QuestionNavigator
              total={t.questions.length}
              current={t.currentIndex}
              answered={t.questions.map((q) => (t.answers[q.id] ?? -1) >= 0)}
              marked={t.questions.map((q) => t.marked.includes(q.id))}
              onSelect={t.goTo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
