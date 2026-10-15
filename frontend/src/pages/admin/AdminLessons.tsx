import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import type { AdminCourse, AdminLesson, AdminLessonInput } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const emptyForm: AdminLessonInput = {
  courseId: "",
  title: "",
  description: "",
  videoUrl: "",
  duration: 0,
  order: 1,
  isPublished: true,
};

export default function AdminLessons() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [courseId, setCourseId] = useState("");
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminLesson | "new" | null>(null);
  const [form, setForm] = useState<AdminLessonInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminLesson | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([adminService.listCourses(), adminService.listLessons(courseId || undefined)])
      .then(([cs, ls]) => {
        setCourses(cs);
        setLessons(ls);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId]);

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? "-";

  const openNew = () => {
    setForm({ ...emptyForm, courseId: courseId || courses[0]?.id || "", order: lessons.length + 1 });
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (l: AdminLesson) => {
    setForm({
      courseId: l.courseId,
      title: l.title,
      description: l.description ?? "",
      videoUrl: l.videoUrl ?? "",
      duration: l.duration,
      order: l.order,
      isPublished: l.isPublished,
    });
    setFormError(null);
    setEditing(l);
  };

  const save = async () => {
    if (!form.courseId) return setFormError("Kursni tanlang");
    if (!form.title.trim()) return setFormError("Dars nomi kiritilishi shart");
    const url = form.videoUrl?.trim() || null;
    if (url && !/^https?:\/\//i.test(url)) return setFormError("Video havolasi http(s):// bilan boshlanishi kerak");

    const payload: AdminLessonInput = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      videoUrl: url,
    };
    setSaving(true);
    try {
      if (editing === "new") await adminService.createLesson(payload);
      else if (editing) await adminService.updateLesson(editing.id, payload);
      toast.success("Saqlandi");
      setEditing(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await adminService.deleteLesson(deleting.id);
      toast.success("Dars o'chirildi");
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
    }
  };

  const courseFilter = [{ value: "", label: "Barcha kurslar" }, ...courses.map((c) => ({ value: c.id, label: c.title }))];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Darslar</h1>
        <Button onClick={openNew} disabled={courses.length === 0} leftIcon={<Plus className="h-4 w-4" />}>
          Yangi dars
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Select options={courseFilter} value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Kurs" />
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : lessons.length === 0 ? (
        <EmptyState title="Darslar yo'q" description="Avval kurs yarating, so'ng unga dars qo'shing." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">№</th>
                <th className="px-4 py-3">Dars</th>
                <th className="px-4 py-3">Kurs</th>
                <th className="px-4 py-3">Davomiyligi</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lessons.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{l.order}</td>
                  <td className="px-4 py-3 font-medium text-white">{l.title}</td>
                  <td className="px-4 py-3">{courseTitle(l.courseId)}</td>
                  <td className="px-4 py-3">{Math.round(l.duration / 60)} daq</td>
                  <td className="px-4 py-3">
                    <Badge variant={l.isPublished ? "success" : "neutral"}>{l.isPublished ? "Nashr etilgan" : "Qoralama"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" aria-label="Tahrirlash" onClick={() => openEdit(l)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="danger" aria-label="O'chirish" onClick={() => setDeleting(l)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yangi dars" : "Darsni tahrirlash"}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <Select
            label="Kurs"
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          />
          <Input label="Nomi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea
            label="Tavsif"
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Video havolasi (tashqi CDN/storage URL)"
            placeholder="https://..."
            value={form.videoUrl ?? ""}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            helperText="Video fayl serverga yuklanmaydi, faqat havola saqlanadi."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Davomiyligi (daqiqa)"
              type="number"
              min={0}
              value={Math.round((form.duration ?? 0) / 60)}
              onChange={(e) => setForm({ ...form, duration: Math.max(0, Number(e.target.value)) * 60 })}
            />
            <Input
              label="Tartib"
              type="number"
              value={form.order ?? 1}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isPublished ?? true}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />
            Nashr etilgan
          </label>
          {formError && (
            <p role="alert" className="text-sm text-red-400">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Bekor qilish
            </Button>
            <Button loading={saving} onClick={save}>
              Saqlash
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Darsni o'chirish"
        message={`"${deleting?.title ?? ""}" darsi o'chiriladi. Davom etasizmi?`}
        confirmText="O'chirish"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
