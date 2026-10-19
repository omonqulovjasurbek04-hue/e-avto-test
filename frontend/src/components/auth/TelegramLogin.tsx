import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { env } from "@/config/env";
import { ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step = "idle" | "code";

interface Props {
  /** "register": first step of sign-up (no "or" divider, own wording, the page decides what comes next). */
  mode?: "login" | "register";
  /** register mode: called after the code is accepted and the session is set. */
  onVerified?: () => void;
  /** register mode: the server has no Telegram bot configured. */
  onUnavailable?: () => void;
}

/**
 * Sign in (or start sign-up) with Telegram: the user opens the bot by its plain link, presses Start and
 * gets a random one-time code; typing it here links the session to that Telegram account.
 */
export default function TelegramLogin({ mode = "login", onVerified, onUnavailable }: Props) {
  const navigate = useNavigate();
  const applyLoginResult = useAuthStore((s) => s.applyLoginResult);
  const [step, setStep] = useState<Step>("idle");
  const [botUrl, setBotUrl] = useState("");
  const [botName, setBotName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The demo mode has no backend, so there is no bot to talk to.
  if (env.useMock) return null;

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authService.telegramStart();
      setBotUrl(res.botUrl);
      setBotName(res.botUsername);
      setCode("");
      setStep("code");
      window.open(res.botUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      if (e instanceof ApiError && e.status === 503 && onUnavailable) onUnavailable();
      else toast.error(e instanceof Error ? e.message : "Telegram orqali kirib bo'lmadi");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("6 xonali kodni kiriting");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await authService.telegramVerify(code);
      applyLoginResult(result);
      // With 2FA the login page switches to the code step instead.
      if (!("token" in result)) navigate(ROUTES.login);
      else if (mode === "register" && onVerified) onVerified();
      // A brand-new Telegram account still needs its phone and password.
      else if (result.user.hasPassword === false) navigate(ROUTES.register);
      else navigate(ROUTES.dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kod noto'g'ri yoki muddati o'tgan");
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="space-y-3">
      {!isRegister && (
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          yoki
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
      )}

      {step === "idle" ? (
        <Button type="button" variant={isRegister ? "primary" : "outline"} className="w-full" loading={busy} onClick={begin} leftIcon={<Send className="h-4 w-4" />}>
          {isRegister ? "Telegram orqali tasdiqlash" : "Telegram orqali kirish"}
        </Button>
      ) : (
        // Own light (or dark) panel: over the moving video the steps stay readable without the text halo.
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm [text-shadow:none] dark:border-slate-700 dark:bg-slate-900/85">
          {/* Steps in full-contrast text: they are read over the video background of the auth pages. */}
          <ol className="list-decimal space-y-1.5 pl-5 text-sm font-medium text-black dark:text-white">
            <li>
              <a href={botUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline dark:text-brand-300">
                {botName ? `@${botName}` : "Telegram bot"}
              </a>{" "}
              ni oching va <b>Start</b> tugmasini bosing.
            </li>
            <li>Bot sizga tasodifiy 6 xonali kod beradi.</li>
            <li>O'sha kodni shu yerga kiriting.</li>
          </ol>
          <Input
            label="Kod"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            error={error ?? undefined}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && void verify()}
          />
          <div className="flex gap-2">
            <Button type="button" className="flex-1" loading={busy} onClick={verify}>
              {isRegister ? "Tasdiqlash" : "Kirish"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep("idle")}>
              Bekor qilish
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
