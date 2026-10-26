import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KeyRound, Copy } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { TwoFactorStatus } from "@/types/user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

const cardClass = "rounded-3xl border border-slate-200 dark:border-slate-800";

const codeError = (e: unknown, t: (k: string) => string) => {
  const msg = e instanceof Error ? e.message : "";
  if (/password/i.test(msg)) return t("security.wrongPassword");
  if (/code/i.test(msg)) return t("security.invalidCode");
  return t("security.error");
};

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useTranslation();
  return (
    <Alert variant="warning" title={t("security.recoveryTitle")}>
      <p className="text-sm">{t("security.recoveryHint")}</p>
      <ul data-testid="recovery-codes" className="my-3 grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="rounded-lg bg-white/70 px-2 py-1 dark:bg-slate-900/60">{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => void navigator.clipboard?.writeText(codes.join("\n")).then(() => toast.success(t("security.copied")))}>
          {t("security.copy")}
        </Button>
        <Button size="sm" onClick={onDone}>{t("security.recoveryDone")}</Button>
      </div>
    </Alert>
  );
}

/** TOTP 2FA for admin / finance accounts: setup, recovery codes, turning it off. */
function TwoFactorCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [mode, setMode] = useState<"idle" | "disable" | "regen">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => authService.twoFactorStatus().then(setStatus).catch(() => setStatus(null));
  useEffect(() => {
    void load();
  }, []);

  if (!status?.available && !status?.enabled) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(codeError(e, t));
    } finally {
      setBusy(false);
    }
  };

  const begin = () => run(async () => setSetup(await authService.twoFactorSetup()));
  const confirm = () =>
    run(async () => {
      const r = await authService.twoFactorEnable(code.trim());
      setRecovery(r.recoveryCodes);
      setSetup(null);
      setCode("");
      updateUser({ twoFactorEnabled: true });
      toast.success(t("security.enabledToast"));
      await load();
    });
  const disable = () =>
    run(async () => {
      await authService.twoFactorDisable(password || undefined, code.trim());
      setMode("idle");
      setCode("");
      setPassword("");
      updateUser({ twoFactorEnabled: false });
      toast.success(t("security.disabledToast"));
      await load();
    });
  const regen = () =>
    run(async () => {
      const r = await authService.twoFactorRecoveryCodes(code.trim());
      setRecovery(r.recoveryCodes);
      setMode("idle");
      setCode("");
      toast.success(t("security.regenToast"));
      await load();
    });

  return (
    <Card className={cardClass}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-bold">
          <KeyRound className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("security.twoFactorTitle")}
          <Badge variant={status.enabled ? "success" : "neutral"}>{t(status.enabled ? "security.twoFactorOn" : "security.twoFactorOff")}</Badge>
        </CardTitle>
        <CardDescription>{t("security.twoFactorDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="max-w-xl space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {recovery && <RecoveryCodes codes={recovery} onDone={() => setRecovery(null)} />}

        {!status.enabled && !setup && (
          <Button loading={busy} onClick={begin}>{t("security.enable")}</Button>
        )}

        {setup && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("security.setupStep1")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-400">{t("security.secretLabel")}</span>
              <code data-testid="totp-secret" className="break-all rounded-lg bg-slate-100 px-2 py-1 font-mono text-sm dark:bg-slate-800">{setup.secret}</code>
              <Button size="sm" variant="ghost" leftIcon={<Copy className="h-4 w-4" />} onClick={() => void navigator.clipboard?.writeText(setup.secret).then(() => toast.success(t("security.copied")))}>
                {t("security.copy")}
              </Button>
              <a href={setup.otpauthUrl} className="text-sm font-medium text-brand-600 underline dark:text-brand-400">{t("security.openApp")}</a>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("security.setupStep2")}</p>
            <Input label={t("auth.twoFactor.code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <div className="flex gap-2">
              <Button loading={busy} onClick={confirm}>{t("security.confirm")}</Button>
              <Button variant="ghost" onClick={() => { setSetup(null); setCode(""); setError(null); }}>{t("security.cancel")}</Button>
            </div>
          </div>
        )}

        {status.enabled && mode === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{t("security.codesLeft", { count: status.recoveryCodesLeft })}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { setMode("regen"); setError(null); }}>{t("security.regen")}</Button>
              <Button variant="danger" size="sm" onClick={() => { setMode("disable"); setError(null); }}>{t("security.disable")}</Button>
            </div>
          </div>
        )}

        {status.enabled && mode !== "idle" && (
          <div className="space-y-3">
            {mode === "disable" && user?.hasPassword !== false && (
              <Input label={t("security.password")} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
            <Input label={t("security.code")} autoComplete="one-time-code" maxLength={11} value={code} onChange={(e) => setCode(e.target.value)} />
            <div className="flex gap-2">
              <Button variant={mode === "disable" ? "danger" : "primary"} loading={busy} onClick={mode === "disable" ? disable : regen}>
                {t(mode === "disable" ? "security.disable" : "security.regen")}
              </Button>
              <Button variant="ghost" onClick={() => { setMode("idle"); setCode(""); setPassword(""); setError(null); }}>{t("security.cancel")}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SecuritySettings() {
  return (
    <TwoFactorCard />
  );
}
