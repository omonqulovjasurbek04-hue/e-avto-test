import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Clock } from "lucide-react";
import type { Course } from "@/types/course";
import { ROUTES } from "@/constants/routes";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";

export default function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation();
  const lessonsCount = course.lessonsCount ?? course.totalLessons ?? 0;
  const durationHours = course.durationHours ?? Math.round((course.totalDurationMinutes || 0) / 60);

  return (
    <Link
      to={ROUTES.courseDetails(course.id)}
      className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900">
            <BookOpen className="h-12 w-12 text-brand-400/80" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {course.category && (
            <Badge variant="primary" className="bg-brand-600/90 text-white backdrop-blur font-bold shadow-sm">
              {course.category}
            </Badge>
          )}
          {course.difficulty && (
            <Badge variant="neutral" className="bg-black/40 text-white backdrop-blur border-white/20">
              {t(`courses.difficulty.${course.difficulty}`)}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 space-y-3">
        <h3 className="font-bold text-base text-slate-900 group-hover:text-brand-600 dark:text-slate-100 transition line-clamp-1">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-xs text-slate-500 leading-relaxed">{course.description}</p>

        <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <BookOpen className="h-3.5 w-3.5 text-brand-500" /> {lessonsCount} dars
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Clock className="h-3.5 w-3.5 text-brand-500" /> {durationHours} soat
          </span>
        </div>

        {course.progress !== undefined && (
          <div className="pt-2">
            <Progress value={course.progress} showValueLabel size="sm" />
          </div>
        )}
      </div>
    </Link>
  );
}
