import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/services/api";
import { ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/** Second login step for accounts with 2FA: a TOTP code or a one-time recovery code. */
export default function TwoFactorStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const completeTwoFactor = useAuthStore((s) => s.completeTwoFactor);
  const cancel = useAuthStore((s) => s.cancelTwoFactor);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setError(t("auth.twoFactor.invalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await completeTwoFactor(code.trim());
      navigate(ROUTES.dashboard);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      const expired = !useAuthStore.getState().twoFactorChallenge;
      setError(status === 429 ? t("auth.twoFactor.locked") : expired ? t("auth.twoFactor.expired") : t("auth.twoFactor.invalid"));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          <KeyRound className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("auth.twoFactor.title")}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("auth.twoFactor.subtitle")}</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label={t("auth.twoFactor.code")}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={11}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit" loading={busy} className="w-full">
          {t("auth.twoFactor.submit")}
        </Button>
      </form>

      <button type="button" onClick={cancel} className="w-full text-center text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        {t("auth.twoFactor.back")}
      </button>
    </div>
  );
}
