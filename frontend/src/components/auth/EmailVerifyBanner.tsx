import { Link } from "react-router-dom";
import { MailWarning } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth.store";

/** Reminder for accounts whose e-mail is not confirmed yet; the action lives in Settings → Security. */
export default function EmailVerifyBanner() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  if (!user?.email || user.emailVerified !== false) return null;
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <MailWarning className="h-4 w-4 shrink-0" />
      <span>{t("security.banner")}</span>
      <Link to="/settings?tab=security" className="font-semibold underline">
        {t("security.bannerAction")}
      </Link>
    </div>
  );
}
