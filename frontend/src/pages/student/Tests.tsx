import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { courseService } from "@/services/course.service";
import { studentService } from "@/services/platform.service";
import { Alert } from "@/components/ui/Alert";
import { useStartTest } from "@/hooks/useStartTest";
import type { Course } from "@/types/course";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

export default function Tests() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { startTest, starting } = useStartTest();
  const [startingId, setStartingId] = useState<string | null>(null);
  // Which courses this student bought: the server decides, the page only mirrors it (null = still loading).
  const [access, setAccess] = useState<{ all: boolean; courseIds: string[] } | null>(null);
  const canOpen = (courseId: string) => !access || access.all || access.courseIds.includes(courseId);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [cs, ac] = await Promise.all([
        courseService.getCourses(),
        // If this fails the buttons stay enabled and the server still refuses a locked test.
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

  const handleStart = async (courseId: string) => {
    setStartingId(courseId);
    await startTest(courseId);
    setStartingId(null);
  };

  // Only the courses this student can test in; the rest are bought on the course pages.
  const owned = courses.filter((c) => canOpen(c.id));
  // Their categories (Yengil avtomobillar, …) are shown once, next to the title.
  const categories = [...new Set(owned.map((c) => c.category).filter((c): c is string => Boolean(c)))];

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("tests.title")}</h1>
        {!loading && categories.map((cat) => (
          <Badge key={cat} variant="primary">{cat}</Badge>
        ))}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {t("tests.description")}
      </p>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState onRetry={load} />
        </div>
      ) : owned.length === 0 ? (
        <Alert variant="warning" title={t("tests.lockedTitle")} className="mt-6">
          {t("tests.lockedHint")}{" "}
          <Link to="/my-courses" className="font-semibold underline">{t("nav.courses")}</Link>
        </Alert>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {owned.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex h-full flex-col">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description}</p>
                {/* Pushes the button to the bottom so the cards line up. */}
                <div className="flex-1" />
                <Button
                  className="mt-4"
                  loading={starting && startingId === c.id}
                  leftIcon={<PlayCircle className="h-5 w-5" />}
                  onClick={() => handleStart(c.id)}
                >
                  {t("tests.startTest")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
