import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { courseService } from "@/services/course.service";
import type { Course } from "@/types/course";
import type { Lesson } from "@/types/lesson";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

export default function CourseDetails() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      courseService.getCourse(courseId),
      courseService.getLessons(courseId),
    ])
      .then(([cData, lData]) => {
        setCourse(cData);
        setLessons(lData);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container-page py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t("courses.noCourses")}</h2>
        <Link to="/courses">
          <Button variant="outline">{t("courses.title")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 space-y-8 pb-16">
      <Link
        to="/courses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition"
      >
        <ArrowLeft className="h-4 w-4" /> {t("courses.title")}
      </Link>

      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {course.category && (
            <Badge variant="primary" className="bg-brand-600 text-white font-bold">
              {course.category}
            </Badge>
          )}
          {course.difficulty && (
            <Badge variant="neutral" className="bg-white/10 text-white border-white/20">
              {t(`courses.difficulty.${course.difficulty}`)}
            </Badge>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-black">{course.title}</h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
          {course.description}
        </p>

        <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-slate-300 pt-2 border-t border-slate-800">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-brand-400" />
            {t("courseDetails.lessonCount", { count: course.totalLessons || lessons.length })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-brand-400" />
            {t("courseDetails.duration", { hours: Math.round((course.totalDurationMinutes || 180) / 60) })}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Rasmiy YHQ 2026
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("courseDetails.lessonsList")}
        </h2>

        <div className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {lessons.length > 0 ? (
            lessons.map((lesson: Lesson, idx: number) => (
              <div
                key={lesson.id || idx}
                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-xs font-black text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {lesson.title}
                    </h4>
                    <span className="text-xs text-slate-400">
                      {lesson.durationMinutes || 15} {t("common.min")} · {lesson.questionCount || 10} {t("common.question")}
                    </span>
                  </div>
                </div>

                <Link to={`/lessons/${lesson.id}/video`}>
                  <Button size="sm" variant="outline" leftIcon={<PlayCircle className="h-4 w-4 text-brand-600" />}>
                    {t("lessonDetails.startLesson")}
                  </Button>
                </Link>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              {t("courseDetails.noLessons")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}