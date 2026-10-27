import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { teacherService, type TicketQuestion, type TicketQuestionInput } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuestionWizard } from "./QuestionWizard";
import { QuestionMedia } from "./QuestionMedia";

/**
 * The chosen course's question bank inside the Tests page: search, add (with a picture or a short video),
 * edit and remove. A question added here has no fixed ticket: the automatic tickets draw it.
 */
export function QuestionBank({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useLoad(() => teacherService.courseQuestions(courseId, { search: debounced.trim(), page }), [courseId, debounced, page]);

  const [editing, setEditing] = useState<TicketQuestion | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<TicketQuestion | null>(null);

  const save = async (d: TicketQuestionInput) => {
    setSaving(true);
    try {
      if (editing === "new") await teacherService.addCourseQuestion(courseId, d);
      else if (editing) await teacherService.updateTicketQuestion(courseId, editing.id, d);
      toast.success(editing === "new" ? t("questionBank.added") : t("ticketEdit.saved"));
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ticketEdit.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    const q = removing;
    setRemoving(null);
    try {
      await teacherService.removeCourseQuestion(courseId, q.id);
      toast.success(t("ticketEdit.removed"));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ticketEdit.saveError"));
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("questionBank.search")}
            aria-label={t("questionBank.search")}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {data && <span className="text-sm text-slate-500">{t("questionBank.total", { count: data.total })}</span>}
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
          {t("ticketEdit.addQuestion")}
        </Button>
      </div>

      {loading && !data ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : data.items.length === 0 ? (
        <EmptyState title={debounced ? t("knowledge.noMatch") : t("questionBank.empty")} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((q) => (
                <li key={q.id} className="flex gap-4 px-5 py-4">
                  {q.imageUrl && <QuestionMedia url={q.imageUrl} className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{q.text}</p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {q.options[q.correctIndex]}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {t("ticketEdit.optionsCount", { count: q.options.length })}
                      {q.lessonId && data.lessons.find((l) => l.id === q.lessonId) && <span>· {data.lessons.find((l) => l.id === q.lessonId)!.title}</span>}
                      <Badge variant={q.ticket ? "primary" : "neutral"}>{q.ticket ? t("tests.tickets.ticketLabel", { n: q.ticket }) : t("ticketEdit.legendAuto")}</Badge>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-1">
                    <button type="button" onClick={() => setEditing(q)} aria-label={t("ticketEdit.edit")} title={t("ticketEdit.edit")} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setRemoving(q)} aria-label={t("common.delete")} title={t("common.delete")} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}

      {editing && data && (
        <QuestionWizard
          key={editing === "new" ? "new" : editing.id}
          open
          initial={editing === "new" ? null : editing}
          lessons={data.lessons}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        title={t("ticketEdit.removeTitle")}
        message={t("ticketEdit.removeMessage")}
        confirmText={t("common.delete")}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
