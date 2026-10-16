import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    if (!form.courseId) return setFormError(t("admin.lessons.chooseCourse"));
    if (!form.title.trim()) return setFormError(t("admin.lessons.needTitle"));
    const url = form.videoUrl?.trim() || null;
    if (url && !/^https?:\/\//i.test(url)) return setFormError(t("admin.lessons.badUrl"));

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
      toast.success(t("admin.common.saved"));
      setEditing(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("admin.lessons.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await adminService.deleteLesson(deleting.id);
      toast.success(t("admin.lessons.deleted"));
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.lessons.deleteError"));
    }
  };

  const courseFilter = [{ value: "", label: t("admin.lessons.allCourses") }, ...courses.map((c) => ({ value: c.id, label: c.title }))];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t("admin.lessons.title")}</h1>
        <Button onClick={openNew} disabled={courses.length === 0} leftIcon={<Plus className="h-4 w-4" />}>
          {t("admin.lessons.new")}
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Select options={courseFilter} value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label={t("admin.common.course")} />
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : lessons.length === 0 ? (
        <EmptyState title={t("admin.lessons.empty")} description={t("admin.lessons.emptyHint")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">№</th>
                <th className="px-4 py-3">{t("admin.common.lesson")}</th>
                <th className="px-4 py-3">{t("admin.common.course")}</th>
                <th className="px-4 py-3">{t("admin.lessons.duration")}</th>
                <th className="px-4 py-3">{t("admin.common.status")}</th>
                <th className="px-4 py-3 text-right">{t("admin.common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lessons.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{l.order}</td>
                  <td className="px-4 py-3 font-medium text-white">{l.title}</td>
                  <td className="px-4 py-3">{courseTitle(l.courseId)}</td>
                  <td className="px-4 py-3">{t("admin.lessons.minutesShort", { count: Math.round(l.duration / 60) })}</td>
                  <td className="px-4 py-3">
                    <Badge variant={l.isPublished ? "success" : "neutral"}>{l.isPublished ? t("admin.common.published") : t("admin.common.draft")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" aria-label={t("admin.common.edit")} onClick={() => openEdit(l)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="danger" aria-label={t("admin.common.delete")} onClick={() => setDeleting(l)}>
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
        title={editing === "new" ? t("admin.lessons.new") : t("admin.lessons.edit")}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <Select
            label={t("admin.common.course")}
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          />
          <Input label={t("admin.common.name")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea
            label={t("admin.common.description")}
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label={t("admin.lessons.videoUrl")}
            placeholder="https://..."
            value={form.videoUrl ?? ""}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            helperText={t("admin.lessons.videoUrlHint")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("admin.lessons.durationMinutes")}
              type="number"
              min={0}
              value={Math.round((form.duration ?? 0) / 60)}
              onChange={(e) => setForm({ ...form, duration: Math.max(0, Number(e.target.value)) * 60 })}
            />
            <Input
              label={t("admin.common.order")}
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
            {t("admin.common.published")}
          </label>
          {formError && (
            <p role="alert" className="text-sm text-red-400">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("admin.common.cancel")}
            </Button>
            <Button loading={saving} onClick={save}>
              {t("admin.common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.lessons.deleteTitle")}
        message={t("admin.lessons.deleteText", { title: deleting?.title ?? "" })}
        confirmText={t("admin.common.delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
