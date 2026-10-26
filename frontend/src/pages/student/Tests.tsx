import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { courseService } from "@/services/course.service";
import { studentService } from "@/services/platform.service";
import { Alert } from "@/components/ui/Alert";
import type { Course } from "@/types/course";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { TicketMatrix } from "@/components/test/TicketMatrix";
import { cn } from "@/utils/cn";

export default function Tests() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Which courses this student bought: the server decides, the page only mirrors it (null = still loading).
  const [access, setAccess] = useState<{ all: boolean; courseIds: string[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
          {/* With more than one bought course the student picks whose tickets to show. */}
          {owned.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2" role="tablist">
              {owned.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={c.id === course.id}
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                    c.id === course.id
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  )}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          <div className="mt-6">
            <TicketMatrix key={course.id} courseId={course.id} />
          </div>
        </>
      )}
    </div>
  );
}
