import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { teacherService, type GroupInput } from "@/services/platform.service";
import { courseService } from "@/services/course.service";
import { useLoad } from "@/hooks/useLoad";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { GroupForm, rhythmLabel } from "@/components/groups/GroupForm";

export default function TeacherGroups() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useLoad(() => teacherService.groups(), []);
  // "Open a group" from the dashboard arrives as ?new=1 and opens the form right away.
  const [opening, setOpening] = useState(useSearchParams()[0].get("new") === "1");
  const [busy, setBusy] = useState(false);
  // Published courses: a teacher opens groups for the courses the school sells.
  const courses = useLoad(() => (opening ? courseService.getCourses() : Promise.resolve([])), [opening]);

  const open = async (input: GroupInput) => {
    setBusy(true);
    try {
      const g = await teacherService.createGroup(input);
      toast.success(t("groupForm.created", { count: g.lessonsCreated }));
      setOpening(false);
      navigate(`/teacher/groups/${g.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("teacher.groups.title")}</h1>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpening(true)}>{t("groupForm.open")}</Button>
      </div>
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
                  {rhythmLabel(g, t) && (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400">
                      <CalendarDays className="h-4 w-4" /> {rhythmLabel(g, t)}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Users className="h-4 w-4" /> {t("teacher.groups.students", { count: g._count.members, capacity: g.capacity })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={opening} onClose={() => setOpening(false)} title={t("groupForm.open")} maxWidth="lg">
        {opening && <GroupForm courses={courses.data ?? []} busy={busy} onSubmit={open} onCancel={() => setOpening(false)} />}
      </Modal>
    </div>
  );
}
