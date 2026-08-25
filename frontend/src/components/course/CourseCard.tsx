import { Link } from "react-router-dom";
import { BookOpen, Clock } from "lucide-react";
import type { Course } from "@/types/course";
import { ROUTES } from "@/constants/routes";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";

export default function CourseCard({ course }: { course: Course }) {
  const lessonsCount = course.lessonsCount ?? course.totalLessons ?? 0;
  const durationHours = course.durationHours ?? Math.round((course.totalDurationMinutes || 0) / 60);

  return (
    <Link
      to={ROUTES.courseDetails(course.id)}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-slate-800 to-brand-600">
        <BookOpen className="h-10 w-10 text-white/80" />
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="primary">{course.category}</Badge>
          {course.difficulty && (
            <Badge variant="neutral">
              {course.difficulty}
            </Badge>
          )}
        </div>
        <h3 className="mt-3 font-semibold text-slate-800 group-hover:text-brand-600 dark:text-slate-100">
          {course.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{course.description}</p>

        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-4 w-4" /> {lessonsCount} dars
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" /> {durationHours} soat
          </span>
        </div>

        {course.progress !== undefined && (
          <div className="mt-4">
            <Progress value={course.progress} showValueLabel />
          </div>
        )}
      </div>
    </Link>
  );
}
