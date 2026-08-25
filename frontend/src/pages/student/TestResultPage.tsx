import React, { useEffect, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { TestResult } from "../../types/result";
import { testService } from "../../services/test.service";
import { Card, CardContent, Button, Badge, CircularProgress, Spinner } from "../../components/ui";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { formatMinutesToDuration } from "../../utils/formatTime";

export const TestResultPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState<TestResult | null>(
    (location.state as any)?.result || null
  );
  const [isLoading, setIsLoading] = useState(!result);

  useEffect(() => {
    if (!result && testId) {
      const fetchResult = async () => {
        setIsLoading(true);
        const data = await testService.getResultById(testId);
        setResult(data);
        setIsLoading(false);
      };
      fetchResult();
    }
  }, [testId, result]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Natija topilmadi</h2>
        <Link to="/tests">
          <Button variant="primary" className="mt-4">Testlar bo'limiga qaytish</Button>
        </Link>
      </div>
    );
  }

  const isPassed = result.isPassed;
  const timeMins = Math.round(result.timeSpentSeconds / 60);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Result Hero Card */}
      <Card className="p-8 text-center space-y-6 overflow-hidden relative">
        <div className="mx-auto flex justify-center">
          <CircularProgress
            percentage={result.scorePercentage}
            size={140}
            strokeWidth={12}
            color={isPassed ? "#10b981" : "#ef4444"}
            label="To'plangan Ball"
          />
        </div>

        <div className="space-y-2">
          <Badge
            variant={isPassed ? "success" : "danger"}
            size="md"
            className="text-sm px-4 py-1"
          >
            {isPassed ? "IMTIHONDAN O'TDINGIZ! 🎉" : "IMTIHONDAN O'TMADINGIZ"}
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isPassed
              ? "Ajoyib natija! Tabriklaymiz!"
              : "Xatolaringizni tahlil qiling va qayta topshiring"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {isPassed
              ? "Siz 90% dan yuqori natija ko'rsatib, davlat imtihoni me'yorini bajardingiz."
              : "Davlat imtihonidan o'tish uchun kamida 18 ta (90%) savolga to'g'ri javob berish lozim."}
          </p>
        </div>

        {/* Breakdown Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Jami Savollar</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">{result.totalQuestions} ta</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block">To'g'ri Javoblar</span>
            <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
              {result.correctAnswersCount} ta
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50">
            <span className="text-xs text-red-600 dark:text-red-400 block">Noto'g'ri Javoblar</span>
            <span className="text-lg font-extrabold text-red-700 dark:text-red-300">
              {result.incorrectAnswersCount} ta
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50">
            <span className="text-xs text-amber-600 dark:text-amber-400 block">Sarflangan Vaqt</span>
            <span className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
              {timeMins} daqiqa
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link to={`/tests/${result.id}/review`} className="flex-1">
            <Button variant="primary" size="lg" className="w-full font-bold" rightIcon={<BookOpen className="h-5 w-5" />}>
              Xatolar va Javoblar Tahlili
            </Button>
          </Link>
          <Link to="/tests" className="flex-1">
            <Button variant="outline" size="lg" className="w-full" leftIcon={<RotateCcw className="h-5 w-5" />}>
              Qayta Test Topshirish
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
