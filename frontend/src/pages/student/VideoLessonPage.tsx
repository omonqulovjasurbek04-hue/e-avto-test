import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Lesson } from "../../types/lesson";
import { lessonService } from "../../services/lesson.service";
import { Button, Card, Badge, Spinner } from "../../components/ui";
import { PlayCircle, CheckCircle2, ArrowLeft, CheckSquare, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const VideoLessonPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!lessonId) return;
      setIsLoading(true);
      const [currLesson, list] = await Promise.all([
        lessonService.getLessonById(lessonId),
        lessonService.getLessons(),
      ]);
      setLesson(currLesson);
      setAllLessons(list);
      setIsLoading(false);
    };
    fetchData();
  }, [lessonId]);

  const handleMarkComplete = async () => {
    if (!lesson) return;
    await lessonService.markLessonCompleted(lesson.id);
    setIsCompleted(true);
    toast.success("Dars muvaffaqiyatli yakunlandi!");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Video dars topilmadi</h2>
        <Link to="/lessons">
          <Button variant="primary" className="mt-4">Darslar ro'yxatiga qaytish</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top back button */}
      <div className="flex items-center justify-between">
        <Link to="/lessons" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          <span>Darslar ro'yxatiga qaytish</span>
        </Link>
        <Link to={`/lessons/${lesson.id}`}>
          <Button size="sm" variant="ghost" leftIcon={<BookOpen className="h-4 w-4" />}>
            Matnli nazariya
          </Button>
        </Link>
      </div>

      {/* Main Video Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Video Player and Controls */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800">
            <iframe
              src={lesson.videoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ"}
              title={lesson.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <Badge variant="primary" size="sm">Video darslik</Badge>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {lesson.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isCompleted ? "secondary" : "primary"}
                size="sm"
                onClick={handleMarkComplete}
                leftIcon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              >
                {isCompleted ? "Yakunlandi" : "Tugatdim deb belgilash"}
              </Button>
              <Link to="/tests">
                <Button size="sm" variant="accent" leftIcon={<CheckSquare className="h-4 w-4" />}>
                  Testga o'tish
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Playlist / Next lessons sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Barcha Video Darslar
          </h3>
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {allLessons.map((item, idx) => {
              const isCurrent = item.id === lesson.id;
              return (
                <Link
                  key={item.id}
                  to={`/lessons/${item.id}/video`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition text-xs font-semibold ${
                    isCurrent
                      ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/70 dark:border-brand-800 dark:text-brand-300"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="truncate">{item.title}</p>
                    <span className="text-[10px] font-normal text-slate-400">
                      {item.durationMinutes} daqiqa
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
