import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronRight, ClipboardList, GraduationCap, Target, Users, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { teacherService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { cn } from "@/utils/cn";
import StatCard from "@/components/common/StatCard";
import { GroupKnowledgePanel, scoreTone } from "@/components/knowledge/GroupKnowledgePanel";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

/**
 * Knowledge control for the admin: every teacher side by side (groups, students, tests this week, average,
 * students without a test), then the chosen teacher's groups one at a time, down to a single student.
 */
export default function AdminKnowledge() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => teacherService.teachersKnowledge(), []);
  // The chosen teacher lives in the URL, so coming back from a student keeps it.
  const [params, setParams] = useSearchParams();
  const teacherId = params.get("teacher") ?? data?.teachers.find((x) => x.groups > 0)?.id ?? data?.teachers[0]?.id;
  const teacher = data?.teachers.find((x) => x.id === teacherId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("knowledge.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("knowledge.adminSubtitle")}</p>
      </div>

      {loading && !data ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("knowledge.teachers")} value={`${data.summary.teachers} / ${data.summary.groups}`} icon={<GraduationCap className="h-6 w-6" />} color="brand" />
            <StatCard label={t("knowledge.students")} value={data.summary.students} icon={<Users className="h-6 w-6" />} color="green" />
            <StatCard
              label={t("knowledge.average7d")}
              value={data.summary.average7d === null ? "—" : `${data.summary.average7d}%`}
              icon={<Target className="h-6 w-6" />}
              color="amber"
            />
            <StatCard label={t("knowledge.inactive7d")} value={data.summary.inactive7d} icon={<AlertTriangle className="h-6 w-6" />} color="red" />
          </div>

          {/* Every teacher separately; a row opens that teacher's groups below. */}
          <Card>
            <CardContent className="p-0">
              {data.teachers.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">{t("knowledge.noTeachers")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                        <th className="px-6 py-3 font-semibold">{t("knowledge.teacher")}</th>
                        <th className="px-3 py-3 text-center font-semibold">{t("knowledge.groupsShort")}</th>
                        <th className="px-3 py-3 text-center font-semibold">{t("knowledge.students")}</th>
                        <th className="px-3 py-3 text-center font-semibold">{t("knowledge.tests7dShort")}</th>
                        <th className="px-3 py-3 text-center font-semibold">{t("knowledge.averageShort")}</th>
                        <th className="px-3 py-3 text-center font-semibold">{t("knowledge.inactiveShort")}</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.teachers.map((x) => {
                        const active = x.id === teacherId;
                        return (
                          <tr
                            key={x.id}
                            onClick={() => setParams({ teacher: x.id }, { replace: true })}
                            aria-selected={active}
                            className={cn(
                              "cursor-pointer border-b border-slate-100 transition last:border-0 dark:border-slate-800",
                              active ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                          >
                            <td className="px-6 py-3">
                              <span className="flex items-center gap-3">
                                <Avatar name={x.name} src={x.avatarUrl} size="sm" />
                                <span className="min-w-0">
                                  <span className={cn("block truncate font-semibold", active ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-slate-100")}>{x.name}</span>
                                  {x.phone && <span className="text-xs text-slate-400">{x.phone}</span>}
                                </span>
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center font-semibold text-slate-800 dark:text-slate-100">{x.groups}</td>
                            <td className="px-3 py-3 text-center text-slate-700 dark:text-slate-200">{x.students}</td>
                            <td className="px-3 py-3 text-center font-semibold text-slate-800 dark:text-slate-100">{x.tests7d}</td>
                            <td className={cn("px-3 py-3 text-center font-semibold", scoreTone(x.average7d))}>{x.average7d === null ? "—" : `${x.average7d}%`}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", x.inactive7d ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300")}>
                                {x.inactive7d}
                              </span>
                            </td>
                            <td className="pr-4">
                              <ChevronRight className={cn("h-4 w-4 transition", active ? "rotate-90 text-brand-600" : "text-slate-400")} aria-hidden />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {teacher && (
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <UsersRound className="h-5 w-5 text-brand-600" aria-hidden />
                {t("knowledge.teacherGroups", { name: teacher.name })}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                <ClipboardList className="h-4 w-4" aria-hidden />
                {t("knowledge.teacherWeek", { tests: teacher.tests7d, students: teacher.students })}
              </p>
              {/* Keyed by teacher: switching teachers starts again from their first group. */}
              <GroupKnowledgePanel
                key={teacher.id}
                teacherId={teacher.id}
                studentPath={(id) => `/admin/knowledge/students/${id}?teacher=${teacher.id}`}
                emptyTitle={t("knowledge.teacherNoGroups")}
                emptyHint={t("knowledge.teacherNoGroupsHint")}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
