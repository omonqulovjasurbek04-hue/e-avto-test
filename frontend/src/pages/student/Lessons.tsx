import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { lessonService } from "@/services/lesson.service";
import type { Lesson } from "@/types/lesson";
import LessonCard from "@/components/lesson/LessonCard";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Lessons() {
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
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Video darslar</h1>
      <p className="mt-1 text-sm text-slate-500">Barcha mavjud darslar ro'yxati</p>

      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Darslarni qidirish..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState onRetry={load} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Darslar topilmadi" description="Qidiruv bo'yicha natija yo'q." />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3">
          {filtered.map((l, i) => (
            <LessonCard key={l.id} lesson={l} index={i} courseId={l.courseId} />
          ))}
        </div>
      )}
    </div>
  );
}
