import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { mediaService } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** A course's materials (PDF, PNG, JPEG): the list and an upload, inside the course window (media:manage). */
export function CourseMaterials({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const config = useLoad(() => mediaService.config(), []);
  const media = useLoad(() => mediaService.list(), []);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const files = (media.data?.files ?? []).filter((f) => f.courseId === courseId);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const limit = config.data?.maxFileMb ?? 0;
    if (limit && file.size > limit * 1024 * 1024) {
      toast.error(t("admin.media.tooLarge", { size: mb(file.size), limit }));
      return;
    }
    setProgress(0);
    try {
      await mediaService.upload("file", file, { courseId }, setProgress);
      toast.success(t("admin.media.uploaded"));
      void media.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.media.uploadError"));
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <FileText className="h-4 w-4" aria-hidden /> {t("admin.courses.materials")}
      </p>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-900">
              <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{f.filename}</span>
              <span className="text-xs text-slate-400">{mb(f.sizeBytes)}</span>
            </li>
          ))}
        </ul>
      )}
      {config.data?.uploadEnabled ? (
        <>
          <Button variant="outline" size="sm" loading={progress !== null} leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
            {t("admin.courses.uploadMaterial")}
          </Button>
          <p className="text-xs text-slate-500">{t("admin.courses.materialHint", { limit: config.data.maxFileMb })}</p>
          <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          {progress !== null && <Progress value={progress} />}
        </>
      ) : (
        config.data && <p className="text-xs text-amber-700 dark:text-amber-300">{t("admin.courses.uploadDisabled")}</p>
      )}
    </div>
  );
}
