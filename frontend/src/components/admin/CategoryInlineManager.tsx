import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { categoryService, type AdminCategory } from "@/services/platform.service";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

/**
 * Categories managed right in the course form: add one (it is chosen for the course at once), rename,
 * show/hide or delete. Texts in other languages and the slug stay as they are; uz_cyrl/ru fall back to uz.
 */
export function CategoryInlineManager({
  categories,
  selectedId,
  onSelect,
  onChanged,
}: {
  categories: AdminCategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  const add = () =>
    run(async () => {
      const created = await categoryService.save(null, { name: newName.trim(), order: categories.length + 1, isActive: true });
      setNewName("");
      onSelect(created.id);
    }, t("admin.categories.added"));

  const rename = () =>
    editing &&
    run(async () => {
      await categoryService.save(editing.id, { name: editing.name.trim() });
      setEditing(null);
    }, t("admin.common.saved"));

  const remove = (c: AdminCategory) =>
    run(async () => {
      await categoryService.remove(c.id);
      setConfirming(null);
      if (selectedId === c.id) onSelect(null);
    }, t("admin.categories.deleted"));

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {categories.map((c) => (
          <li key={c.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", selectedId === c.id && "bg-brand-50 dark:bg-brand-500/10")}>
            {editing?.id === c.id ? (
              <>
                <input
                  autoFocus
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void rename();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className={field}
                  aria-label={t("admin.common.name")}
                />
                <button type="button" disabled={busy || editing.name.trim().length < 2} onClick={() => void rename()} aria-label={t("admin.common.save")} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:hover:bg-emerald-500/10">
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setEditing(null)} aria-label={t("admin.common.cancel")} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => onSelect(c.id)} className="min-w-0 flex-1 truncate text-left text-sm text-slate-800 hover:text-brand-600 dark:text-slate-100">
                  {c.name}
                  {!c.isActive && <span className="ml-1.5 text-xs text-slate-400">({t("admin.categories.inactive")})</span>}
                </button>
                <span className="shrink-0 text-xs text-slate-400">{t("admin.categories.courseCount", { count: c.courseCount })}</span>
                {confirming === c.id ? (
                  <>
                    <Button size="sm" variant="danger" loading={busy} onClick={() => void remove(c)}>
                      {t("admin.common.delete")}
                    </Button>
                    <button type="button" onClick={() => setConfirming(null)} aria-label={t("admin.common.cancel")} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setEditing({ id: c.id, name: c.name })} aria-label={t("admin.common.edit")} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setConfirming(c.id)} aria-label={t("admin.common.delete")} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {confirming && <p className="text-xs text-amber-700 dark:text-amber-300">{t("admin.categories.inlineDeleteHint")}</p>}
      <div className="flex gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && newName.trim().length >= 2 && void add()}
          placeholder={t("admin.categories.newPlaceholder")}
          aria-label={t("admin.categories.new")}
          className={field}
        />
        <Button size="sm" loading={busy} disabled={newName.trim().length < 2} leftIcon={<Plus className="h-4 w-4" />} onClick={() => void add()}>
          {t("admin.categories.add")}
        </Button>
      </div>
    </div>
  );
}
