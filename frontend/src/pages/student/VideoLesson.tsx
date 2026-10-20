import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { lessonService } from "@/services/lesson.service";
import { mediaService } from "@/services/platform.service";
import { useStartTest } from "@/hooks/useStartTest";
import { ROUTES } from "@/constants/routes";
import type { Lesson } from "@/types/lesson";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import VideoPlayer from "@/components/video/VideoPlayer";
import { Alert } from "@/components/ui/Alert";
import LessonLockNotice from "@/components/lesson/LessonLockNotice";
import { useAuth } from "@/hooks/useAuth";
import { useStudyTimer } from "@/hooks/useStudyTimer";

/** Plays a video from private storage through short-lived signed URLs (renewed while watching). */
function PrivateVideo({ videoId, onProgress }: { videoId: string; onProgress: (pct: number) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Who is watching: contact + short account id, burned over the picture.
  const watermark = user ? `${user.email || user.phone || user.name} · ${user.id.slice(0, 8)}` : undefined;
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setFailed(false);
    mediaService.streamUrl("video", videoId).then((u) => alive && setSrc(u)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [videoId]);

  if (failed) return <Alert variant="danger">{t("lock.privateFail")}</Alert>;
  if (!src) return <Skeleton className="aspect-video w-full" />;
  return <VideoPlayer src={src} onProgress={onProgress} watermark={watermark} refreshSrc={() => mediaService.streamUrl("video", videoId)} />;
}

export default function VideoLesson() {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Reading or watching an open lesson counts as study time.
  useStudyTimer("lesson", Boolean(lesson && !lesson.locked));
  const { startTest, starting } = useStartTest();

  const load = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError(false);
    try {
      const data = await lessonService.getVideo(lessonId);
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
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-6 w-72" />
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

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: t("nav.lessons"), to: ROUTES.lessons },
          { label: lesson.title, to: ROUTES.lessonDetails(lesson.id) },
          { label: t("videoLesson.title") },
        ]}
      />

      <div className="mt-4">
        {lesson.locked ? (
          <LessonLockNotice lesson={lesson} />
        ) : lesson.privateVideoId ? (
          <PrivateVideo videoId={lesson.privateVideoId} onProgress={(pct) => void lessonService.updateProgress(lesson.id, pct).catch(() => undefined)} />
        ) : lesson.videoUrl ? (
          <VideoPlayer src={lesson.videoUrl} onProgress={(pct) => void lessonService.updateProgress(lesson.id, pct).catch(() => undefined)} />
        ) : (
          <Alert variant="info">{t("lock.noVideo")}</Alert>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {lesson.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {lesson.description || t("common.noResults")}
          </p>
        </div>
        <Button
          loading={starting}
          leftIcon={<PlayCircle className="h-5 w-5" />}
          onClick={handleStartTest}
        >
          {t("tests.startTest")}
        </Button>
      </div>
    </div>
  );
}
