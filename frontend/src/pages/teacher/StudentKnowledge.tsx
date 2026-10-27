import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Check, ClipboardList, Phone, Target, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { teacherService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { formatAccountId } from "@/utils/studentId";
import { assetUrl } from "@/utils/assetUrl";
import { cn } from "@/utils/cn";
import StatCard from "@/components/common/StatCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { scoreTone, shortDate } from "@/components/knowledge/GroupKnowledgePanel";

/** One student for the teacher: recent tests, weakest topics and every question still answered wrong. */
export default function StudentKnowledge() {
  const { t } = useTranslation();
  const { studentId = "" } = useParams();
  // Opened from the admin panel or from the teacher's own page: go back to where it came from.
  const location = useLocation();
  const fromAdmin = location.pathname.startsWith("/admin");
  const { data, loading, error, reload } = useLoad(() => teacherService.studentKnowledge(studentId), [studentId]);

  return (
    <div className="container-page py-8">
      <Link to={fromAdmin ? `/admin/knowledge${location.search}` : "/mistakes"} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("knowledge.title")}
      </Link>

      {loading && !data ? (
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      ) : error || !data ? (
        <div className="mt-6">
          <ErrorState message={error ?? undefined} onRetry={reload} />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Avatar name={data.student.name} src={data.student.avatarUrl} size="lg" className="h-16 w-16 text-xl" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{data.student.name}</h1>
              <p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                <span className="font-mono">{formatAccountId(data.student)}</span>
                {data.student.phone && (
                  <a href={`tel:${data.student.phone}`} className="flex items-center gap-1 hover:text-brand-600">
                    <Phone className="h-3.5 w-3.5" aria-hidden /> {data.student.phone}
                  </a>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label={t("knowledge.tests7d")} value={data.week.tests} icon={<ClipboardList className="h-6 w-6" />} color="brand" />
            <StatCard label={t("knowledge.average7d")} value={data.week.average === null ? "—" : `${data.week.average}%`} icon={<Target className="h-6 w-6" />} color="green" />
            <StatCard label={t("knowledge.mistakes")} value={data.mistakes.length} icon={<TriangleAlert className="h-6 w-6" />} color="red" />
          </div>

          {data.weakTopics.length > 0 && (
            <Card className="mt-6">
              <CardContent>
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("knowledge.weakTopics")}</h2>
                <p className="text-sm text-slate-500">{t("knowledge.weakTopicsHint")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.weakTopics.map((w) => (
                    <span key={w.topic} className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                      {w.topic} · {w.count}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {/* The questions still wrong: what the student picked next to the right answer. */}
            <Card>
              <CardContent>
                <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">{t("knowledge.mistakesTitle")}</h2>
                {data.mistakes.length === 0 ? (
                  <p className="rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {t("knowledge.noMistakes")}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {data.mistakes.map((m) => (
                      <li key={m.questionId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{m.text}</p>
                          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                            {t("knowledge.times", { count: m.times })}
                          </span>
                        </div>
                        {m.imageUrl && <img src={assetUrl(m.imageUrl)} alt="" className="mt-3 max-h-40 rounded-xl object-contain" />}
                        <div className="mt-3 space-y-1.5 text-sm">
                          {m.chosen && (
                            <p className="flex items-start gap-2 text-red-700 dark:text-red-300">
                              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                              <span>
                                <span className="font-semibold">{t("knowledge.chosen")}:</span> {m.chosen}
                              </span>
                            </p>
                          )}
                          {m.correct && (
                            <p className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300">
                              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                              <span>
                                <span className="font-semibold">{t("knowledge.correct")}:</span> {m.correct}
                              </span>
                            </p>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {m.topic ? `${m.topic} · ` : ""}
                          {shortDate(m.lastAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">{t("knowledge.recentTests")}</h2>
                {data.recent.length === 0 ? (
                  <p className="text-sm text-slate-500">{t("knowledge.never")}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.recent.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {r.course ?? t("tests.generalTest")}
                            {r.ticket ? ` · ${t("tests.tickets.ticketLabel", { n: r.ticket })}` : ""}
                          </span>
                          <span className="text-xs text-slate-500">
                            {shortDate(r.finishedAt)} · {r.correctAnswers}/{r.totalQuestions}
                            {r.mode !== "EXAM" && (
                              <Badge variant="neutral" className="ml-2">
                                {t("tests.practice.badge")}
                              </Badge>
                            )}
                          </span>
                        </span>
                        <span className={cn("shrink-0 text-sm font-bold", scoreTone(r.score))}>{r.score}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
