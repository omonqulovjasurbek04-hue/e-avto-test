import { useEffect, useState } from "react";
import { BookOpen, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { courseService } from "@/services/course.service";
import type { Course, CourseSection } from "@/types/course";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import CourseCard from "@/components/course/CourseCard";
import { Button } from "@/components/ui/Button";
import { useCourseEditor } from "@/components/admin/CourseEditor";
import { adminService } from "@/services/admin.service";
import type { AdminCourse } from "@/types/admin";
import { useAuthStore } from "@/store/auth.store";
import { can } from "@/lib/permissions";

const SECTIONS: CourseSection[] = ["MAIN", "COMBINED", "EXTRA"];

export default function Courses() {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Admins (catalog:manage) add, edit and delete courses right here; the server checks the right again.
  const manage = can(useAuthStore((st) => st.user?.role), "catalog:manage");
  const [adminCourses, setAdminCourses] = useState<AdminCourse[]>([]);
  const reload = () => setAttempt((n) => n + 1);
  const editor = useCourseEditor(reload);

  useEffect(() => {
    if (!manage) return;
    adminService.listCourses().then(setAdminCourses).catch(() => setAdminCourses([]));
  }, [manage, attempt]);
  const adminOf = (id: string) => adminCourses.find((c) => c.id === id);
  // Drafts are not in the public catalogue; the admin still needs to reach them.
  const drafts = adminCourses.filter((c) => !c.isPublished);

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t("courses.title")}</h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
            {t("courses.description")}
          </p>
        </div>
        {manage && (
          <Button size="lg" leftIcon={<Plus className="h-5 w-5" />} onClick={() => editor.openNew(adminCourses.length + 1)}>
            {t("admin.courses.new")}
          </Button>
        )}
      </div>

      {manage && drafts.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <EyeOff className="h-4 w-4" aria-hidden /> {t("courses.drafts")}
          </p>
          <div className="flex flex-wrap gap-2">
            {drafts.map((d) => (
              <span key={d.id} className="flex items-center gap-1 rounded-xl bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {d.title}
                <button type="button" onClick={() => editor.openEdit(d)} aria-label={t("admin.common.edit")} className="rounded-lg p-1.5 hover:bg-white hover:text-brand-600 dark:hover:bg-slate-700">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => editor.askDelete(d)} aria-label={t("admin.common.delete")} className="rounded-lg p-1.5 hover:bg-white hover:text-red-600 dark:hover:bg-slate-700">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

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
                  {list.map((c) => {
                    const full = manage ? adminOf(c.id) : undefined;
                    if (!full) return <CourseCard key={c.id} course={c} />;
                    return (
                      <div key={c.id} className="relative">
                        <CourseCard course={c} />
                        <div className="absolute right-3 top-3 z-10 flex gap-2">
                          <button
                            type="button"
                            onClick={() => editor.openEdit(full)}
                            aria-label={t("admin.common.edit")}
                            title={t("admin.common.edit")}
                            className="rounded-xl bg-white/95 p-2.5 text-slate-700 shadow-md backdrop-blur transition hover:bg-white hover:text-brand-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.askDelete(full)}
                            aria-label={t("admin.common.delete")}
                            title={t("admin.common.delete")}
                            className="rounded-xl bg-white/95 p-2.5 text-red-600 shadow-md backdrop-blur transition hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {courses.some((c) => c.price?.isSample) && <p className="text-xs text-slate-500 dark:text-slate-400">{t("courses.sampleNote")}</p>}
        </div>
      )}
      {manage && editor.dialogs}
    </div>
  );
}
