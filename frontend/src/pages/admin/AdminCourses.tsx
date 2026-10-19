import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Plus, Pencil, Trash2 } from "lucide-react";
import { ImagePickerModal } from "@/components/admin/ImageLibrary";
import { formatMoney } from "@/utils/money";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { categoryService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
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

export default function AdminCourses() {
  const { t } = useTranslation();
  const levelLabel = (v: string) => {
    const key = LEVELS.find(([value]) => value === v)?.[1];
    return key ? t(`admin.courses.${key}`) : v;
  };
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCourse | "new" | null>(null);
  const [form, setForm] = useState<AdminCourseInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminCourse | null>(null);
  const categories = useLoad(() => categoryService.list(), []);
  // Price is typed in whole so'm; it is sent only when it actually changed.
  const [priceText, setPriceText] = useState("");
  const [picker, setPicker] = useState(false);

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
    setPriceText("");
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
      load();
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
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.courses.deleteError"));
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t("admin.courses.title")}</h1>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
          {t("admin.courses.new")}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : courses.length === 0 ? (
        <EmptyState title={t("admin.courses.empty")} description={t("admin.courses.emptyHint")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("admin.common.order")}</th>
                <th className="px-4 py-3">{t("admin.common.name")}</th>
                <th className="px-4 py-3">{t("admin.courses.category")}</th>
                <th className="px-4 py-3">{t("admin.courses.level")}</th>
                <th className="px-4 py-3">{t("admin.courses.lessons")}</th>
                <th className="px-4 py-3">{t("admin.courses.price")}</th>
                <th className="px-4 py-3">{t("admin.common.status")}</th>
                <th className="px-4 py-3 text-right">{t("admin.common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{c.order}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.title}</td>
                  <td className="px-4 py-3">{c.category?.name ?? <span className="text-slate-500">—</span>}</td>
                  <td className="px-4 py-3">{levelLabel(c.level)}</td>
                  <td className="px-4 py-3">{c.lessonCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.price ? (
                      <>
                        {formatMoney(c.price.amount, c.price.currency)}
                        {c.price.isSample && <Badge variant="warning" className="ml-2">{t("admin.courses.sample")}</Badge>}
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isPublished ? "success" : "neutral"}>
                      {c.isPublished ? t("admin.common.published") : t("admin.common.draft")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" aria-label={t("admin.common.edit")} onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="danger" aria-label={t("admin.common.delete")} onClick={() => setDeleting(c)}>
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
          <Select
            label={t("admin.courses.category")}
            options={[{ value: "", label: t("admin.courses.noCategory") }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (${t("admin.categories.inactive")})` }))]}
            value={form.categoryId ?? ""}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}
          />
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
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isPublished ?? true}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />
            {t("admin.courses.publishedHint")}
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
        title={t("admin.courses.deleteTitle")}
        message={t("admin.courses.deleteText", { title: deleting?.title ?? "" })}
        confirmText={t("admin.common.delete")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
