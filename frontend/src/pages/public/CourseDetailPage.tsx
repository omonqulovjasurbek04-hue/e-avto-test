import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Course } from "../../types/course";
import { courseService } from "../../services/course.service";
import { Button, Card, CardContent, Badge, Spinner } from "../../components/ui";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  PlayCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      setIsLoading(true);
      const data = await courseService.getCourseById(courseId);
      setCourse(data);
      setIsLoading(false);
    };
    fetchCourse();
  }, [courseId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container-page py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Kurs topilmadi</h2>
        <Link to="/courses">
          <Button variant="primary">Barcha kurslarga qaytish</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 space-y-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/courses" className="hover:text-brand-600 transition">
          Kurslar
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-800 dark:text-slate-200 font-semibold">{course.title}</span>
      </div>

      {/* Hero Course Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <Badge variant="accent">{course.category} Toifa Kursi</Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
            {course.title}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {course.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 pt-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2">
              <BookOpen className="h-4 w-4 text-brand-600" />
              <span>{course.lessons?.length || course.totalLessons} ta dars</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>{course.totalDurationMinutes} daqiqa ta'lim</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>2025 YHQ Standarti</span>
            </div>
          </div>
        </div>

        {/* Action card */}
        <div className="lg:col-span-4">
          <Card className="p-6 space-y-6 shadow-xl border-brand-500/20">
            <img
              src={course.imageUrl}
              alt={course.title}
              className="h-48 w-full rounded-xl object-cover"
            />
            <div className="space-y-3">
              <Link to={`/lessons/${course.lessons?.[0]?.id || "lesson-1"}`}>
                <Button size="lg" variant="primary" className="w-full font-bold" rightIcon={<PlayCircle className="h-5 w-5" />}>
                  Darslarni Boshlash
                </Button>
              </Link>
              <Link to="/tests">
                <Button size="md" variant="outline" className="w-full">
                  Imtihon Testini Ishlash
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Syllabus / Lessons List */}
      <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Darslar Rejasi (Mavzular)
        </h2>

        <div className="space-y-3">
          {course.lessons && course.lessons.length > 0 ? (
            course.lessons.map((lesson, idx) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {lesson.title}
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lesson.durationMinutes} daqiqa · {lesson.questionCount} ta savol
                    </span>
                  </div>
                </div>

                <Link to={`/lessons/${lesson.id}`}>
                  <Button size="sm" variant="ghost" rightIcon={<ChevronRight className="h-4 w-4" />}>
                    O'rganish
                  </Button>
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ushbu kurs darslari tez orada qo'shiladi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
