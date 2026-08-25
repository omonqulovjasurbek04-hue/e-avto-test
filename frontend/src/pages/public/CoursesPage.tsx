import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Course } from "../../types/course";
import { courseService } from "../../services/course.service";
import { Card, CardContent, Badge, Button, Input, Spinner } from "../../components/ui";
import { Search, BookOpen, Clock, ArrowRight, CheckCircle2 } from "lucide-react";

export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      const data = await courseService.getCourses();
      setCourses(data);
      setIsLoading(false);
    };
    fetchCourses();
  }, []);

  const categories = [
    { id: "ALL", label: "Barchasi" },
    { id: "B", label: "B Toifa (Yengil)" },
    { id: "A", label: "A Toifa (Moto)" },
    { id: "C", label: "C Toifa (Yuk)" },
    { id: "YHQ_GENERAL", label: "YHQ Testlar" },
  ];

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="container-page py-10 space-y-8">
      {/* Header */}
      <div className="max-w-2xl space-y-3">
        <Badge variant="primary">Nazariy ta'lim</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          O'quv Kurslari Katalogi
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          O'zingizga kerakli haydovchilik toifasini tanlang va interaktiv video darslar hamda amaliy testlar orqali mukammal o'rganing.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                selectedCategory === cat.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72">
          <Input
            placeholder="Kurslarni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Qidiruv bo'yicha hech qanday kurs topilmadi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant="accent">{course.category} Toifa</Badge>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <BookOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  <span>{course.totalLessons} ta dars</span>
                </div>

                <Link to={`/courses/${course.slug || course.id}`}>
                  <Button size="sm" variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Kursga kirish
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
