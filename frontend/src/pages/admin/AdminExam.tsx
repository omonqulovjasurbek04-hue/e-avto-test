import { useEffect, useRef, useState } from "react";
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

const SAMPLE = `{
  "questions": [
    {
      "courseId": "<kurs id>",
      "text": "Savol matni",
      "options": ["A javob", "B javob", "C javob"],
      "correctIndex": 1,
      "explanation": "Izoh",
      "difficulty": "EASY"
    }
  ]
}`;

export default function AdminExam() {
  const courses = useLoad(() => adminService.listCourses(), []);
  const [courseId, setCourseId] = useState("");
  const [f, setF] = useState({ questionCount: "20", minutes: "", passScore: "70", maxAttempts: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "danger"; text: string } | null>(null);
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!courseId) return;
    setMsg(null);
    api.testConfig(courseId).then((c) => {
      setF(c ? { questionCount: String(c.questionCount), minutes: c.durationSeconds ? String(Math.round(c.durationSeconds / 60)) : "", passScore: String(c.passScore), maxAttempts: c.maxAttempts ? String(c.maxAttempts) : "" } : { questionCount: "20", minutes: "", passScore: "70", maxAttempts: "" });
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
      });
      setMsg({ type: "success", text: "Imtihon qoidalari saqlandi" });
    } catch (e) {
      setMsg({ type: "danger", text: e instanceof Error ? e.message : "Xatolik" });
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
      toast.error(e instanceof Error ? e.message : "Eksport xatosi");
    }
  };

  const doImport = async (file: File) => {
    setImportErrors([]);
    setMsg(null);
    try {
      const parsed = JSON.parse(await file.text()) as { questions?: unknown[] } | unknown[];
      const questions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(questions)) throw new Error("Fayl { \"questions\": [...] } shaklida bo'lishi kerak");
      const res = await api.importQuestions(questions);
      setMsg({ type: "success", text: `${res.imported} ta savol qoralama sifatida import qilindi. Tekshirib, "Savollar banki"da nashr qiling.` });
    } catch (e) {
      if (e instanceof ApiError && Array.isArray(e.errors)) setImportErrors(e.errors as { row: number; message: string }[]);
      setMsg({ type: "danger", text: e instanceof Error ? e.message : "Import xatosi" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-white">Imtihon sozlamalari va savollar importi</h1>
      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      <section className="space-y-4 rounded-2xl border border-slate-800 p-5">
        <h2 className="font-semibold text-white">Kurs bo'yicha imtihon qoidalari</h2>
        {courses.loading && !courses.data ? <Skeleton className="h-10" /> : courses.error ? <ErrorState message={courses.error} onRetry={courses.reload} /> : (
          <Select label="Kurs" options={[{ value: "", label: "Tanlang…" }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={courseId} onChange={(e) => setCourseId(e.target.value)} />
        )}
        {courseId && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Savollar soni (1–100)" type="number" min={1} max={100} value={f.questionCount} onChange={(e) => setF({ ...f, questionCount: e.target.value })} />
              <Input label="Vaqt (daqiqa, bo'sh = avtomatik)" type="number" min={1} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} />
              <Input label="O'tish bali (%)" type="number" min={1} max={100} value={f.passScore} onChange={(e) => setF({ ...f, passScore: e.target.value })} />
              <Input label="Urinishlar soni (bo'sh = cheksiz)" type="number" min={1} value={f.maxAttempts} onChange={(e) => setF({ ...f, maxAttempts: e.target.value })} />
            </div>
            <p className="text-xs text-slate-500">Bu qoidalar o'quvchi yuborgan qiymatlardan ustun. Natija va ball serverda hisoblanadi.</p>
            <Button loading={busy} onClick={saveConfig}>Saqlash</Button>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 p-5">
        <h2 className="font-semibold text-white">Savollar banki: import / eksport</h2>
        <p className="text-sm text-slate-400">Import hammasi-yoki-hech narsa tamoyilida ishlaydi: bitta xato qator butun faylni rad etadi. Import qilingan savollar qoralama bo'ladi.</p>
        <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{SAMPLE}</pre>
        <div className="flex flex-wrap gap-3">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>JSON import</Button>
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={doExport}>{courseId ? "Tanlangan kursni eksport" : "Hammasini eksport"}</Button>
        </div>
        {importErrors.length > 0 && (
          <ul className="space-y-1 text-sm text-red-400">
            {importErrors.map((e) => <li key={e.row}>Qator {e.row}: {e.message}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
