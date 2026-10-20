import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PlayCircle, FileText, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { lessonService } from "@/services/lesson.service";
import { useStartTest } from "@/hooks/useStartTest";
import { ROUTES } from "@/constants/routes";
import type { Lesson } from "@/types/lesson";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import LessonLockNotice from "@/components/lesson/LessonLockNotice";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDuration } from "@/utils/formatTime";
import SafeHtml from "@/components/common/SafeHtml";
import { useStudyTimer } from "@/hooks/useStudyTimer";

// Lesson text is stored as simple HTML (h2/h3, p, ul/ol, strong); Tailwind's reset strips their default look.
const LESSON_TEXT =
  "space-y-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 dark:[&_h3]:text-slate-100 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white";

export default function LessonDetails() {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const duration = lesson.duration || lesson.durationMinutes || 0;
  const hasVideo = Boolean(lesson.videoUrl || lesson.privateVideoId);

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: t("nav.lessons"), to: ROUTES.lessons },
          { label: lesson.title },
        ]}
      />

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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="primary">{formatDuration(duration)}</Badge>
              {lesson.category && <Badge variant="neutral">{lesson.category}</Badge>}
              {lesson.completed && (
                <Badge variant="success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("lessons.completed")}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Text-only lessons have no video page to open. */}
            {(hasVideo || lesson.locked) && (
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

        <Card className="mt-6">
          <CardContent>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              <FileText className="h-5 w-5 text-brand-600" /> {t("lessonDetails.aboutLesson")}
            </h2>
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
          </CardContent>
        </Card>

        {lesson.content && (
          <Card className="mt-6">
            <CardContent>
              <SafeHtml html={lesson.content} className={LESSON_TEXT} />
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
