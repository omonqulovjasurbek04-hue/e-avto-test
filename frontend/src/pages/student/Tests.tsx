import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { courseService } from "@/services/course.service";
import { studentService } from "@/services/platform.service";
import { Alert } from "@/components/ui/Alert";
import type { Course } from "@/types/course";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { TicketMatrix } from "@/components/test/TicketMatrix";
import { CoursePicker } from "@/components/test/CoursePicker";
import { TicketEditGrid } from "@/components/test/TicketEditGrid";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";

const TICKET_EDITORS = ["TEACHER", "ADMIN", "SUPERADMIN"];

export default function Tests() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Which courses this student bought: the server decides, the page only mirrors it (null = still loading).
  const [access, setAccess] = useState<{ all: boolean; courseIds: string[] } | null>(null);
  // The course and the teacher's edit mode live in the URL, so coming back from a ticket keeps both.
  const [params, setParams] = useSearchParams();
  const selected = params.get("course");
  const editing = params.get("edit") === "1";
  const canEdit = TICKET_EDITORS.includes(useAuthStore((s) => s.user?.role) ?? "");
  const setParam = (key: string, value: string | null) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  const canOpen = (courseId: string) => !access || access.all || access.courseIds.includes(courseId);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [cs, ac] = await Promise.all([
        courseService.getCourses(),
        // If this fails every course is offered and the server still refuses a locked test.
        studentService.courseAccess().catch(() => null),
      ]);
      setCourses(cs);
      setAccess(ac);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Only the courses this student can test in; the rest are bought on the course pages.
  const owned = courses.filter((c) => canOpen(c.id));
  const course = owned.find((c) => c.id === selected) ?? owned[0];

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("tests.title")}</h1>
        {!loading && course?.category && <Badge variant="primary">{course.category}</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {t("tests.description")}
      </p>

      {loading ? (
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      ) : error ? (
        <div className="mt-6">
          <ErrorState onRetry={load} />
        </div>
      ) : !course ? (
        <Alert variant="warning" title={t("tests.lockedTitle")} className="mt-6">
          {t("tests.lockedHint")}{" "}
          <Link to="/my-courses" className="font-semibold underline">{t("nav.courses")}</Link>
        </Alert>
      ) : (
        <>
          {/* With more than one course (bought, or all of them for a teacher) one picker chooses whose tickets to show. */}
          {(owned.length > 1 || canEdit) && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              {owned.length > 1 && (
                <div className="min-w-0 flex-1">
                  <CoursePicker courses={owned} value={course.id} onChange={(id) => setParam("course", id)} />
                </div>
              )}
              {/* Teachers switch the grid into edit mode: a ticket then opens its questions instead of a test. */}
              {canEdit && (
                <Button
                  variant={editing ? "success" : "outline"}
                  size="lg"
                  className="h-auto min-h-[3.5rem] shrink-0 rounded-2xl px-5"
                  leftIcon={editing ? <Check className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
                  onClick={() => setParam("edit", editing ? null : "1")}
                >
                  {editing ? t("ticketEdit.done") : t("ticketEdit.open")}
                </Button>
              )}
            </div>
          )}
          <div className="mt-6">
            {editing && canEdit ? <TicketEditGrid key={course.id} courseId={course.id} /> : <TicketMatrix key={course.id} courseId={course.id} />}
          </div>
        </>
      )}
    </div>
  );
}
