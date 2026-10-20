import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Course } from "@/types/course";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth.store";
import { Progress } from "@/components/ui/Progress";
import { formatMoney } from "@/utils/money";

export default function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation();
  // Signed in: the course opens in the student panel. A guest is sent to sign up first and
  // comes back to this course afterwards.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const panelPath = `/my-courses/${course.id}`;
  return (
    <Link
      to={isAuthenticated ? panelPath : ROUTES.register}
      state={isAuthenticated ? undefined : { from: { pathname: panelPath } }}
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
      </div>

      <div className="p-5 space-y-3">
        <h3 className="font-bold text-base text-slate-900 group-hover:text-brand-600 dark:text-slate-100 transition line-clamp-1">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-xs text-slate-500 leading-relaxed">{course.description}</p>

        {(course.price || course.studyPeriod) && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            {course.studyPeriod && (
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <CalendarDays className="h-3.5 w-3.5 text-brand-500" /> {course.studyPeriod}
              </span>
            )}
            {course.price && (
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <Wallet className="h-3.5 w-3.5 text-brand-500" /> {t("courses.priceFrom", { price: formatMoney(course.price.amount, course.price.currency) })}
              </span>
            )}
          </div>
        )}

        {course.progress !== undefined && (
          <div className="pt-2">
            <Progress value={course.progress} showValueLabel size="sm" />
          </div>
        )}
      </div>
    </Link>
  );
}
