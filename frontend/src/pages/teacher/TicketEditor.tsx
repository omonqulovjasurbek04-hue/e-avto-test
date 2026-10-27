import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useStoredState } from "@/hooks/useStoredState";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { teacherService, type TicketQuestion, type TicketQuestionInput } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { QuestionWizard } from "@/components/test/QuestionWizard";
import { QuestionMedia } from "@/components/test/QuestionMedia";

const TICKET_COUNT = 60;

/** The course comes from the browser's storage (set by the Tests page); without one, back to the tickets. */
export default function TicketEditor() {
  const [courseId] = useStoredState("tests.course");
  return courseId ? <TicketEditorPage courseId={courseId} /> : <Navigate to="/tests" replace />;
}

/** One exam ticket for the teacher: its questions in order, with add, edit and remove, and a step to the next ticket. */
function TicketEditorPage({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ticket: ticketParam = "1" } = useParams();
  const ticket = Number(ticketParam);
  const { data, loading, error, reload } = useLoad(() => teacherService.ticket(courseId, ticket), [courseId, ticket]);

  // The wizard: closed (null), a new question ("new") or the question being edited.
  const [editing, setEditing] = useState<TicketQuestion | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<TicketQuestion | null>(null);
  const [resetting, setResetting] = useState(false);

  const back = "/tests";
  const go = (n: number) => navigate(`/tests/manage/${n}`);

  const save = async (d: TicketQuestionInput) => {
    setSaving(true);
    try {
      if (editing === "new") await teacherService.addTicketQuestion(courseId, ticket, d);
      else if (editing) await teacherService.updateTicketQuestion(courseId, editing.id, d);
      toast.success(editing === "new" ? t("ticketEdit.added") : t("ticketEdit.saved"));
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
      await teacherService.removeTicketQuestion(courseId, ticket, q.id);
      toast.success(t("ticketEdit.removed"));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ticketEdit.saveError"));
    }
  };

  const reset = async () => {
    setResetting(false);
    try {
      await teacherService.resetTicket(courseId, ticket);
      toast.success(t("ticketEdit.resetDone"));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ticketEdit.saveError"));
    }
  };

  return (
    <div className="container-page py-8">
      <Link to={back} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("ticketEdit.backToTickets")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("tests.tickets.ticketLabel", { n: ticket })}</h1>
          {data && <Badge variant="primary">{data.course.title}</Badge>}
          {data && <Badge variant={data.custom ? "success" : "neutral"}>{data.custom ? t("ticketEdit.legendCustom") : t("ticketEdit.legendAuto")}</Badge>}
        </div>
        {/* Ticket by ticket: the teacher walks through the course without going back to the grid. */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={ticket <= 1} leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => go(ticket - 1)}>
            {t("ticketEdit.prev")}
          </Button>
          <span className="min-w-[4rem] text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
            {ticket} / {TICKET_COUNT}
          </span>
          <Button variant="outline" size="sm" disabled={ticket >= TICKET_COUNT} rightIcon={<ChevronRight className="h-4 w-4" />} onClick={() => go(ticket + 1)}>
            {t("ticketEdit.next")}
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      ) : error || !data ? (
        <div className="mt-6">
          <ErrorState message={error ?? undefined} onRetry={reload} />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {t("ticketEdit.questionsCount", { count: data.questions.length })}
              {!data.custom && ` · ${t("ticketEdit.autoHint")}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.custom && (
                <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setResetting(true)}>
                  {t("ticketEdit.reset")}
                </Button>
              )}
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
                {t("ticketEdit.addQuestion")}
              </Button>
            </div>
          </div>

          <Card className="mt-4">
            <CardContent className="p-0">
              {data.questions.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">{t("ticketEdit.empty")}</p>
              ) : (
                <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.questions.map((q, i) => (
                    <li key={q.id} className="flex gap-4 px-5 py-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {i + 1}
                      </span>
                      {q.imageUrl && <QuestionMedia url={q.imageUrl} className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{q.text}</p>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {q.options[q.correctIndex]}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {t("ticketEdit.optionsCount", { count: q.options.length })}
                          {q.lessonId && data.lessons.find((l) => l.id === q.lessonId) ? ` · ${data.lessons.find((l) => l.id === q.lessonId)!.title}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(q)}
                          aria-label={t("ticketEdit.edit")}
                          title={t("ticketEdit.edit")}
                          className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoving(q)}
                          aria-label={t("common.delete")}
                          title={t("common.delete")}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {data.questions.length > 3 && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
                {t("ticketEdit.addQuestion")}
              </Button>
            </div>
          )}

          {editing && (
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
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title={t("ticketEdit.removeTitle")}
        message={t("ticketEdit.removeMessage")}
        confirmText={t("common.delete")}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        open={resetting}
        title={t("ticketEdit.reset")}
        message={t("ticketEdit.resetMessage")}
        confirmText={t("ticketEdit.reset")}
        onConfirm={reset}
        onCancel={() => setResetting(false)}
      />
    </div>
  );
}
