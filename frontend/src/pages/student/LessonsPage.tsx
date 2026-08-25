import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lesson } from "../../types/lesson";
import { lessonService } from "../../services/lesson.service";
import { Card, Button, Badge, Input, Spinner } from "../../components/ui";
import { BookOpen, Search, PlayCircle, CheckCircle2, ChevronRight, Clock } from "lucide-react";

export const LessonsPage: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      const data = await lessonService.getLessons();
      setLessons(data);
      setIsLoading(false);
    };
    fetchLessons();
  }, []);

  const filtered = lessons.filter(
    (l) =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Video Darsliklar & Nazariya
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Yo'l Harakati Qoidalarining barcha mavzulari bo'yicha to'liq darslar
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Mavzularni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((lesson, idx) => (
            <Card
              key={lesson.id}
              className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-brand-500/50 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 font-extrabold text-sm">
                  {idx + 1}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-2xl">
                    {lesson.description}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      {lesson.durationMinutes} daqiqa
                    </span>
                    <span>·</span>
                    <span>{lesson.questionCount || 15} ta savol</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                <Link to={`/lessons/${lesson.id}/video`} className="w-full sm:w-auto">
                  <Button size="sm" variant="outline" className="w-full sm:w-auto" leftIcon={<PlayCircle className="h-4 w-4 text-brand-600" />}>
                    Video
                  </Button>
                </Link>
                <Link to={`/lessons/${lesson.id}`} className="w-full sm:w-auto">
                  <Button size="sm" variant="primary" className="w-full sm:w-auto" rightIcon={<ChevronRight className="h-4 w-4" />}>
                    Nazariya
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
