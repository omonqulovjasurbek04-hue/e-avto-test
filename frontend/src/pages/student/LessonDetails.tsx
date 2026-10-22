import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PlayCircle, FileText, CheckCircle2, ArrowRight, Eye, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { lessonService } from "@/services/lesson.service";
import { useStartTest } from "@/hooks/useStartTest";
import { ROUTES } from "@/constants/routes";
import type { Lesson, WatchState } from "@/types/lesson";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import LessonLockNotice from "@/components/lesson/LessonLockNotice";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStudyTimer } from "@/hooks/useStudyTimer";
import LessonVideo from "@/components/video/LessonVideo";
import { formatTime } from "@/utils/formatTime";

/** "2026-10-25T…" -> "25.10.2026" (the order used in Uzbekistan, whatever the browser locale is). */
const dayMonthYear = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

export default function LessonDetails() {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Watching of the lesson video as counted by the server (the "next lesson" button waits for it).
  const [watch, setWatch] = useState<WatchState | null>(null);
  const { startTest, starting } = useStartTest();
  // Reading or watching an open lesson counts as study time.
  useStudyTimer("lesson", Boolean(lesson && !lesson.locked));

  const load = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError(false);
    try {
      const data = await lessonService.getLesson(lessonId);
      setLesson(data);
      setWatch(data?.watch ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onWatch = (seconds: number, position: number) => {
    if (!lesson) return;
    void lessonService
      .recordWatch(lesson.id, seconds, position)
      .then((w) => w && setWatch(w))
      .catch(() => undefined);
  };

  const handleStartTest = () => {
    if (lesson) void startTest(lesson.courseId);
  };

  if (loading) {
    return (
      <div className="container-page py-8 space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-8">
        <ErrorState onRetry={load} />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container-page py-8">
        <EmptyState
          title={t("common.noResults")}
          description={t("common.noResults")}
        />
      </div>
    );
  }

  const hasVideo = Boolean(lesson.videoUrl || lesson.privateVideoId);

  const completed = Boolean(lesson.completed || watch?.completed);

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Breadcrumb
          items={[
            { label: t("nav.lessons"), to: ROUTES.lessons },
            { label: lesson.title },
          ]}
        />
        {completed && (
          <Badge variant="success">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("lessons.completed")}
          </Badge>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lesson.title}
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* The private video plays right on this page; the video page is for external links and locked lessons. */}
            {((hasVideo && !lesson.privateVideoId) || lesson.locked) && (
              <Button
                variant="outline"
                leftIcon={<PlayCircle className="h-5 w-5" />}
                onClick={() => navigate(ROUTES.videoLesson(lesson.id))}
              >
                {t("videoLesson.title")}
              </Button>
            )}
            <Button loading={starting} disabled={lesson.locked} title={lesson.locked ? t("lock.title") : undefined} onClick={handleStartTest}>
              {t("tests.startTest")}
            </Button>
          </div>
        </div>

        {lesson.locked && <LessonLockNotice lesson={lesson} className="mt-6" />}

        {!lesson.locked && lesson.privateVideoId && (
          <div className="mt-6">
            {/* Progress of a video lesson comes only from the watch heartbeats, which the server checks. */}
            <LessonVideo videoId={lesson.privateVideoId} onWatch={onWatch} />
          </div>
        )}

        <Card className="mt-6">
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                <FileText className="h-5 w-5 text-brand-600" /> {t("lessonDetails.aboutLesson")}
              </h2>
              {/* Video watching (counted on the server) -> once watched to the end: the next lesson. */}
              {!lesson.locked && watch && (
                !watch.completed ? (
                  <span className="flex items-center gap-2 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200" title={t("lessonDetails.watchHint")}>
                    <Eye className="h-4 w-4 text-slate-400" /> {t("lessonDetails.watched")} {formatTime(watch.watchedSeconds)} / {formatTime(watch.durationSec)}
                  </span>
                ) : lesson.nextLesson && !lesson.nextLesson.locked ? (
                  <Button rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => navigate(ROUTES.lessonDetails(lesson.nextLesson!.id))}>
                    {t("lessonDetails.nextLesson")}
                  </Button>
                ) : lesson.nextLesson ? (
                  <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Lock className="h-4 w-4" />
                    {lesson.nextLesson.unlocksAt ? t("lessonDetails.nextOpensOn", { date: dayMonthYear(lesson.nextLesson.unlocksAt) }) : t("lessonDetails.nextLocked")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> {t("lessonDetails.allDone")}
                  </span>
                )
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {lesson.description || t("common.noResults")}
            </p>

            {lesson.objectives && lesson.objectives.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("about.mission.title")}
                </h3>
                <ul className="mt-2 space-y-2">
                  {lesson.objectives.map((o, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Until the video is watched: how far, and why the next lesson waits. */}
            {!lesson.locked && watch && !watch.completed && (
              <div className="mt-4 space-y-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={watch.durationSec} aria-valuenow={watch.watchedSeconds}>
                  <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${Math.min(100, (watch.watchedSeconds / Math.max(1, watch.durationSec)) * 100)}%` }} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("lessonDetails.watchHint")}</p>
              </div>
            )}
          </CardContent>
        </Card>

      </motion.div>
    </div>
  );
}
