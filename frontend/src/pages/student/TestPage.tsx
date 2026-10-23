import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Flag, Maximize, Minimize } from "lucide-react";
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
  const pageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textScale, setTextScale] = useState(0);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === pageRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await pageRef.current?.requestFullscreen();
    } catch {
      toast.error("To‘liq ekran rejimini yoqib bo‘lmadi");
    }
  };

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
    <div ref={pageRef} className="test-page container-page max-w-[1440px] py-6 sm:py-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 lg:grid-cols-[max-content_minmax(0,1fr)_auto]">
        <div className="flex items-center gap-2" aria-label="Matn o‘lchami">
          <Button
            className="h-10 min-w-11 !px-2 text-base font-bold"
            variant="outline"
            onClick={() => setTextScale((scale) => Math.max(-1, scale - 1))}
            disabled={textScale <= -1}
            aria-label="Matnni kichraytirish"
            title="Matnni kichraytirish"
          >A−</Button>
          <Button
            className="h-10 min-w-11 !px-2 text-base font-bold"
            variant="outline"
            onClick={() => setTextScale((scale) => Math.min(2, scale + 1))}
            disabled={textScale >= 2}
            aria-label="Matnni kattalashtirish"
            title="Matnni kattalashtirish"
          >A+</Button>
        </div>
        <div className="relative col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <ProgressBar
            value={test.answeredCount}
            max={test.questions.length}
            className="min-w-0 w-full"
            showValueLabel
            label=""
          />
          <div className="absolute left-1/2 top-[calc(100%-0.3125rem)] z-10 -translate-x-1/2 -translate-y-1/2">
            <TestTimer seconds={test.timeLeft} />
          </div>
        </div>
        <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2 lg:col-start-3">
          <Button
            className="h-10 w-10 shrink-0 !p-0"
            variant="success"
            loading={test.finishing}
            onClick={handleFinish}
            aria-label={t("testPage.finish")}
            title={t("testPage.finish")}
          >
            <Flag className="h-5 w-5" />
          </Button>
          <Button
            className="h-10 w-10 shrink-0 !p-0"
            variant="outline"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "To‘liq ekrandan chiqish" : "To‘liq ekran"}
            title={isFullscreen ? "To‘liq ekrandan chiqish" : "To‘liq ekran"}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
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
            splitMedia
            textScale={textScale}
          />
        )}
      </div>

      <div className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <Button className="h-11 w-11 shrink-0 !p-0" variant="outline" onClick={test.prev} disabled={test.currentIndex === 0} aria-label={t("testPage.previous")} title={t("testPage.previous")}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <QuestionNavigator
            className="min-w-0 w-full max-w-4xl flex-1"
            total={test.questions.length}
            current={test.currentIndex}
            answered={test.questions.map((q) => (test.answers[q.id] ?? -1) >= 0)}
            marked={test.questions.map((q) => test.marked.includes(q.id))}
            onSelect={test.goTo}
          />
          <Button className="h-11 w-11 shrink-0 !p-0" variant="outline" onClick={test.next} disabled={test.currentIndex === test.questions.length - 1} aria-label={t("testPage.next")} title={t("testPage.next")}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
