import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { adminPlatformService as api } from "@/services/platform.service";
import { ApiError } from "@/services/api";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const sample = (t: TFunction) => `{
  "questions": [
    {
      "courseId": "${t("admin.exam.sampleCourse")}",
      "text": "${t("admin.exam.sampleText")}",
      "options": [${["A", "B", "C"].map((letter) => `"${t("admin.exam.sampleOption", { letter })}"`).join(", ")}],
      "correctIndex": 1,
      "explanation": "${t("admin.exam.sampleExplanation")}",
      "difficulty": "EASY"
    }
  ]
}`;

export default function AdminExam() {
  const { t } = useTranslation();
  const courses = useLoad(() => adminService.listCourses(), []);
  const [courseId, setCourseId] = useState("");
  const [f, setF] = useState({ questionCount: "20", minutes: "", passScore: "70", maxAttempts: "", maxMistakes: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "danger"; text: string } | null>(null);
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!courseId) return;
    setMsg(null);
    api.testConfig(courseId).then((c) => {
      setF(c ? { questionCount: String(c.questionCount), minutes: c.durationSeconds ? String(Math.round(c.durationSeconds / 60)) : "", passScore: String(c.passScore), maxAttempts: c.maxAttempts ? String(c.maxAttempts) : "", maxMistakes: c.maxMistakes !== null ? String(c.maxMistakes) : "" } : { questionCount: "20", minutes: "", passScore: "70", maxAttempts: "", maxMistakes: "" });
    }).catch((e: Error) => setMsg({ type: "danger", text: e.message }));
  }, [courseId]);

  const saveConfig = async () => {
    if (!courseId) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.saveTestConfig(courseId, {
        questionCount: Number(f.questionCount),
        durationSeconds: f.minutes ? Number(f.minutes) * 60 : null,
        passScore: Number(f.passScore),
        maxAttempts: f.maxAttempts ? Number(f.maxAttempts) : null,
        maxMistakes: f.maxMistakes !== "" ? Number(f.maxMistakes) : null,
      });
      setMsg({ type: "success", text: t("admin.exam.saved") });
    } catch (e) {
      setMsg({ type: "danger", text: e instanceof Error ? e.message : t("admin.common.error") });
    } finally {
      setBusy(false);
    }
  };

  const doExport = async () => {
    try {
      const { questions } = await api.exportQuestions(courseId || undefined);
      const url = URL.createObjectURL(new Blob([JSON.stringify({ questions }, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "questions.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.exam.exportError"));
    }
  };

  const doImport = async (file: File) => {
    setImportErrors([]);
    setMsg(null);
    try {
      const parsed = JSON.parse(await file.text()) as { questions?: unknown[] } | unknown[];
      const questions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(questions)) throw new Error(t("admin.exam.badFile"));
      const res = await api.importQuestions(questions);
      setMsg({ type: "success", text: t("admin.exam.imported", { count: res.imported }) });
    } catch (e) {
      if (e instanceof ApiError && Array.isArray(e.errors)) setImportErrors(e.errors as { row: number; message: string }[]);
      setMsg({ type: "danger", text: e instanceof Error ? e.message : t("admin.exam.importError") });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("admin.exam.title")}</h1>
      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      <section className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("admin.exam.rulesTitle")}</h2>
        {courses.loading && !courses.data ? <Skeleton className="h-10" /> : courses.error ? <ErrorState message={courses.error} onRetry={courses.reload} /> : (
          <Select label={t("admin.common.course")} options={[{ value: "", label: t("admin.common.choose") }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={courseId} onChange={(e) => setCourseId(e.target.value)} />
        )}
        {courseId && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t("admin.exam.questionCount")} type="number" min={1} max={100} value={f.questionCount} onChange={(e) => setF({ ...f, questionCount: e.target.value })} />
              <Input label={t("admin.exam.minutes")} type="number" min={1} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} />
              <Input label={t("admin.exam.passScore")} type="number" min={1} max={100} value={f.passScore} onChange={(e) => setF({ ...f, passScore: e.target.value })} />
              <Input label={t("admin.exam.maxAttempts")} type="number" min={1} value={f.maxAttempts} onChange={(e) => setF({ ...f, maxAttempts: e.target.value })} />
              <Input label={t("admin.exam.maxMistakes")} type="number" min={0} max={100} value={f.maxMistakes} onChange={(e) => setF({ ...f, maxMistakes: e.target.value })} />
            </div>
            <p className="text-xs text-slate-500">{t("admin.exam.rulesHint")}</p>
            <Button loading={busy} onClick={saveConfig}>{t("admin.common.save")}</Button>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("admin.exam.bankTitle")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("admin.exam.bankHint")}</p>
        <pre className="overflow-x-auto rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-300">{sample(t)}</pre>
        <div className="flex flex-wrap gap-3">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>{t("admin.exam.import")}</Button>
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={doExport}>{courseId ? t("admin.exam.exportCourse") : t("admin.exam.exportAll")}</Button>
        </div>
        {importErrors.length > 0 && (
          <ul className="space-y-1 text-sm text-red-700 dark:text-red-400">
            {importErrors.map((e) => <li key={e.row}>{t("admin.exam.row", { row: e.row, message: e.message })}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
