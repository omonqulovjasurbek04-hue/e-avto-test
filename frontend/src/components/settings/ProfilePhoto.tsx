import { useRef, useState } from "react";
import { Camera, ShieldAlert, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/user.service";
import { squareImage, UnreadableImageError } from "@/utils/squareImage";
import { inspectImageBytes, type ThreatCode } from "@/utils/imageSafety";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

// Any picture: it is decoded and re-encoded as a small square WebP in the browser before upload.
// HEIC/HEIF are listed explicitly because some systems do not report them as image/*.
const ACCEPT = "image/*,.heic,.heif,.avif,.svg";
const MAX_SOURCE_MB = 100;

/** Profile photo: pick a picture, it is cropped to a square and shrunk in the browser, then uploaded. */
export function ProfilePhoto() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  // Why the last chosen picture was refused (hidden code found in it); empty = nothing to show.
  const [threats, setThreats] = useState<ThreatCode[]>([]);
  if (!user) return null;

  const choose = async (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    setThreats([]);
    if (file.type && !file.type.startsWith("image/")) return void toast.error(t("photo.wrongType"));
    if (file.size > MAX_SOURCE_MB * 1024 * 1024) return void toast.error(t("photo.tooLarge", { mb: MAX_SOURCE_MB }));
    setBusy("upload");
    try {
      // Look inside the original file first: a picture carrying code is not uploaded at all.
      const found = inspectImageBytes(new Uint8Array(await file.arrayBuffer()));
      if (found.length) {
        setThreats(found);
        return;
      }
      updateUser(await userService.uploadAvatar(await squareImage(file)));
      toast.success(t("photo.saved"));
    } catch (e) {
      toast.error(e instanceof UnreadableImageError ? t("photo.unreadable") : e instanceof Error ? e.message : t("photo.failed"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("remove");
    try {
      updateUser({ ...(await userService.removeAvatar()), avatarUrl: undefined });
      toast.success(t("photo.removed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("photo.failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="flex flex-col items-center gap-4 text-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative rounded-full focus:outline-none focus:ring-4 focus:ring-brand-200"
        aria-label={t("photo.choose")}
      >
        <Avatar name={user.name} src={user.avatarUrl} size="lg" className="h-32 w-32 text-4xl" />
        <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow transition group-hover:bg-brand-700 dark:border-slate-900">
          <Camera className="h-4 w-4" aria-hidden />
        </span>
      </button>
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{t("photo.title")}</p>
        <p className="mt-0.5 text-xs text-slate-500">{t("photo.hint")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" loading={busy === "upload"} disabled={busy !== null} leftIcon={<Upload className="h-4 w-4" />} onClick={() => input.current?.click()}>
          {user.avatarUrl ? t("photo.change") : t("photo.upload")}
        </Button>
        {user.avatarUrl && (
          <Button size="sm" variant="outline" loading={busy === "remove"} disabled={busy !== null} leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => void remove()}>
            {t("photo.remove")}
          </Button>
        )}
      </div>
      {threats.length > 0 && (
        <div role="alert" className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm dark:border-red-500/30 dark:bg-red-500/10">
          <p className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden /> {t("photo.blocked")}
          </p>
          <p className="mt-2 font-semibold text-red-700 dark:text-red-300">{t("photo.reason")}:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-red-700 dark:text-red-300">
            {threats.map((code) => (
              <li key={code}>{t(`photo.threats.${code}`)}</li>
            ))}
          </ul>
        </div>
      )}
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => void choose(e.target.files?.[0])} />
    </section>
  );
}
