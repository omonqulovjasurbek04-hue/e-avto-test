import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Link2, Send } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { env } from "@/config/env";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/**
 * Sign-in methods linked to the account: Google (a trip to Google and back) and Telegram (a bot code).
 * Either can be unlinked as long as the account keeps a way to sign in.
 */
export function LinkedAccounts() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [tgCode, setTgCode] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"google" | "telegram" | null>(null);

  // Back from Google: say how linking went, then drop the marker from the address.
  useEffect(() => {
    const result = params.get("google");
    if (!result) return;
    if (result === "linked") toast.success(t("linked.googleLinked"));
    else toast.error(t(`linked.errors.${result}`, { defaultValue: t("linked.errors.failed") }));
    params.delete("google");
    setParams(params, { replace: true });
  }, [params, setParams, t]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("linked.errors.failed"));
    } finally {
      setBusy(null);
    }
  };

  const linkGoogle = () => {
    setBusy("google");
    window.location.assign(`${env.apiUrl}/auth/google/start?link=1`);
  };

  const unlink = (method: "google" | "telegram") => {
    setConfirming(null);
    return run(method, async () => {
      updateUser(method === "google" ? await authService.unlinkGoogle() : await authService.unlinkTelegram());
      toast.success(t("linked.unlinked"));
    });
  };

  const openBot = () =>
    run("telegram", async () => {
      const res = await authService.telegramStart();
      window.open(res.botUrl, "_blank", "noopener,noreferrer");
      setTgCode("");
    });

  const confirmTelegram = () =>
    run("telegram", async () => {
      updateUser(await authService.linkTelegram(tgCode ?? ""));
      setTgCode(null);
      toast.success(t("linked.telegramLinked"));
    });

  const googleLinked = Boolean(user?.googleLinked);
  const telegramLinked = Boolean(user?.telegramLinked);
  // The account must keep a way in: a password or the other linked method.
  const hasPassword = user?.hasPassword !== false;
  const rows = [
    { key: "google" as const, name: "Google", icon: <GoogleIcon />, linked: googleLinked, who: user?.googleEmail, canUnlink: hasPassword || telegramLinked, onLink: linkGoogle },
    { key: "telegram" as const, name: "Telegram", icon: <Send className="h-5 w-5 text-sky-500" />, linked: telegramLinked, who: user?.telegramName, canUnlink: hasPassword || googleLinked, onLink: openBot },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Link2 className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("linked.title")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{t("linked.description")}</p>
      </div>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} className={cn("rounded-2xl border p-4", r.linked ? "border-emerald-200 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800")}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">{r.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                  {r.name}
                  <Badge variant={r.linked ? "success" : "neutral"}>{r.linked ? t("linked.on") : t("linked.off")}</Badge>
                </p>
                {r.linked && r.who ? (
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{r.who}</p>
                ) : (
                  <p className="text-xs text-slate-500">{t(`linked.${r.key}Hint`)}</p>
                )}
                {r.linked && !r.canUnlink && <p className="text-xs text-amber-600 dark:text-amber-400">{t("linked.lastMethod")}</p>}
              </div>
              {r.linked ? (
                <Button variant="outline" size="sm" loading={busy === r.key} disabled={!r.canUnlink} onClick={() => setConfirming(r.key)}>
                  {t("linked.unlink")}
                </Button>
              ) : (
                <Button size="sm" loading={busy === r.key && tgCode === null} onClick={() => void r.onLink()}>
                  {t("linked.link")}
                </Button>
              )}
            </div>

            {/* Telegram: the bot sent a 6-digit code; typing it here links the account. */}
            {r.key === "telegram" && !r.linked && tgCode !== null && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <Input
                    label={t("linked.codeLabel")}
                    inputMode="numeric"
                    maxLength={6}
                    value={tgCode}
                    onChange={(e) => setTgCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button size="sm" disabled={tgCode.length !== 6} loading={busy === "telegram"} onClick={() => void confirmTelegram()}>
                  {t("linked.confirm")}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        isOpen={confirming !== null}
        message={confirming ? t(`linked.confirmUnlink.${confirming}`) : ""}
        confirmText={t("linked.unlink")}
        onConfirm={() => confirming && void unlink(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
