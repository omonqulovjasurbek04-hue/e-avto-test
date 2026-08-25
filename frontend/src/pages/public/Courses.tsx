import { useEffect, useState } from "react";
import { Search, BookOpen, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CATEGORIES, DIFFICULTIES } from "@/constants/categories";
import { courseService } from "@/services/course.service";
import type { Course } from "@/types/course";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import CourseCard from "@/components/course/CourseCard";

export default function Courses() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [sort, setSort] = useState("newest");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const categoryOptions = [
    { value: "all", label: t("courses.allCategories") },
    ...CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  const difficultyOptions = [
    { value: "all", label: t("courses.allCategories") },
    ...DIFFICULTIES.map((d) => ({ value: d.value, label: t(`courses.difficulty.${d.value}`) })),
  ];

  const sortOptions = [
    { value: "newest", label: "Eng yangi" },
    { value: "title", label: "Nom bo'yicha" },
  ];

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
        if (active) setError(e instanceof Error ? e.message : t("common.error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, category, difficulty, sort, t]);

  const hasFilters = search !== "" || category !== "all" || difficulty !== "all" || sort !== "newest";

  const handleReset = () => {
    setSearch("");
    setCategory("all");
    setDifficulty("all");
    setSort("newest");
  };

  return (
    <div className="container-page py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t("courses.title")}</h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-xl">
            {t("courses.description")}
          </p>
        </div>

        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            className="self-start md:self-auto text-xs"
          >
            {t("common.cancel")}
          </Button>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <Input
            label={t("common.search")}
            placeholder={t("courses.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            label={t("courses.allCategories")}
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Select
            label={t("common.general")}
            options={difficultyOptions}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          />
          <Select
            label={t("common.search")}
            options={sortOptions}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setLoading(true)} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title={t("courses.noCourses")}
          description={t("common.noResults")}
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