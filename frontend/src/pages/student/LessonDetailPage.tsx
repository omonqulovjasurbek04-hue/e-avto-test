import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Lesson } from "../../types/lesson";
import { lessonService } from "../../services/lesson.service";
import { Button, Card, Badge, Spinner } from "../../components/ui";
import { PlayCircle, CheckSquare, ChevronRight, BookOpen, ArrowLeft } from "lucide-react";

export const LessonDetailPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) return;
      setIsLoading(true);
      const data = await lessonService.getLessonById(lessonId);
      setLesson(data);
      setIsLoading(false);
    };
    fetchLesson();
  }, [lessonId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dars topilmadi</h2>
        <Link to="/lessons">
          <Button variant="primary">Mavzular ro'yxatiga qaytish</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Navigation Top */}
      <div className="flex items-center justify-between">
        <Link to="/lessons" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          <span>Barcha darslarga qaytish</span>
        </Link>

        <div className="flex gap-2">
          {lesson.videoUrl && (
            <Link to={`/lessons/${lesson.id}/video`}>
              <Button size="sm" variant="outline" leftIcon={<PlayCircle className="h-4 w-4 text-brand-600" />}>
                Video dars
              </Button>
            </Link>
          )}
          <Link to="/tests">
            <Button size="sm" variant="accent" leftIcon={<CheckSquare className="h-4 w-4" />}>
              Mavzu bo'yicha test
            </Button>
          </Link>
        </div>
      </div>

      {/* Lesson Header */}
      <div className="space-y-3">
        <Badge variant="primary">{lesson.durationMinutes} daqiqa · Nazariy modul</Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {lesson.description}
          </p>
        )}
      </div>

      {/* Main Content Article */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
          {lesson.content}
        </div>
      </Card>

      {/* Bottom CTA for topic test */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-600 to-blue-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-brand-500/20">
        <div>
          <h3 className="text-lg font-bold">Ushbu mavzuni o'zlashtirdingizmi?</h3>
          <p className="text-xs text-brand-100">Bilimingizni sinash uchun 15 talik mavzuli testni ishlang.</p>
        </div>
        <Link to="/tests">
          <Button variant="accent" size="md" className="font-bold">
            Testni Boshlash
          </Button>
        </Link>
      </div>
    </div>
  );
};
