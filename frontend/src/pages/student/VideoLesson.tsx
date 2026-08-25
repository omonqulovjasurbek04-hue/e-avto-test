import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { lessonService } from "@/services/lesson.service";
import { testService } from "@/services/test.service";
import { ROUTES } from "@/constants/routes";
import type { Lesson } from "@/types/lesson";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import VideoPlayer from "@/components/video/VideoPlayer";

export default function VideoLesson() {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = async () => {
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
  };

  useEffect(() => {
    void load();
  }, [lessonId]);

  const handleStartTest = async () => {
    if (!lesson) return;
    setStarting(true);
    try {
      const res = await testService.start(lesson.courseId);
      navigate(ROUTES.testPage(res.test.id));
    } finally {
      setStarting(false);
    }
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
        <VideoPlayer src={lesson.videoUrl || ""} />
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
