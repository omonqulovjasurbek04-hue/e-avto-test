import { Link } from "react-router-dom";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import type { Lesson } from "@/types/lesson";
import { ROUTES } from "@/constants/routes";
import { formatDuration } from "@/utils/formatTime";

export default function LessonCard({
  lesson,
  index,
  courseId,
}: {
  lesson: Lesson;
  index: number;
  courseId: string;
}) {
  const duration = lesson.duration || lesson.durationMinutes || 0;

  return (
    <Link
      to={ROUTES.lessonDetails(lesson.id)}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-400 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          {index + 1}
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{lesson.title}</p>
          <p className="text-xs text-slate-500">{formatDuration(duration)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {lesson.completed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-slate-300" />
        )}
        <PlayCircle className="h-5 w-5 text-brand-600" />
      </div>
    </Link>
  );
}
