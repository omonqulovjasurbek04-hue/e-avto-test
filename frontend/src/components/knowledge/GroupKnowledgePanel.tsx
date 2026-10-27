import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight, ClipboardList, GraduationCap, Target, Users, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { teacherService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { formatAccountId } from "@/utils/studentId";
import { cn } from "@/utils/cn";
import StatCard from "@/components/common/StatCard";
import { CoursePicker } from "@/components/test/CoursePicker";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

/** Score colour: green when the student would pass, amber close to it, red far from it. */
export const scoreTone = (score: number | null) =>
  score === null ? "text-slate-400" : score >= 90 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-red-600";

const pad = (n: number) => String(n).padStart(2, "0");
export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * One group at a time: a dropdown of the groups, then how many tests each student took in the last 7 days,
 * their average and how many mistakes they still have to fix. A teacher sees their own groups; an admin
 * passes `teacherId` to look at one teacher's groups.
 */
export function GroupKnowledgePanel({
  teacherId,
  studentPath,
  emptyTitle,
  emptyHint,
}: {
  teacherId?: string;
  studentPath: (id: string) => string;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState<string | undefined>();
  const { data, loading, error, reload } = useLoad(() => teacherService.knowledge(groupId, teacherId), [groupId, teacherId]);

  return (
    <>
      {loading && !data ? (
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      ) : error || !data ? (
        <div className="mt-6">
          <ErrorState message={error ?? undefined} onRetry={reload} />
        </div>
      ) : data.groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={emptyTitle ?? t("knowledge.noGroups")} description={emptyHint ?? t("knowledge.noGroupsHint")} />
        </div>
      ) : (
        <>
          {/* Which group: one dropdown (groups listed by course); everything below is about that group only. */}
          <div className="mt-6">
            <CoursePicker
              courses={data.groups.map((g) => ({ id: g.id, title: g.name, category: g.course, meta: t("knowledge.groupStudents", { count: g.students }) }))}
              value={data.groupId ?? ""}
              onChange={setGroupId}
              label={t("knowledge.group")}
              icon={<UsersRound className="h-5 w-5" aria-hidden />}
              total={t("knowledge.groupsCount", { count: data.groups.length })}
            />
          </div>

          {data.summary && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("knowledge.students")} value={data.summary.students} icon={<Users className="h-6 w-6" />} color="brand" />
              <StatCard label={t("knowledge.tests7d")} value={data.summary.tests7d} icon={<ClipboardList className="h-6 w-6" />} color="green" />
              <StatCard
                label={t("knowledge.average7d")}
                value={data.summary.average7d === null ? "—" : `${data.summary.average7d}%`}
                icon={<Target className="h-6 w-6" />}
                color="amber"
              />
              <StatCard label={t("knowledge.inactive7d")} value={data.summary.inactive7d} icon={<AlertTriangle className="h-6 w-6" />} color="red" />
            </div>
          )}

          <Card className="mt-6">
            <CardContent className="p-0">
              {data.students.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">{t("knowledge.noStudents")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                        <th className="px-6 py-3 font-semibold">{t("knowledge.student")}</th>
                        <th className="px-3 py-3 text-center font-semibold">{t("knowledge.tests7dShort")}</th>
                        <th className="px-3 py-3 text-center font-semibold">{t("knowledge.averageShort")}</th>
                        <th className="px-3 py-3 text-center font-semibold">{t("knowledge.mistakes")}</th>
                        <th className="px-3 py-3 font-semibold">{t("knowledge.lastTest")}</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.students.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => navigate(studentPath(s.id))}
                          className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-6 py-3">
                            <span className="flex items-center gap-3">
                              <Avatar name={s.name} src={s.avatarUrl} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
                                <span className="font-mono text-xs text-slate-400">{formatAccountId(s)}</span>
                              </span>
                            </span>
                          </td>
                          <td className={cn("px-3 py-3 text-center font-semibold", s.tests7d === 0 ? "text-red-600" : "text-slate-800 dark:text-slate-100")}>
                            {s.tests7d}
                          </td>
                          <td className={cn("px-3 py-3 text-center font-semibold", scoreTone(s.average7d))}>{s.average7d === null ? "—" : `${s.average7d}%`}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.mistakes ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300")}>
                              {s.mistakes}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-500">{s.lastTestAt ? shortDate(s.lastTestAt) : t("knowledge.never")}</td>
                          <td className="pr-4">
                            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <GraduationCap className="h-4 w-4" aria-hidden /> {t("knowledge.hint")}
          </p>
        </>
      )}
    </>
  );
}
