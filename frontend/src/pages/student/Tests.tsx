import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle, History, Lock, ShoppingCart, CheckCircle2, XCircle, Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { courseService } from "@/services/course.service";
import { resultService } from "@/services/result.service";
import { studentService, type PracticeSummary } from "@/services/platform.service";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/utils/cn";
import { useStartTest } from "@/hooks/useStartTest";
import { ROUTES } from "@/constants/routes";
import type { Course } from "@/types/course";
import type { TestMode, TestResultSummary } from "@/types/result";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTime } from "@/utils/formatTime";

// Practice draws from the student's own lists; at most this many questions per round.
const PRACTICE_MAX_QUESTIONS = 20;

export default function Tests() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { startTest, starting } = useStartTest();
  const [startingId, setStartingId] = useState<string | null>(null);
  // Which courses this student bought: the server decides, the page only mirrors it (null = still loading).
  const [access, setAccess] = useState<{ all: boolean; courseIds: string[] } | null>(null);
  // Practice counts; null when the request failed (the cards are then hidden, nothing else breaks).
  const [practice, setPractice] = useState<PracticeSummary | null>(null);
  const canOpen = (courseId: string) => !access || access.all || access.courseIds.includes(courseId);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [cs, rs, ac, pr] = await Promise.all([
        courseService.getCourses(),
        resultService.list(),
        // If this fails the buttons stay enabled and the server still refuses a locked test.
        studentService.courseAccess().catch(() => null),
        studentService.practice().catch(() => null),
      ]);
      setCourses(cs);
      setResults(rs);
      setAccess(ac);
      setPractice(pr);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleStart = async (courseId: string) => {
    setStartingId(courseId);
    await startTest(courseId);
    setStartingId(null);
  };

  const handlePractice = async (mode: Exclude<TestMode, "EXAM">) => {
    setStartingId(mode);
    await startTest(undefined, PRACTICE_MAX_QUESTIONS, mode);
    setStartingId(null);
  };

  const practiceCards = practice
    ? [
        { mode: "MISTAKES" as const, count: practice.mistakes, icon: XCircle, tone: "text-rose-600 bg-rose-50 dark:bg-rose-500/10", title: t("tests.practice.mistakesTitle"), desc: t("tests.practice.mistakesDesc") },
        { mode: "SAVED" as const, count: practice.saved, icon: Bookmark, tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10", title: t("tests.practice.savedTitle"), desc: t("tests.practice.savedDesc") },
      ]
    : [];

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("tests.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {t("tests.description")}
      </p>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState onRetry={load} />
        </div>
      ) : (
        <>
          {access && !access.all && access.courseIds.length === 0 && (
            <Alert variant="warning" title={t("tests.lockedTitle")} className="mt-6">
              {t("tests.lockedHint")}{" "}
              <Link to="/my-courses" className="font-semibold underline">{t("nav.courses")}</Link>
            </Alert>
          )}
          {practiceCards.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {practiceCards.map((p) => (
                <Card key={p.mode}>
                  <CardContent className="flex items-center gap-4">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", p.tone)}>
                      <p.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        {p.title} <span className="text-slate-400">({p.count})</span>
                      </h3>
                      <p className="text-sm text-slate-500">{p.count > 0 ? p.desc : t(p.mode === "MISTAKES" ? "tests.practice.noMistakes" : "tests.practice.noSaved")}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={p.count === 0}
                      loading={starting && startingId === p.mode}
                      onClick={() => handlePractice(p.mode)}
                    >
                      {t("tests.practice.start")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const open = canOpen(c.id);
              const owned = access && !access.all && access.courseIds.includes(c.id);
              return (
              <Card key={c.id} className={cn(!open && "bg-slate-50/80 dark:bg-slate-900/60")}>
                <CardContent className="flex h-full flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {c.category ? <Badge variant="primary">{c.category}</Badge> : <span />}
                    {open ? (
                      owned && (
                        <Badge variant="success">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {t("tests.owned")}
                        </Badge>
                      )
                    ) : (
                      <Badge variant="neutral">
                        <Lock className="mr-1 h-3.5 w-3.5" /> {t("tests.lockedCourse")}
                      </Badge>
                    )}
                  </div>
                  <h3 className={cn("mt-3 font-semibold", open ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}>
                    {c.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>
                  {/* Pushes the button to the bottom so the cards line up. */}
                  <div className="flex-1" />
                  {open ? (
                    <Button
                      className="mt-4"
                      loading={starting && startingId === c.id}
                      leftIcon={<PlayCircle className="h-5 w-5" />}
                      onClick={() => handleStart(c.id)}
                    >
                      {t("tests.startTest")}
                    </Button>
                  ) : (
                    <Link to={`/my-courses/${c.id}#packages`} className="mt-4">
                      <Button variant="outline" className="w-full" leftIcon={<ShoppingCart className="h-5 w-5" />}>
                        {t("tests.buyCourse")}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>

          <div className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              <History className="h-5 w-5 text-brand-600" /> {t("tests.previousResults")}
            </h2>
            {results.length === 0 ? (
              <EmptyState
                title={t("tests.noTests")}
                description={t("tests.noTestsDesc")}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {results.map((r) => (
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
        </>
      )}
    </div>
  );
}
