import { useRef, useState } from "react";
import { Archive, Upload } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { mediaService, type MediaVideo } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/utils/money";

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function AdminMedia() {
  const config = useLoad(() => mediaService.config(), []);
  const assets = useLoad(() => mediaService.list(), []);
  const lessons = useLoad(() => adminService.listLessons(), []);
  const courses = useLoad(() => adminService.listCourses(), []);

  const [kind, setKind] = useState<"video" | "file">("video");
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<MediaVideo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setErr(null);
    const limit = (kind === "video" ? config.data?.maxVideoMb : config.data?.maxFileMb) ?? 0;
    if (limit && file.size > limit * 1024 * 1024) {
      setErr(`Fayl juda katta (${mb(file.size)}). Chegara: ${limit} MB.`);
      return;
    }
    setProgress(0);
    try {
      await mediaService.upload(kind, file, kind === "video" ? { lessonId: target || undefined, title: title.trim() || undefined } : { courseId: target || undefined }, setProgress);
      toast.success("Fayl yuklandi");
      setTitle("");
      void assets.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yuklab bo'lmadi");
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const archive = async () => {
    if (!archiving) return;
    try {
      await mediaService.archiveVideo(archiving.id);
      toast.success("Video arxivlandi");
      setArchiving(null);
      void assets.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  const enabled = config.data?.uploadEnabled ?? false;
  const lessonName = (id: string | null) => lessons.data?.find((l) => l.id === id)?.title ?? (id ? id.slice(0, 8) : "biriktirilmagan");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Video va fayllar</h1>

      {config.loading && !config.data ? <Skeleton className="h-10" /> : config.error ? <ErrorState message={config.error} onRetry={config.reload} /> : !enabled ? (
        <Alert variant="warning" title="Yuklash o'chirilgan">
          Loyiha qoidasiga ko'ra videolar tashqi CDN'da saqlanadi (darsga havola qo'shiladi). Serverga yuklashni yoqish uchun
          <code className="mx-1 rounded bg-slate-800 px-1">MEDIA_UPLOAD_ENABLED=true</code> o'rnating va <code className="mx-1 rounded bg-slate-800 px-1">docs/SECURITY.md</code> dagi cheklovlarni ko'rib chiqing (antivirus yo'q).
        </Alert>
      ) : (
        <section className="space-y-4 rounded-2xl border border-slate-800 p-5">
          <h2 className="font-semibold text-white">Yangi fayl yuklash</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Turi" options={[{ value: "video", label: "Video (MP4/WebM)" }, { value: "file", label: "Material (PDF/PNG/JPEG)" }]} value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setTarget(""); }} />
            {kind === "video" ? (
              <Select label="Dars" options={[{ value: "", label: "Biriktirilmagan (faqat xodimlar ko'radi)" }, ...(lessons.data ?? []).map((l) => ({ value: l.id, label: l.title }))]} value={target} onChange={(e) => setTarget(e.target.value)} />
            ) : (
              <Select label="Kurs" options={[{ value: "", label: "Biriktirilmagan (faqat xodimlar ko'radi)" }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={target} onChange={(e) => setTarget(e.target.value)} />
            )}
          </div>
          {kind === "video" && <Input label="Nomi (ixtiyoriy)" value={title} onChange={(e) => setTitle(e.target.value)} />}
          <p className="text-xs text-slate-500">Haqiqiy fayl turi baytlardan tekshiriladi (nomi yoki kengaytmasi hisobga olinmaydi). Chegara: video {config.data?.maxVideoMb} MB, material {config.data?.maxFileMb} MB.</p>
          <input ref={fileRef} type="file" aria-label="Fayl tanlash" accept={kind === "video" ? "video/mp4,video/webm" : "application/pdf,image/png,image/jpeg"} className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
          <Button leftIcon={<Upload className="h-4 w-4" />} loading={progress !== null} onClick={() => fileRef.current?.click()}>Fayl tanlash va yuklash</Button>
          {progress !== null && <Progress value={progress} />}
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        </section>
      )}

      {assets.loading && !assets.data ? <Skeleton className="h-40 rounded-2xl" /> : assets.error ? <ErrorState message={assets.error} onRetry={assets.reload} /> : !assets.data || (assets.data.videos.length === 0 && assets.data.files.length === 0) ? (
        <EmptyState title="Yuklangan fayllar yo'q" description="Tashqi CDN havolalari esa Darslar bo'limidagi 'video havolasi' maydonida kiritiladi." />
      ) : (
        <div className="space-y-6">
          {assets.data.videos.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Video</th><th className="px-4 py-3">Dars</th><th className="px-4 py-3">Hajmi</th><th className="px-4 py-3">Yuklangan</th><th className="px-4 py-3">Holat</th><th className="px-4 py-3 text-right">Amal</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {assets.data.videos.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-medium text-white">{v.title || v.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">{lessonName(v.lessonId)}</td>
                      <td className="px-4 py-3">{mb(v.sizeBytes)}</td>
                      <td className="px-4 py-3">{formatDateTime(v.createdAt)}</td>
                      <td className="px-4 py-3">{v.isArchived ? <Badge variant="neutral">Arxiv</Badge> : <Badge variant="success">Faol</Badge>}</td>
                      <td className="px-4 py-3 text-right">{!v.isArchived && <Button size="sm" variant="danger" aria-label="Arxivlash" onClick={() => setArchiving(v)}><Archive className="h-4 w-4" /></Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {assets.data.files.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Material</th><th className="px-4 py-3">Turi</th><th className="px-4 py-3">Hajmi</th><th className="px-4 py-3">Yuklangan</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {assets.data.files.map((f) => (
                    <tr key={f.id}><td className="px-4 py-3 font-medium text-white">{f.filename}</td><td className="px-4 py-3">{f.mimeType}</td><td className="px-4 py-3">{mb(f.sizeBytes)}</td><td className="px-4 py-3">{formatDateTime(f.createdAt)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog open={archiving !== null} title="Videoni arxivlash" message="O'quvchilar bu videoni ko'rolmay qoladi. Fayl serverda saqlanib qoladi." confirmText="Arxivlash" onConfirm={archive} onCancel={() => setArchiving(null)} />
    </div>
  );
}
