import { useRef, useState } from "react";
import { Check, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { QuestionMedia } from "@/components/test/QuestionMedia";
import { Progress } from "@/components/ui/Progress";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { teacherService, type TicketQuestion, type TicketQuestionInput } from "@/services/platform.service";
import { cn } from "@/utils/cn";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const STEPS = ["question", "answers", "extra", "check"] as const;
const MAX_OPTIONS = 8;

const blank = (): TicketQuestionInput => ({ text: "", imageUrl: null, options: ["", ""], correctIndex: 0, explanation: null, lessonId: null });

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

/**
 * Adds or edits one ticket question step by step: the question (text and picture), the answers with the
 * right one marked, the topic and explanation, then a last look before saving.
 */
export function QuestionWizard({
  open,
  initial,
  lessons,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: TicketQuestion | null;
  lessons: { id: string; title: string }[];
  saving: boolean;
  onClose: () => void;
  onSave: (d: TicketQuestionInput) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TicketQuestionInput>(() => (initial ? { ...initial } : blank()));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<TicketQuestionInput>) => setForm((f) => ({ ...f, ...patch }));

  const options = form.options;
  const stepError = (i: number): string | null => {
    if (i === 0 && !form.text.trim()) return t("ticketEdit.wizard.needText");
    if (i === 1) {
      if (options.filter((o) => o.trim()).length < 2 || options.some((o) => !o.trim())) return t("ticketEdit.wizard.needOptions");
      if (form.correctIndex >= options.length) return t("ticketEdit.wizard.needCorrect");
    }
    return null;
  };
  const error = stepError(step);

  // A picture (PNG/JPEG/WebP) or a short video (MP4/WebM): each goes to its own checked upload.
  const pickMedia = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = file.type.startsWith("video/") ? await teacherService.uploadClip(file, setProgress) : await teacherService.uploadImage(file);
      set({ imageUrl: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ticketEdit.wizard.uploadError"));
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };


  const removeOption = (i: number) => {
    const next = options.filter((_, j) => j !== i);
    // Keep the mark on the same answer when an answer above it is removed.
    const correct = form.correctIndex === i ? 0 : form.correctIndex > i ? form.correctIndex - 1 : form.correctIndex;
    set({ options: next, correctIndex: correct });
  };

  const save = () => onSave({ ...form, text: form.text.trim(), options: options.map((o) => o.trim()), explanation: form.explanation?.trim() || null });
  const topic = lessons.find((l) => l.id === form.lessonId)?.title;

  return (
    <Modal open={open} onClose={onClose} title={initial ? t("ticketEdit.wizard.editTitle") : t("ticketEdit.wizard.addTitle")} maxWidth="2xl">
      {/* Steps: done ones can be clicked to go back. */}
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={i > step && STEPS.slice(0, i).some((_, j) => stepError(j))}
              onClick={() => setStep(i)}
              className="flex w-full flex-col items-start gap-1.5 text-left disabled:cursor-not-allowed"
            >
              <span className={cn("h-1.5 w-full rounded-full", i <= step ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700")} />
              <span className={cn("text-xs font-semibold", i === step ? "text-brand-700 dark:text-brand-300" : "text-slate-500")}>
                {i + 1}. {t(`ticketEdit.wizard.steps.${s}`)}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="min-h-[16rem]">
        {step === 0 && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t("ticketEdit.wizard.text")}</span>
              <textarea
                autoFocus
                rows={4}
                maxLength={2000}
                value={form.text}
                onChange={(e) => set({ text: e.target.value })}
                placeholder={t("ticketEdit.wizard.textPlaceholder")}
                className={fieldClass}
              />
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t("ticketEdit.wizard.image")}</span>
              {form.imageUrl ? (
                <div className="relative inline-block">
                  <QuestionMedia url={form.imageUrl} className="max-h-44 rounded-xl border border-slate-200 object-contain dark:border-slate-700" />
                  <button
                    type="button"
                    onClick={() => set({ imageUrl: null })}
                    aria-label={t("ticketEdit.wizard.removeImage")}
                    className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" loading={uploading} leftIcon={<ImagePlus className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
                  {t("ticketEdit.wizard.addImage")}
                </Button>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" className="hidden" onChange={(e) => pickMedia(e.target.files?.[0])} />
              {progress !== null && <Progress value={progress} className="mt-2" />}
              <p className="mt-1.5 text-xs text-slate-500">{t("ticketEdit.wizard.imageHint")}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="mb-3 text-sm text-slate-500">{t("ticketEdit.wizard.answersHint")}</p>
            <ul className="space-y-2">
              {options.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set({ correctIndex: i })}
                    aria-label={t("ticketEdit.wizard.markCorrect")}
                    aria-pressed={form.correctIndex === i}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition",
                      form.correctIndex === i ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-400 hover:border-emerald-500 dark:border-slate-600"
                    )}
                  >
                    {form.correctIndex === i ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{String.fromCharCode(65 + i)}</span>}
                  </button>
                  <input
                    value={o}
                    maxLength={500}
                    onChange={(e) => set({ options: options.map((x, j) => (j === i ? e.target.value : x)) })}
                    placeholder={t("ticketEdit.wizard.optionPlaceholder", { n: i + 1 })}
                    className={cn(fieldClass, form.correctIndex === i && "border-emerald-500")}
                  />
                  <button
                    type="button"
                    disabled={options.length <= 2}
                    onClick={() => removeOption(i)}
                    aria-label={t("ticketEdit.wizard.removeOption")}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            {options.length < MAX_OPTIONS && (
              <Button variant="ghost" size="sm" className="mt-3" leftIcon={<Plus className="h-4 w-4" />} onClick={() => set({ options: [...options, ""] })}>
                {t("ticketEdit.wizard.addOption")}
              </Button>
            )}
            {initial && <p className="mt-3 text-xs text-amber-600">{t("ticketEdit.wizard.optionCountNote")}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t("ticketEdit.wizard.topic")}</span>
              <select value={form.lessonId ?? ""} onChange={(e) => set({ lessonId: e.target.value || null })} className={fieldClass}>
                <option value="">{t("ticketEdit.wizard.noTopic")}</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t("ticketEdit.wizard.explanation")}</span>
              <textarea
                rows={4}
                maxLength={5000}
                value={form.explanation ?? ""}
                onChange={(e) => set({ explanation: e.target.value })}
                placeholder={t("ticketEdit.wizard.explanationPlaceholder")}
                className={fieldClass}
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{form.text}</p>
            {form.imageUrl && <QuestionMedia url={form.imageUrl} className="mt-3 max-h-40 rounded-xl object-contain" />}
            <ul className="mt-3 space-y-1.5">
              {options.map((o, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                    i === form.correctIndex ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  )}
                >
                  {i === form.correctIndex ? <Check className="h-4 w-4" /> : <span className="w-4 text-center text-xs">{String.fromCharCode(65 + i)}</span>}
                  {o}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              {t("ticketEdit.wizard.topic")}: {topic ?? t("ticketEdit.wizard.noTopic")}
            </p>
            {form.explanation?.trim() && <p className="mt-1 text-xs text-slate-500">{form.explanation}</p>}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
          {step === 0 ? t("common.cancel") : t("ticketEdit.wizard.back")}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={Boolean(error) || uploading} onClick={() => setStep(step + 1)}>
            {t("ticketEdit.wizard.next")}
          </Button>
        ) : (
          <Button variant="success" loading={saving} leftIcon={<Check className="h-4 w-4" />} onClick={save}>
            {t("ticketEdit.wizard.save")}
          </Button>
        )}
      </div>
    </Modal>
  );
}
