import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTestStore } from "../../store/test.store";
import { testService } from "../../services/test.service";
import { Button, Card, Badge, Modal } from "../../components/ui";
import {
  Clock,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
} from "lucide-react";
import { formatSecondsToTimer } from "../../utils/formatTime";
import { toast } from "sonner";

export const TestActivePage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const {
    session,
    remainingSeconds,
    decrementTimer,
    selectOption,
    toggleFlag,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    isSubmitting,
    setSubmitting,
    resetSession,
    startSession,
  } = useTestStore();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Initialize session if opened directly
  useEffect(() => {
    if (!session) {
      const initDefaultSession = async () => {
        const newSession = await testService.startTest({
          mode: "EXAM_20",
          questionCount: 20,
          timeLimitSeconds: 20 * 60,
        });
        startSession(newSession);
      };
      initDefaultSession();
    }
  }, [session, startSession]);

  // Real-time timer ticker
  useEffect(() => {
    if (!session || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [session, remainingSeconds, decrementTimer]);

  // Auto submit when time runs out
  useEffect(() => {
    if (session && remainingSeconds === 0 && !isSubmitting) {
      toast.warning("Vaqt tugadi! Test avtomatik yakunlanmoqda...");
      handleFinishTest();
    }
  }, [remainingSeconds]);

  if (!session || session.questions.length === 0) {
    return (
      <div className="flex justify-center py-32">
        <p className="text-sm font-semibold text-slate-500">Test yuklanmoqda...</p>
      </div>
    );
  }

  const currentQIndex = session.currentQuestionIndex;
  const currentQuestion = session.questions[currentQIndex];
  const selectedOptionId = session.userAnswers[currentQuestion.id];
  const isFlagged = !!session.markedForReview[currentQuestion.id];

  const totalAnswered = Object.keys(session.userAnswers).length;
  const totalQuestions = session.questions.length;
  const unansweredCount = totalQuestions - totalAnswered;

  const handleFinishTest = async () => {
    setSubmitting(true);
    try {
      const timeSpent = session.timeLimitSeconds - remainingSeconds;
      const formattedAnswers = Object.entries(session.userAnswers).map(([qId, optId]) => ({
        questionId: qId,
        selectedOptionId: optId,
      }));

      const result = await testService.finishTest({
        attemptId: session.attemptId,
        timeSpentSeconds: timeSpent,
        answers: formattedAnswers,
      });

      resetSession();
      navigate(`/tests/${result.id}/result`, { state: { result } });
    } catch {
      toast.error("Testni yakunlashda xatolik yuz berdi");
      setSubmitting(false);
    }
  };

  const isTimerCritical = remainingSeconds <= 120; // 2 minutes left

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Floating Control Bar */}
      <div className="sticky top-20 z-20 flex items-center justify-between rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Badge variant="primary" size="md">
            {session.mode === "EXAM_20" ? "Davlat Imtihoni" : "Mashg'ulot Testi"}
          </Badge>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
            Javob berildi: <strong className="text-slate-900 dark:text-white">{totalAnswered}/{totalQuestions}</strong>
          </span>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-mono font-extrabold shadow-sm transition-colors ${
            isTimerCritical
              ? "bg-red-500 text-white animate-pulse"
              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-amber-400"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>{formatSecondsToTimer(remainingSeconds)}</span>
        </div>

        {/* Finish Button */}
        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsSubmitModalOpen(true)}
          leftIcon={<Send className="h-4 w-4" />}
        >
          Yakunlash
        </Button>
      </div>

      {/* Question Number Matrix */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {session.questions.map((q, idx) => {
            const isAnswered = !!session.userAnswers[q.id];
            const isQFlagged = !!session.markedForReview[q.id];
            const isCurrent = idx === currentQIndex;

            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(idx)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? "bg-brand-600 text-white ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950 scale-105"
                    : isAnswered
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {idx + 1}
                {isQFlagged && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Active Question Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {currentQIndex + 1}-Savol / {totalQuestions}
          </span>
          <button
            onClick={() => toggleFlag(currentQuestion.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              isFlagged
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <Flag className={`h-3.5 w-3.5 ${isFlagged ? "fill-amber-500" : ""}`} />
            <span>{isFlagged ? "Belgilangan" : "Belgilab qo'yish"}</span>
          </button>
        </div>

        {/* Question Text */}
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
          {currentQuestion.text}
        </h2>

        {/* Question Image (if any) */}
        {currentQuestion.imageUrl && (
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-72 flex justify-center bg-slate-100 dark:bg-slate-950">
            <img
              src={currentQuestion.imageUrl}
              alt="Question illustration"
              className="h-full max-h-72 w-auto object-contain"
            />
          </div>
        )}

        {/* Options List */}
        <div className="space-y-3 pt-2">
          {currentQuestion.options.map((opt, optIdx) => {
            const isSelected = selectedOptionId === opt.id;
            const letters = ["A", "B", "C", "D", "E"];

            return (
              <div
                key={opt.id}
                onClick={() => selectOption(currentQuestion.id, opt.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer select-none transition-all duration-200 ${
                  isSelected
                    ? "bg-brand-50/80 border-brand-500 text-brand-950 dark:bg-brand-950/50 dark:border-brand-500 dark:text-brand-100 ring-2 ring-brand-500/20 shadow-sm"
                    : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-850"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                    isSelected
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {letters[optIdx] || optIdx + 1}
                </div>
                <div className="flex-1 text-sm sm:text-base font-medium pt-1">
                  {opt.text}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevQuestion}
          disabled={currentQIndex === 0}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Oldingi savol
        </Button>

        {currentQIndex === totalQuestions - 1 ? (
          <Button
            variant="danger"
            onClick={() => setIsSubmitModalOpen(true)}
            rightIcon={<Send className="h-4 w-4" />}
          >
            Testni Yakunlash
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={nextQuestion}
            rightIcon={<ChevronRight className="h-4 w-4" />}
          >
            Keyingi savol
          </Button>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Testni yakunlaysizmi?"
        description="Haqiqatan ham testni topshirib, yakuniy natijani hisoblamoqchimisiz?"
      >
        <div className="space-y-4 py-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="block text-2xl font-bold">{totalAnswered}</span>
              <span className="text-xs">Javob berilgan</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <span className="block text-2xl font-bold">{unansweredCount}</span>
              <span className="text-xs">Belgilanmagan</span>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Sizda hali javob berilmagan {unansweredCount} ta savol mavjud!</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Testga qaytish
            </Button>
            <Button
              variant="danger"
              className="flex-1 font-bold"
              isLoading={isSubmitting}
              onClick={handleFinishTest}
            >
              Ha, yakunlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
