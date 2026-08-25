import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/hooks/useDebounce";
import { lessonService } from "@/services/lesson.service";
import type { Lesson } from "@/types/lesson";
import LessonCard from "@/components/lesson/LessonCard";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Lessons() {
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
