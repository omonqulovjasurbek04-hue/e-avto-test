import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { teacherService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function TeacherGroups() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => teacherService.groups(), []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">{t("teacher.groups.title")}</h1>
      {loading && !data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState title={t("teacher.groups.empty")} description={t("teacher.groups.emptyHint")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((g) => (
            <Link key={g.id} to={`/teacher/groups/${g.id}`}>
              <Card className="transition hover:border-primary-400">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-slate-900 dark:text-white">{g.name}</h2>
                    <Badge variant={g.status === "ACTIVE" ? "success" : "neutral"}>{g.status === "ACTIVE" ? t("teacher.groups.active") : t("teacher.groups.archived")}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{g.course.title}</p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Users className="h-4 w-4" /> {t("teacher.groups.students", { count: g._count.members, capacity: g.capacity })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
