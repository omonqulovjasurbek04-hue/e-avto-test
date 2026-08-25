import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resultService } from "../../services/result.service";
import { TestResult } from "../../types/result";
import { Card, Button, Badge, Spinner } from "../../components/ui";
import { History, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { formatDateTime } from "../../utils/formatDate";

export const HistoryPage: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      const data = await resultService.getUserResults();
      setResults(data);
      setIsLoading(false);
    };
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Test Natijalari Tarixi
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Siz topshirgan barcha imtihon va mashg'ulot testlari arxivi
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">Siz hali birorta test topshirmagansiz.</p>
          <Link to="/tests">
            <Button variant="primary" size="sm" className="mt-3">Test topshirish</Button>
          </Link>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="p-4">Test Turi</th>
                  <th className="p-4">Sana va Vaqt</th>
                  <th className="p-4">Natija (To'g'ri/Jami)</th>
                  <th className="p-4">Foiz</th>
                  <th className="p-4">Holat</th>
                  <th className="p-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {results.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {res.mode === "EXAM_20" ? "20 talik Davlat Imtihoni" : res.lessonTitle || "Mavzuli Test"}
                    </td>
                    <td className="p-4 text-slate-500">
                      {formatDateTime(res.completedAt)}
                    </td>
                    <td className="p-4 font-mono font-medium">
                      {res.correctAnswersCount} / {res.totalQuestions}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {res.scorePercentage}%
                    </td>
                    <td className="p-4">
                      <Badge variant={res.isPassed ? "success" : "danger"}>
                        {res.isPassed ? "O'tdi" : "Yiqildi"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/tests/${res.id}/review`}>
                        <Button size="sm" variant="ghost">
                          Tahlil
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
