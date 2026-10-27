import { useState } from "react";
import { Phone, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { teacherService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { useStoredState } from "@/hooks/useStoredState";
import { cn } from "@/utils/cn";
import { GroupKnowledgePanel, scoreTone } from "@/components/knowledge/GroupKnowledgePanel";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const percent = (v: number | null) => (v === null ? "—" : `${v}%`);

/**
 * Knowledge control for the admin, master-detail: the totals in one strip, the teachers on the left
 * (searchable, each with their week in numbers), the chosen teacher's groups and students on the right.
 */
export default function AdminKnowledge() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => teacherService.teachersKnowledge(), []);
  // The chosen teacher is remembered in the browser, so coming back from a student keeps it.
  const [stored, setStored] = useStoredState("knowledge.teacher");
  const [query, setQuery] = useState("");
  const teacherId = (stored && data?.teachers.some((x) => x.id === stored) ? stored : null) ?? data?.teachers.find((x) => x.groups > 0)?.id ?? data?.teachers[0]?.id;
  const teacher = data?.teachers.find((x) => x.id === teacherId);
  const shown = (data?.teachers ?? []).filter((x) => !query.trim() || x.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("knowledge.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("knowledge.adminSubtitle")}</p>

      {loading && !data ? (
        <Skeleton className="mt-6 h-96 w-full rounded-2xl" />
      ) : error || !data ? (
        <div className="mt-6">
          <ErrorState message={error ?? undefined} onRetry={reload} />
        </div>
      ) : data.teachers.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={t("knowledge.noTeachers")} />
        </div>
      ) : (
        <>
          {/* All teachers together, in one slim strip. */}
          <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-5 sm:divide-x sm:divide-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:sm:divide-slate-800">
            {[
              [t("knowledge.teachersShort"), String(data.summary.teachers), ""],
              [t("knowledge.groupsShort"), String(data.summary.groups), ""],
              [t("knowledge.students"), String(data.summary.students), ""],
              [t("knowledge.average7d"), percent(data.summary.average7d), scoreTone(data.summary.average7d)],
              [t("knowledge.inactive7d"), String(data.summary.inactive7d), data.summary.inactive7d ? "text-red-600" : "text-emerald-600"],
            ].map(([label, value, tone]) => (
              <div key={label} className="px-4 py-3">
                <p className={cn("text-xl font-bold text-slate-900 dark:text-white", tone)}>{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Teachers: pick one; the list stays in view while the details scroll. */}
            <Card className="lg:sticky lg:top-20">
              <CardContent className="p-3">
                {data.teachers.length > 5 && (
                  <label className="relative mb-2 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("knowledge.searchTeacher")}
                      aria-label={t("knowledge.searchTeacher")}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                )}
                <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
                  {shown.map((x) => {
                    const active = x.id === teacherId;
                    return (
                      <li key={x.id}>
                        <button
                          type="button"
                          onClick={() => setStored(x.id)}
                          aria-pressed={active}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                            active ? "bg-brand-600 text-white shadow-sm" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <Avatar name={x.name} src={x.avatarUrl} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-sm font-semibold", !active && "text-slate-800 dark:text-slate-100")}>{x.name}</span>
                            <span className={cn("block text-xs", active ? "text-brand-100" : "text-slate-500")}>
                              {t("knowledge.teacherLine", { groups: x.groups, students: x.students })}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className={cn("text-sm font-bold", active ? "text-white" : scoreTone(x.average7d))}>{percent(x.average7d)}</span>
                            {x.inactive7d > 0 && (
                              <span
                                title={t("knowledge.inactive7d")}
                                className={cn("rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-white/20 text-white" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300")}
                              >
                                {x.inactive7d}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">{t("knowledge.noMatch")}</li>}
                </ul>
              </CardContent>
            </Card>

            {teacher && (
              <section className="min-w-0">
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <Avatar name={teacher.name} src={teacher.avatarUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">{teacher.name}</h2>
                    <p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                      {teacher.phone && (
                        <a href={`tel:${teacher.phone}`} className="flex items-center gap-1 hover:text-brand-600">
                          <Phone className="h-3.5 w-3.5" aria-hidden /> {teacher.phone}
                        </a>
                      )}
                      <span>{t("knowledge.teacherWeek", { tests: teacher.tests7d, students: teacher.students })}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-bold", scoreTone(teacher.average7d))}>{percent(teacher.average7d)}</p>
                    <p className="text-xs text-slate-500">{t("knowledge.average7d")}</p>
                  </div>
                </div>
                {/* Keyed by teacher: switching teachers starts again from their first group. */}
                <GroupKnowledgePanel
                  key={teacher.id}
                  compact
                  teacherId={teacher.id}
                  emptyTitle={t("knowledge.teacherNoGroups")}
                  emptyHint={t("knowledge.teacherNoGroupsHint")}
                />
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
