import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { useDebounce } from "@/hooks/useDebounce";
import type { AdminCourse, AdminQuestion, AdminQuestionInput, PageMeta } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const DIFFICULTIES = [
  { value: "EASY", label: "Oson" },
  { value: "MEDIUM", label: "O'rta" },
  { value: "HARD", label: "Qiyin" },
];

const emptyForm: AdminQuestionInput = {
  courseId: null,
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  difficulty: "EASY",
};

export default function AdminQuestions() {
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminQuestion | "new" | null>(null);
  const [form, setForm] = useState<AdminQuestionInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminQuestion | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminService
      .listQuestions({ page, search: debounced || undefined })
      .then((res) => {
        setItems(res.items);
        setMeta(res.pagination);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced]);
  useEffect(() => setPage(1), [debounced]);
  useEffect(() => {
    adminService.listCourses().then(setCourses).catch(() => undefined);
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (q: AdminQuestion) => {
    setForm({
      courseId: q.courseId ?? null,
      text: q.text,
      options: [...q.options],
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? "",
      difficulty: (q.difficulty as AdminQuestionInput["difficulty"]) ?? "EASY",
    });
    setFormError(null);
    setEditing(q);
  };

  const setOption = (i: number, value: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? value : o)) }));

  const addOption = () => setForm((f) => (f.options.length < 8 ? { ...f, options: [...f.options, ""] } : f));

  const removeOption = (i: number) =>
    setForm((f) => {
      if (f.options.length <= 2) return f;
      const options = f.options.filter((_, idx) => idx !== i);
      const correctIndex = f.correctIndex === i ? 0 : f.correctIndex > i ? f.correctIndex - 1 : f.correctIndex;
      return { ...f, options, correctIndex };
    });

  const save = async () => {
    const options = form.options.map((o) => o.trim());
    if (!form.text.trim()) return setFormError("Savol matni kiritilishi shart");
    if (options.some((o) => !o)) return setFormError("Barcha variantlar to'ldirilishi kerak");
    const payload: AdminQuestionInput = {
      ...form,
      text: form.text.trim(),
      options,
      explanation: form.explanation?.trim() || null,
    };
    setSaving(true);
    try {
      if (editing === "new") await adminService.createQuestion(payload);
      else if (editing) await adminService.updateQuestion(editing.id, payload);
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
      await adminService.deleteQuestion(deleting.id);
      toast.success("Savol o'chirildi");
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirishda xatolik");
    }
  };

  const courseOptions = [{ value: "", label: "Kursga biriktirilmagan" }, ...courses.map((c) => ({ value: c.id, label: c.title }))];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Savollar banki</h1>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
          Yangi savol
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Savol matni bo'yicha qidirish"
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Qidirish"
        />
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title="Savollar topilmadi" />
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <div key={q.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="min-w-0">
                <p className="font-medium text-white">{q.text}</p>
                <ul className="mt-2 space-y-0.5 text-sm text-slate-400">
                  {q.options.map((o, i) => (
                    <li key={i} className={i === q.correctIndex ? "font-semibold text-emerald-400" : ""}>
                      {i === q.correctIndex ? "✓ " : "· "}
                      {o}
                    </li>
                  ))}
                </ul>
                <Badge variant="neutral" className="mt-2">
                  {DIFFICULTIES.find((d) => d.value === q.difficulty)?.label ?? q.difficulty}
                </Badge>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" aria-label="Tahrirlash" onClick={() => openEdit(q)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="danger" aria-label="O'chirish" onClick={() => setDeleting(q)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />}
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yangi savol" : "Savolni tahrirlash"}
        maxWidth="xl"
      >
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <Textarea label="Savol" rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-300">Variantlar (to'g'ri javobni belgilang)</legend>
            {form.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  aria-label={`${i + 1}-variant to'g'ri javob`}
                  checked={form.correctIndex === i}
                  onChange={() => setForm({ ...form, correctIndex: i })}
                />
                <Input
                  aria-label={`${i + 1}-variant`}
                  value={o}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`${i + 1}-variant`}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Variantni olib tashlash"
                  disabled={form.options.length <= 2}
                  onClick={() => removeOption(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addOption} disabled={form.options.length >= 8}>
              Variant qo'shish
            </Button>
          </fieldset>

          <Textarea
            label="Izoh (test tugagach ko'rsatiladi)"
            rows={3}
            value={form.explanation ?? ""}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Kurs"
              options={courseOptions}
              value={form.courseId ?? ""}
              onChange={(e) => setForm({ ...form, courseId: e.target.value || null })}
            />
            <Select
              label="Qiyinlik"
              options={DIFFICULTIES}
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as AdminQuestionInput["difficulty"] })}
            />
          </div>

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
        title="Savolni o'chirish"
        message="Bu savol o'chiriladi. Davom etasizmi?"
        confirmText="O'chirish"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
