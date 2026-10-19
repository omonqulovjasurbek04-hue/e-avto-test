import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { courseService } from "@/services/course.service";
import type { Course, CourseSection } from "@/types/course";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import CourseCard from "@/components/course/CourseCard";

const SECTIONS: CourseSection[] = ["MAIN", "COMBINED", "EXTRA"];

export default function Courses() {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    courseService
      .getCourses() // API order = the "order" set by the admin
      .then((data) => {
        if (active) setCourses(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : t("common.error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t, i18n.language, attempt]);

  return (
    <div className="container-page py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t("courses.title")}</h1>
        <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
          {t("courses.description")}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title={t("courses.noCourses")}
          description={t("common.noResults")}
        />
      ) : (
        // One block per catalogue section, in the admin's order inside each block; empty blocks are hidden.
        <div className="space-y-12">
          {SECTIONS.map((section) => {
            const list = courses.filter((c) => (c.section ?? "MAIN") === section);
            if (list.length === 0) return null;
            return (
              <section key={section} aria-labelledby={`courses-${section}`} className="space-y-5">
                <div>
                  <h2 id={`courses-${section}`} className="text-xl font-bold text-slate-900 dark:text-white">{t(`courses.section.${section}`)}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(`courses.sectionHint.${section}`)}</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </div>
              </section>
            );
          })}
          {courses.some((c) => c.price?.isSample) && <p className="text-xs text-slate-500 dark:text-slate-400">{t("courses.sampleNote")}</p>}
        </div>
      )}
    </div>
  );
}
