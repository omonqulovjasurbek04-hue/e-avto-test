import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { courseService } from "@/services/course.service";
import type { Course } from "@/types/course";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import CoursePackages from "@/components/course/CoursePackages";
import type { PublicPackage } from "@/services/platform.service";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
} from "lucide-react";

export default function CourseDetails() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PublicPackage[]>([]);
  // Opened from the student panel ("Kurslar"): back link and layout stay in the panel.
  const location = useLocation();
  const inPanel = location.pathname.startsWith("/my-courses");
  const catalog = inPanel ? "/my-courses" : "/courses";

  useEffect(() => {
    if (!courseId) return;
    courseService
      .getCourse(courseId)
      .then(setCourse)
      .finally(() => setLoading(false));
  }, [courseId]);

  // "…#packages" links (from a locked lesson or test) land on the prices once the page is there.
  useEffect(() => {
    if (loading || location.hash !== "#packages") return;
    // After the app's scroll-to-top on navigation has run.
    const timer = setTimeout(() => document.getElementById("packages")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    return () => clearTimeout(timer);
  }, [loading, location.hash]);

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
        <Link to={catalog}>
          <Button variant="outline">{t("courses.title")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={inPanel ? "space-y-8 pb-16" : "container-page py-10 space-y-8 pb-16"}>
      <Link
        to={catalog}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition"
      >
        <ArrowLeft className="h-4 w-4" /> {t("courses.title")}
      </Link>

      {/*
        Course header: on wider screens the photo fills the right half and fades into the dark
        gradient; the title sits on the left and the price with the buy button at the bottom right.
        On phones the photo is a banner on top and everything stacks under it.
      */}
      <section
        id="packages"
        className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white shadow-xl"
      >
        {course.thumbnail && (
          <>
            <img src={course.thumbnail} alt="" aria-hidden="true" className="h-56 w-full object-cover sm:h-72 md:hidden" />
            <img
              src={course.thumbnail}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 hidden h-full w-[55%] object-cover object-[center_70%] md:block [mask-image:linear-gradient(to_right,transparent,black_40%)]"
            />
            {/* Darkens the bottom of the photo so the price over it stays readable. */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 hidden h-1/2 bg-gradient-to-t from-slate-950/80 to-transparent md:block" />
          </>
        )}
        <div className="relative grid gap-8 p-6 sm:p-10 md:min-h-[480px] md:grid-cols-2 md:items-end lg:p-12">
          <div className="space-y-6 md:self-center">
            <h1 className="text-3xl font-black leading-tight sm:text-5xl">{course.title}</h1>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-lg">{course.description}</p>
            <div className="flex flex-wrap items-center gap-6 border-t border-white/10 pt-4 text-sm text-slate-300 sm:text-base">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-400" />
                {t("courseDetails.lessonCount", { count: course.totalLessons ?? 0 })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand-400" />
                {(course.totalDurationMinutes ?? 0) >= 60
                  ? t("courses.hours", { count: Math.round((course.totalDurationMinutes ?? 0) / 60) })
                  : t("courses.minutes", { count: course.totalDurationMinutes ?? 0 })}
              </span>
              {/* Access period; with several packages each one shows its own next to its price. */}
              {packages.length === 1 && (
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-brand-400" />
                  {packages[0].durationDays ? t("pricing.days", { count: packages[0].durationDays }) : t("pricing.unlimited")}
                </span>
              )}
            </div>
          </div>

          {/* Price and buy button of this course (the old "Narxlar" page lives here now). */}
          <div className="w-full md:pl-8">
            <CoursePackages courseId={course.id} variant="hero" onLoaded={setPackages} />
          </div>
        </div>
      </section>
    </div>
  );
}