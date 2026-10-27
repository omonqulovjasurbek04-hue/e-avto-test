import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, Film, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { mediaService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { useAuthStore } from "@/store/auth.store";
import { can } from "@/lib/permissions";
import type { AdminCourse, AdminLesson, AdminLessonInput } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const emptyForm: AdminLessonInput = { courseId: "", title: "", description: "", videoUrl: "", duration: 0, order: 1, isPublished: true };
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Adding, editing and deleting a lesson, with its video: a link, or a file uploaded right here (for a new
 * lesson the file goes up as soon as the lesson is saved). Used on the Lessons page. `onSaved` reloads it.
 */
export function useLessonEditor(courses: AdminCourse[], onSaved: () => void) {
  const { t } = useTranslation();
  const mayUpload = can(useAuthStore((s) => s.user?.role), "media:manage");
  const config = useLoad(() => (mayUpload ? mediaService.config() : Promise.resolve(null)), [mayUpload]);
  const media = useLoad(() => (mayUpload ? mediaService.list() : Promise.resolve(null)), [mayUpload]);

  const [editing, setEditing] = useState<AdminLesson | "new" | null>(null);
  const [form, setForm] = useState<AdminLessonInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminLesson | null>(null);
  // A video picked for the lesson; uploaded on save (a new lesson needs its id first).
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFormError(null);
    setVideoFile(null);
    setProgress(null);
  };
  const openNew = (courseId?: string, order = 1) => {
    setForm({ ...emptyForm, courseId: courseId || courses[0]?.id || "", order });
    reset();
    setEditing("new");
  };
  const openEdit = (l: AdminLesson) => {
    setForm({ courseId: l.courseId, title: l.title, description: l.description ?? "", videoUrl: l.videoUrl ?? "", duration: l.duration, order: l.order, isPublished: l.isPublished });
    reset();
    void media.reload();
    setEditing(l);
  };

  const pickVideo = (file: File | undefined) => {
    if (!file) return;
    const limit = config.data?.maxVideoMb ?? 0;
    if (limit && file.size > limit * 1024 * 1024) {
      setFormError(t("admin.media.tooLarge", { size: mb(file.size), limit }));
      return;
    }
    setFormError(null);
    setVideoFile(file);
  };

  const save = async () => {
    if (!form.courseId) return setFormError(t("admin.lessons.chooseCourse"));
    if (!form.title.trim()) return setFormError(t("admin.lessons.needTitle"));
    const url = form.videoUrl?.trim() || null;
    if (url && !/^https?:\/\//i.test(url)) return setFormError(t("admin.lessons.badUrl"));
    const payload: AdminLessonInput = { ...form, title: form.title.trim(), description: form.description?.trim() || null, videoUrl: url };
    setSaving(true);
    try {
      const lesson = editing === "new" ? await adminService.createLesson(payload) : editing ? await adminService.updateLesson(editing.id, payload) : null;
      if (lesson && videoFile) {
        setProgress(0);
        await mediaService.upload("video", videoFile, { lessonId: lesson.id, title: lesson.title }, setProgress);
      }
      toast.success(t("admin.common.saved"));
      setEditing(null);
      onSaved();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("admin.lessons.saveError"));
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await adminService.deleteLesson(deleting.id);
      toast.success(t("admin.lessons.deleted"));
      setDeleting(null);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.lessons.deleteError"));
    }
  };

  const archiveVideo = async () => {
    if (!archiving) return;
    try {
      await mediaService.archiveVideo(archiving);
      toast.success(t("admin.media.archivedToast"));
      setArchiving(null);
      void media.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.common.error"));
    }
  };

  const lessonVideos = editing && editing !== "new" ? (media.data?.videos ?? []).filter((v) => v.lessonId === editing.id) : [];
  const uploadEnabled = Boolean(config.data?.uploadEnabled);

  const dialogs = (
    <>
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("admin.lessons.new") : t("admin.lessons.edit")} maxWidth="lg">
        <div className="space-y-4">
          <Select label={t("admin.common.course")} options={courses.map((c) => ({ value: c.id, label: c.title }))} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} />
          <Input label={t("admin.common.name")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label={t("admin.common.description")} rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          {/* Video: a link, or a file uploaded to the platform (private, streamed only to students with access). */}
          <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Film className="h-4 w-4" aria-hidden /> {t("admin.lessons.videoSection")}
            </p>
            <Input label={t("admin.lessons.videoUrl")} placeholder="https://..." value={form.videoUrl ?? ""} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} helperText={t("admin.lessons.videoUrlHint")} />
            {mayUpload && (
              <>
                {lessonVideos.length > 0 && (
                  <ul className="space-y-1.5">
                    {lessonVideos.map((v) => (
                      <li key={v.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                        <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{v.title || v.id.slice(0, 8)}</span>
                        <span className="text-xs text-slate-400">{mb(v.sizeBytes)}</span>
                        {v.isArchived ? (
                          <Badge variant="neutral">{t("admin.common.archived")}</Badge>
                        ) : (
                          <button type="button" onClick={() => setArchiving(v.id)} aria-label={t("admin.common.archive")} title={t("admin.common.archive")} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {uploadEnabled ? (
                  <div className="space-y-2">
                    {videoFile ? (
                      <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
                        <Upload className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{videoFile.name} · {mb(videoFile.size)}</span>
                        <button type="button" onClick={() => setVideoFile(null)} aria-label={t("admin.common.cancel")} className="rounded p-1 hover:bg-brand-100 dark:hover:bg-brand-500/20">
                          <X className="h-4 w-4" />
                        </button>
                      </p>
                    ) : (
                      <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
                        {t("admin.lessons.uploadVideo")}
                      </Button>
                    )}
                    <p className="text-xs text-slate-500">{t("admin.lessons.uploadVideoHint", { limit: config.data?.maxVideoMb })}</p>
                    <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => pickVideo(e.target.files?.[0])} />
                    {progress !== null && <Progress value={progress} />}
                  </div>
                ) : (
                  config.data && <p className="text-xs text-amber-700 dark:text-amber-300">{t("admin.lessons.uploadDisabled")}</p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label={t("admin.lessons.durationMinutes")} type="number" min={0} value={Math.round((form.duration ?? 0) / 60)} onChange={(e) => setForm({ ...form, duration: Math.max(0, Number(e.target.value)) * 60 })} />
            <Input label={t("admin.common.order")} type="number" value={form.order ?? 1} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.isPublished ?? true} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            {t("admin.common.published")}
          </label>
          {formError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
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
      <ConfirmDialog open={archiving !== null} title={t("admin.media.archiveTitle")} message={t("admin.media.archiveText")} confirmText={t("admin.common.archive")} onConfirm={archiveVideo} onCancel={() => setArchiving(null)} />
    </>
  );

  return { openNew, openEdit, askDelete: setDeleting, dialogs };
}
