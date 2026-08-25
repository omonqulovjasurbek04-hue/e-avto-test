import { useEffect, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { CATEGORIES, DIFFICULTIES } from "@/constants/categories";
import { courseService } from "@/services/course.service";
import type { Course } from "@/types/course";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import CourseCard from "@/components/course/CourseCard";

const categoryOptions = [
  { value: "all", label: "Barcha kategoriyalar" },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const difficultyOptions = [
  { value: "all", label: "Barcha darajalar" },
  ...DIFFICULTIES.map((d) => ({ value: d.value, label: d.label })),
];

const sortOptions = [
  { value: "newest", label: "Eng yangi" },
  { value: "title", label: "Nom bo'yicha" },
];

export default function Courses() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [sort, setSort] = useState("newest");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    courseService
      .getCourses({
        search: debouncedSearch,
        category: category === "all" ? undefined : category,
        difficulty: difficulty === "all" ? undefined : difficulty,
        sort,
      })
      .then((data) => {
        if (active) setCourses(data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Kurslarni yuklab bo'lmadi");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, category, difficulty, sort]);

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kurslar</h1>
        <p className="mt-2 text-slate-500">
          Haydovchilik bo'yicha barcha kurslarni qidiring va tanlang.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Kurslarni qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          label="Kategoriya"
          options={categoryOptions}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Select
          label="Daraja"
          options={difficultyOptions}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        />
        <Select
          label="Saralash"
          options={sortOptions}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setLoading(true)} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="Kurslar topilmadi"
          description="Qidiruv yoki filtrlarni o'zgartirib ko'ring."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
