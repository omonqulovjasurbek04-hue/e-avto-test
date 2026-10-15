import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import type { AdminCourse, AdminCourseInput } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const LEVELS = ["Boshlang'ich", "O'rta", "Murakkab"].map((l) => ({ value: l, label: l }));

const emptyForm: AdminCourseInput = {
  title: "",
  description: "",
  thumbnail: "",
  level: "Boshlang'ich",
  order: 1,
  isPublished: true,
};

export default function AdminCourses() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCourse | "new" | null>(null);
  const [form, setForm] = useState<AdminCourseInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminService
      .listCourses()
      .then(setCourses)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setForm({ ...emptyForm, order: courses.length + 1 });
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (c: AdminCourse) => {
    setForm({
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail ?? "",
      level: c.level,
      order: c.order,
      isPublished: c.isPublished,
    });
    setFormError(null);
    setEditing(c);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setFormError("Nomi va tavsifi kiritilishi shart");
      return;
    }
    const payload: AdminCourseInput = { ...form, thumbnail: form.thumbnail?.trim() || null };
    setSaving(true);
    try {
      if (editing === "new") await adminService.createCourse(payload);
      else if (editing) await adminService.updateCourse(editing.id, payload);
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
      await adminService.deleteCourse(deleting.id);
      toast.success("Kurs o'chirildi");
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Kurslar</h1>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
          Yangi kurs
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : courses.length === 0 ? (
        <EmptyState title="Hozircha kurslar yo'q" description="Birinchi kursni yarating." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Tartib</th>
                <th className="px-4 py-3">Nomi</th>
                <th className="px-4 py-3">Daraja</th>
                <th className="px-4 py-3">Darslar</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{c.order}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.title}</td>
                  <td className="px-4 py-3">{c.level}</td>
                  <td className="px-4 py-3">{c.lessonCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isPublished ? "success" : "neutral"}>
                      {c.isPublished ? "Nashr etilgan" : "Qoralama"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" aria-label="Tahrirlash" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="danger" aria-label="O'chirish" onClick={() => setDeleting(c)}>
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
        title={editing === "new" ? "Yangi kurs" : "Kursni tahrirlash"}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <Input label="Nomi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea
            label="Tavsif"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Rasm havolasi (URL)"
            value={form.thumbnail ?? ""}
            onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Daraja"
              options={LEVELS}
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
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
            Nashr etilgan (foydalanuvchilarga ko'rinadi)
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
        title="Kursni o'chirish"
        message={`"${deleting?.title ?? ""}" kursi va uning barcha darslari o'chiriladi. Davom etasizmi?`}
        confirmText="O'chirish"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
