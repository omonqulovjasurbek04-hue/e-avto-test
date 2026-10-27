import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/hooks/useDebounce";
import { lessonService } from "@/services/lesson.service";
import type { Lesson } from "@/types/lesson";
import LessonCard from "@/components/lesson/LessonCard";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CoursePicker } from "@/components/test/CoursePicker";
import { useLessonEditor } from "@/components/admin/LessonEditor";
import { adminService } from "@/services/admin.service";
import type { AdminCourse, AdminLesson } from "@/types/admin";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth.store";
import { useStoredState } from "@/hooks/useStoredState";
import { can } from "@/lib/permissions";
import { cn } from "@/utils/cn";

/** Admins (catalog:manage) manage the lessons here; everyone else studies them. */
export default function Lessons() {
  const manage = can(useAuthStore((s) => s.user?.role), "catalog:manage");
  return manage ? <ManageLessons /> : <StudyLessons />;
}

/**
 * The lessons for an admin: one course at a time (drafts included), with add, edit and delete; the video
 * is set or uploaded in the same window.
 */
function ManageLessons() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [stored, setStored] = useStoredState("lessons.course");
  const reload = () => setAttempt((n) => n + 1);
  const editor = useLessonEditor(courses, reload);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([adminService.listCourses(), adminService.listLessons()])
      .then(([cs, ls]) => {
        setCourses(cs);
        setLessons(ls);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [attempt]);

  const course = courses.find((c) => c.id === stored) ?? courses[0];
  const list = lessons.filter((l) => l.courseId === course?.id).sort((a, b) => a.order - b.order);

  return (
    <div className="container-page space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">{t("lessons.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("lessons.manageHint")}</p>
        </div>
        <Button size="lg" disabled={!course} leftIcon={<Plus className="h-5 w-5" />} onClick={() => editor.openNew(course?.id, list.length + 1)}>
          {t("admin.lessons.new")}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !course ? (
        <EmptyState title={t("admin.lessons.empty")} description={t("admin.lessons.emptyHint")} />
      ) : (
        <>
          <CoursePicker
            courses={courses.map((c) => ({ id: c.id, title: c.title, category: c.category?.name ?? null, meta: t("lessons.count", { count: lessons.filter((l) => l.courseId === c.id).length }) }))}
            value={course.id}
            onChange={setStored}
          />
          {list.length === 0 ? (
            <EmptyState title={t("admin.lessons.empty")} description={t("admin.lessons.emptyHint")} />
          ) : (
            <ol className="space-y-2">
              {list.map((l, i) => (
                <li
                  key={l.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-white p-3 dark:bg-slate-900",
                    l.isPublished ? "border-slate-200 dark:border-slate-800" : "border-dashed border-slate-300 dark:border-slate-700"
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{i + 1}</span>
                  <Link to={ROUTES.lessonDetails(l.id)} className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100">{l.title}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {t("admin.lessons.minutesShort", { count: Math.round(l.duration / 60) })}
                      {l.videoUrl && <Video className="h-3.5 w-3.5" aria-label={t("admin.lessons.videoSection")} />}
                    </span>
                  </Link>
                  {!l.isPublished && <Badge variant="neutral">{t("admin.common.draft")}</Badge>}
                  <button type="button" onClick={() => editor.openEdit(l)} aria-label={t("admin.common.edit")} title={t("admin.common.edit")} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => editor.askDelete(l)} aria-label={t("admin.common.delete")} title={t("admin.common.delete")} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      {editor.dialogs}
    </div>
  );
}

function StudyLessons() {
  const { t } = useTranslation();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await lessonService.getLessons();
      setLessons(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase().trim();
    if (!q) return lessons;
    return lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q)
    );
  }, [lessons, debounced]);

  return (
    <div className="container-page py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{t("lessons.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("lessons.description")}</p>
      </div>

      <div className="max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("lessons.searchPlaceholder")}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t("lessons.noLessons")} description={t("common.noResults")} />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((l, i) => (
            <LessonCard key={l.id} lesson={l} index={i} courseId={l.courseId} />
          ))}
        </div>
      )}
    </div>
  );
}
