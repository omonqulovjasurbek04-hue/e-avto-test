import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { categoryService, type AdminCategory } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { EXTRA, FallbackHint, LangTabs, hasText, toTr, type ExtraLang, type Lang } from "@/components/admin/translations";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const FIELDS = ["name", "description"] as const;
type Text = Record<(typeof FIELDS)[number], string>;
interface Form extends Text { id: string | null; slug: string; order: number; isActive: boolean; tr: Record<ExtraLang, Text> }

const th = "px-4 py-3";

/** Course categories (topics). uz is the base text; uz_cyrl/ru are optional and fall back to uz. */
export default function AdminCategories() {
  const { t } = useTranslation();
  const list = useLoad(() => categoryService.list(), []);
  const [editing, setEditing] = useState<Form | null>(null);
  const [lang, setLang] = useState<Lang>("uz");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  const open = (form: Form) => {
    setErr(null);
    setLang("uz");
    setEditing(form);
  };
  const openNew = () => open({ id: null, slug: "", name: "", description: "", order: (list.data?.length ?? 0) + 1, isActive: true, tr: toTr(FIELDS, undefined) });
  const openEdit = (c: AdminCategory) => open({ id: c.id, slug: c.slug, name: c.name, description: c.description ?? "", order: c.order, isActive: c.isActive, tr: toTr(FIELDS, c.translations) });

  const text: Text | null = editing ? (lang === "uz" ? editing : editing.tr[lang]) : null;
  const set = (field: keyof Text, value: string) =>
    editing && setEditing(lang === "uz" ? { ...editing, [field]: value } : { ...editing, tr: { ...editing.tr, [lang]: { ...editing.tr[lang], [field]: value } } });

  const save = async () => {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      setLang("uz");
      return setErr(t("admin.categories.needName"));
    }
    setBusy(true);
    setErr(null);
    try {
      const translations = Object.fromEntries(EXTRA.map((l) => [l, hasText(editing.tr[l]) ? editing.tr[l] : null]));
      await categoryService.save(editing.id, {
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        order: editing.order,
        isActive: editing.isActive,
        translations,
        ...(editing.slug.trim() ? { slug: editing.slug.trim() } : {}),
      });
      toast.success(t("admin.common.saved"));
      setEditing(null);
      void list.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("admin.categories.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("admin.categories.subtitle")}</p>
        </div>
        <Button onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>{t("admin.categories.new")}</Button>
      </div>

      {list.loading && !list.data ? <Skeleton className="h-40 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? (
        <EmptyState title={t("admin.categories.empty")} description={t("admin.categories.emptyHint")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr>
                <th className={th}>{t("admin.common.order")}</th>
                <th className={th}>{t("admin.common.name")}</th>
                <th className={th}>Slug</th>
                <th className={th}>{t("admin.categories.courses")}</th>
                <th className={th}>{t("admin.common.status")}</th>
                <th className={`${th} text-right`}>{t("admin.common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {list.data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3">{c.order}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-3">{c.courseCount}</td>
                  <td className="px-4 py-3"><Badge variant={c.isActive ? "success" : "neutral"}>{c.isActive ? t("admin.categories.active") : t("admin.categories.inactive")}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" aria-label={t("admin.common.edit")} onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="danger" aria-label={t("admin.common.delete")} onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? t("admin.categories.edit") : t("admin.categories.new")} maxWidth="lg">
        {editing && text && (
          <div className="space-y-4">
            <LangTabs value={lang} onChange={setLang} filled={{ uz_cyrl: hasText(editing.tr.uz_cyrl), ru: hasText(editing.tr.ru) }} />
            <FallbackHint lang={lang} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t("admin.common.name")} value={text.name} placeholder={lang === "uz" ? undefined : editing.name} onChange={(e) => set("name", e.target.value)} />
              <Input label="Slug" helperText={t("admin.categories.slugHint")} value={editing.slug} disabled={lang !== "uz"} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase() })} />
            </div>
            <Textarea label={t("admin.common.description")} rows={3} value={text.description} placeholder={lang === "uz" ? undefined : editing.description} onChange={(e) => set("description", e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t("admin.common.order")} type="number" value={editing.order} disabled={lang !== "uz"} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
                <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                {t("admin.categories.activeHint")}
              </label>
            </div>
            {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)}>{t("admin.common.cancel")}</Button>
              <Button loading={busy} onClick={save}>{t("admin.common.save")}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.categories.deleteTitle")}
        message={t("admin.categories.deleteText", { name: deleting?.name ?? "", count: deleting?.courseCount ?? 0 })}
        confirmText={t("admin.common.delete")}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await categoryService.remove(deleting.id);
            toast.success(t("admin.categories.deleted"));
            setDeleting(null);
            void list.reload();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : t("admin.common.error"));
          }
        }}
      />
    </div>
  );
}
