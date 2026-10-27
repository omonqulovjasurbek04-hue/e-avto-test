import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderTree, ImagePlus } from "lucide-react";
import { CategoryInlineManager } from "@/components/admin/CategoryInlineManager";
import { CourseMaterials } from "@/components/admin/CourseMaterials";
import { CoursePackages } from "@/components/admin/CoursePackages";
import { useAuthStore } from "@/store/auth.store";
import { can } from "@/lib/permissions";
import { toast } from "sonner";
import { ImagePickerModal } from "@/components/admin/ImageLibrary";
import { adminService } from "@/services/admin.service";
import { categoryService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import type { AdminCourse, AdminCourseInput } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// The stored value stays Uzbek (existing data); only the label is translated.
const LEVELS: [string, string][] = [["Boshlang'ich", "levelBeginner"], ["O'rta", "levelMiddle"], ["Murakkab", "levelAdvanced"]];

const emptyForm: AdminCourseInput = {
  title: "",
  description: "",
  thumbnail: "",
  level: "Boshlang'ich",
  order: 1,
  isPublished: true,
  categoryId: null,
  studyPeriod: "",
  section: "MAIN",
};

/**
 * Adding, editing and deleting a course: the form and the delete confirmation, shared by the admin panel's
 * course table and the course catalogue (where an admin edits the cards in place). `onSaved` reloads the list.
 */
export function useCourseEditor(onSaved: () => void) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<AdminCourse | "new" | null>(null);
  const [form, setForm] = useState<AdminCourseInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);
  const categories = useLoad(() => categoryService.list(), []);
  // Price is typed in whole so'm; it is sent only when it actually changed.
  const [priceText, setPriceText] = useState("");
  const [picker, setPicker] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);
  const mayUpload = can(useAuthStore((s) => s.user?.role), "media:manage");

  const openNew = (order = 1) => {
    // Categories may have just changed on the same page.
    void categories.reload();
    setForm({ ...emptyForm, order });
    setPriceText("");
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (c: AdminCourse) => {
    void categories.reload();
    setForm({
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail ?? "",
      level: c.level,
      order: c.order,
      isPublished: c.isPublished,
      categoryId: c.categoryId ?? null,
      studyPeriod: c.studyPeriod ?? "",
      section: c.section ?? "MAIN",
    });
    setPriceText(c.price ? String(Math.round(c.price.amount / 100)) : "");
    setFormError(null);
    setEditing(c);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setFormError(t("admin.courses.needTitle"));
      return;
    }
    const digits = priceText.replace(/\s/g, "");
    if (digits !== "" && !/^\d+$/.test(digits)) {
      setFormError(t("admin.courses.priceInvalid"));
      return;
    }
    const before = editing && editing !== "new" && editing.price ? Math.round(editing.price.amount / 100) : null;
    const after = digits === "" ? null : Number(digits);
    const payload: AdminCourseInput = {
      ...form,
      thumbnail: form.thumbnail?.trim() || null,
      studyPeriod: form.studyPeriod?.trim() || null,
      ...(after !== before ? { price: after } : {}),
    };
    setSaving(true);
    try {
      if (editing === "new") await adminService.createCourse(payload);
      else if (editing) await adminService.updateCourse(editing.id, payload);
      toast.success(t("admin.common.saved"));
      setEditing(null);
      onSaved();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("admin.courses.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await adminService.deleteCourse(deleting.id);
      toast.success(t("admin.courses.deleted"));
      setDeleting(null);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.courses.deleteError"));
    }
  };

  const dialogs = (
    <>
      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? t("admin.courses.new") : t("admin.courses.edit")}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <Input label={t("admin.common.name")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea
            label={t("admin.common.description")}
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex items-end gap-3">
            {form.thumbnail && <img src={form.thumbnail} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <Input
                label={t("admin.courses.thumbnail")}
                value={form.thumbnail ?? ""}
                onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
              />
            </div>
            <Button variant="outline" leftIcon={<ImagePlus className="h-4 w-4" />} onClick={() => setPicker(true)}>
              {t("admin.images.choosePicture")}
            </Button>
          </div>
          <ImagePickerModal open={picker} onClose={() => setPicker(false)} onPick={(img) => setForm({ ...form, thumbnail: img.url })} />
          <Input
            label={t("admin.courses.priceSom")}
            inputMode="numeric"
            placeholder="5 900 000"
            helperText={t("admin.courses.priceHint")}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
          />
          {/* Category: pick one, or add, rename and delete categories right here. */}
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  label={t("admin.courses.category")}
                  options={[{ value: "", label: t("admin.courses.noCategory") }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (${t("admin.categories.inactive")})` }))]}
                  value={form.categoryId ?? ""}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}
                />
              </div>
              <Button variant={manageCategories ? "primary" : "outline"} leftIcon={<FolderTree className="h-4 w-4" />} onClick={() => setManageCategories((v) => !v)} aria-expanded={manageCategories}>
                {t("admin.courses.manageCategories")}
              </Button>
            </div>
            {manageCategories && (
              <CategoryInlineManager
                categories={categories.data ?? []}
                selectedId={form.categoryId ?? null}
                onSelect={(id) => setForm((f) => ({ ...f, categoryId: id }))}
                onChanged={() => {
                  void categories.reload();
                  onSaved();
                }}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t("admin.courses.section")}
              options={(["MAIN", "COMBINED", "EXTRA"] as const).map((v) => ({ value: v, label: t(`courses.section.${v}`) }))}
              value={form.section ?? "MAIN"}
              onChange={(e) => setForm({ ...form, section: e.target.value as AdminCourseInput["section"] })}
            />
            <Input
              label={t("admin.courses.studyPeriod")}
              placeholder="2–2,5 oy"
              value={form.studyPeriod ?? ""}
              onChange={(e) => setForm({ ...form, studyPeriod: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t("admin.courses.level")}
              options={LEVELS.map(([value, key]) => ({ value, label: t(`admin.courses.${key}`) }))}
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
            />
            <Input
              label={t("admin.common.order")}
              type="number"
              value={form.order ?? 1}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isPublished ?? true}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />
            {t("admin.courses.publishedHint")}
          </label>
          {/* Materials need the course to exist: shown when editing; a new course gets them after saving. */}
          {/* Packages (what students buy) and materials need the course to exist: shown when editing. */}
          {editing && editing !== "new" && <CoursePackages courseId={editing.id} onChanged={onSaved} />}
          {mayUpload && editing && editing !== "new" && <CourseMaterials courseId={editing.id} />}
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
        title={t("admin.courses.deleteTitle")}
        message={t("admin.courses.deleteText", { title: deleting?.title ?? "" })}
        confirmText={t("admin.common.delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );

  return { openNew, openEdit, askDelete: setDeleting, dialogs };
}
