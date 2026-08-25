import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { TestResult, QuestionReviewItem } from "../../types/result";
import { testService } from "../../services/test.service";
import { Card, CardContent, Button, Badge, Spinner } from "../../components/ui";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  BookOpen,
  Info,
  Filter,
} from "lucide-react";

export const TestReviewPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"ALL" | "WRONG" | "CORRECT">("ALL");

  useEffect(() => {
    const fetchReview = async () => {
      if (!testId) return;
      setIsLoading(true);
      const data = await testService.getResultById(testId);
      setResult(data);
      setIsLoading(false);
    };
    fetchReview();
  }, [testId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!result || !result.questionsReview) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Tahlil ma'lumotlari topilmadi</h2>
        <Link to="/tests">
          <Button variant="primary" className="mt-4">Testlarga qaytish</Button>
        </Link>
      </div>
    );
  }

  const reviewItems = result.questionsReview.filter((item) => {
    if (filterMode === "WRONG") return !item.isCorrect;
    if (filterMode === "CORRECT") return item.isCorrect;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to={`/tests/${result.id}/result`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          <span>Natija oynasiga qaytish</span>
        </Link>

        {/* Filter Pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterMode === "ALL"
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Barchasi ({result.questionsReview.length})
          </button>
          <button
            onClick={() => setFilterMode("WRONG")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterMode === "WRONG"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
            }`}
          >
            Faqat Xatolar ({result.incorrectAnswersCount})
          </button>
          <button
            onClick={() => setFilterMode("CORRECT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterMode === "CORRECT"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            }`}
          >
            To'g'ri Javoblar ({result.correctAnswersCount})
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {reviewItems.map((item, idx) => {
          const { question, selectedOptionId, correctOptionId, isCorrect, explanation, ruleClause } = item;

          return (
            <Card
              key={question.id}
              className={`p-6 sm:p-8 space-y-5 border-2 transition-all ${
                isCorrect
                  ? "border-emerald-500/30 bg-white dark:bg-slate-900"
                  : "border-red-500/40 bg-red-50/10 dark:bg-red-950/10"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={isCorrect ? "success" : "danger"} size="sm">
                    {isCorrect ? "To'g'ri javob berildi" : "Xato javob berildi"}
                  </Badge>
                  {ruleClause && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {ruleClause}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {idx + 1}-savol
                </span>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {question.text}
              </h3>

              {/* Question Image if any */}
              {question.imageUrl && (
                <div className="rounded-xl overflow-hidden max-h-60 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-center">
                  <img
                    src={question.imageUrl}
                    alt="Question visual"
                    className="h-full max-h-60 w-auto object-contain"
                  />
                </div>
              )}

              {/* Options Breakdown */}
              <div className="space-y-2 pt-2">
                {question.options.map((opt) => {
                  const isUserChoice = opt.id === selectedOptionId;
                  const isRealCorrect = opt.id === correctOptionId || opt.isCorrect;

                  let style = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                  let icon = null;

                  if (isRealCorrect) {
                    style = "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-200 font-semibold";
                    icon = <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
                  } else if (isUserChoice && !isRealCorrect) {
                    style = "border-red-500 bg-red-50 text-red-950 dark:bg-red-950/70 dark:text-red-200 line-through";
                    icon = <XCircle className="h-5 w-5 text-red-600 shrink-0" />;
                  }

                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm ${style}`}
                    >
                      <div className="flex items-center gap-3">
                        <span>{opt.text}</span>
                        {isUserChoice && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            Sizning javobingiz
                          </span>
                        )}
                      </div>
                      {icon}
                    </div>
                  );
                })}
              </div>

              {/* Official Explanation Box */}
              {explanation && (
                <div className="mt-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-4 text-xs sm:text-sm leading-relaxed text-blue-950 dark:text-blue-200 flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold mb-1 text-blue-900 dark:text-blue-100">
                      YHQ Qoidasi va Tushuntirish:
                    </h5>
                    <p>{explanation}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
