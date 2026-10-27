import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { imageService, type CmsImage } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;

/**
 * Public images for CMS content (news covers, pictures inside pages). With `onPick` it works as a
 * picker: clicking an image hands its absolute URL back. Without it, it is the plain library.
 */
export function ImageLibrary({ onPick }: { onPick?: (img: CmsImage) => void }) {
  const { t } = useTranslation();
  const list = useLoad(() => imageService.list(), []);
  const config = useLoad(() => imageService.config(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CmsImage | null>(null);
  const maxMb = config.data?.maxImageMb ?? 5;

  const upload = async (file: File) => {
    setErr(null);
    if (file.size > maxMb * 1024 * 1024) return setErr(t("admin.images.tooLarge", { mb: maxMb }));
    setProgress(0);
    try {
      const img = await imageService.upload(file, setProgress);
      toast.success(t("admin.images.uploaded"));
      await list.reload();
      onPick?.(img);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.images.uploadError"));
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const copy = async (img: CmsImage) => {
    try {
      await navigator.clipboard.writeText(img.url);
      toast.success(t("admin.images.copied"));
    } catch {
      toast.error(img.url);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{t("admin.images.hint", { mb: maxMb })}</p>
        <input ref={fileRef} type="file" aria-label={t("admin.images.pick")} accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        <Button size="sm" leftIcon={<Upload className="h-4 w-4" />} loading={progress !== null} onClick={() => fileRef.current?.click()}>{t("admin.images.upload")}</Button>
      </div>
      {progress !== null && <Progress value={progress} />}
      {err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}

      {list.loading && !list.data ? <Skeleton className="h-40 rounded-2xl" /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data || list.data.length === 0 ? (
        <EmptyState icon={<ImagePlus className="h-10 w-10" />} title={t("admin.images.empty")} description={t("admin.images.emptyHint")} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="image-library">
          {list.data.map((img) => (
            <li key={img.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <button type="button" disabled={!onPick} onClick={() => onPick?.(img)} className={`block aspect-video w-full bg-white dark:bg-slate-900 ${onPick ? "cursor-pointer hover:opacity-80" : "cursor-default"}`} aria-label={onPick ? t("admin.images.choose", { name: img.filename }) : img.filename}>
                <img src={img.url} alt={img.filename} loading="lazy" className="h-full w-full object-cover" />
              </button>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400" title={img.filename}>{img.filename} · {kb(img.sizeBytes)}</span>
                <span className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" aria-label={t("admin.images.copy")} onClick={() => void copy(img)}><Copy className="h-3.5 w-3.5" /></Button>
                  {!onPick && <Button size="sm" variant="ghost" aria-label={t("admin.common.delete")} onClick={() => setDeleting(img)}><Trash2 className="h-3.5 w-3.5 text-red-700 dark:text-red-400" /></Button>}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.images.deleteTitle")}
        message={t("admin.images.deleteText", { name: deleting?.filename ?? "" })}
        confirmText={t("admin.common.delete")}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await imageService.remove(deleting.id);
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

/** Modal picker used inside editors. */
export function ImagePickerModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (img: CmsImage) => void }) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={open} onClose={onClose} title={t("admin.images.pickTitle")} maxWidth="2xl">
      {open && <ImageLibrary onPick={(img) => { onPick(img); onClose(); }} />}
    </Modal>
  );
}
