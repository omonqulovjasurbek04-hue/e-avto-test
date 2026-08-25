import React, { useEffect, useState } from "react";
import { courseService } from "../../services/course.service";
import { Course } from "../../types/course";
import { Button, Card, Badge, Input, Modal, Spinner } from "../../components/ui";
import { Plus, BookOpen, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("B");
  const [imageUrl, setImageUrl] = useState("");

  const fetchCourses = async () => {
    setIsLoading(true);
    const data = await courseService.getCourses();
    setCourses(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    try {
      const created = await courseService.createCourse({
        title,
        description,
        category,
        imageUrl:
          imageUrl ||
          "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
      });
      setCourses([...courses, created]);
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Yangi kurs qo'shildi!");
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Kurslar va Modullar</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Mavjud o'quv dasturlari va darsliklar boshqaruvi
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Yangi Kurs
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="accent">{c.category} Toifa</Badge>
                  <span className="text-xs text-slate-400">{c.totalLessons} ta dars</span>
                </div>
                <h3 className="text-lg font-bold text-white">{c.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <Button size="sm" variant="outline" className="border-slate-700 text-slate-300">
                  Darslar ({c.totalLessons})
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yangi Kurs Yaratish">
        <form onSubmit={handleCreate} className="space-y-4 py-2 text-slate-900 dark:text-slate-100">
          <Input
            label="Kurs nomi"
            placeholder="B Toifa — Yengil avtomobillar"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold">Toifa</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="B">B Toifa (Yengil)</option>
              <option value="A">A Toifa (Mototsikl)</option>
              <option value="C">C Toifa (Yuk avtomobili)</option>
              <option value="YHQ_GENERAL">YHQ Umumiy</option>
            </select>
          </div>

          <Input
            label="Rasm havolasi (URL)"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold">Kurs tavsifi</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" variant="primary" className="flex-1 font-bold">
              Yaratish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
