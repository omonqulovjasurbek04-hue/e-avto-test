import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { env } from "@/config/env";
import { ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step = "idle" | "code";

/** Sign in with a one-time code that the Telegram bot sends after the user presses Start. */
export default function TelegramLogin() {
  const navigate = useNavigate();
  const { loginWithSession } = useAuth();
  const [step, setStep] = useState<Step>("idle");
  const [sessionId, setSessionId] = useState("");
  const [botUrl, setBotUrl] = useState("");
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
      setSessionId(res.sessionId);
      setBotUrl(res.botUrl);
      setCode("");
      setStep("code");
      window.open(res.botUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Telegram orqali kirib bo'lmadi");
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
      const { user, token } = await authService.telegramVerify(sessionId, code);
      loginWithSession(user, token);
      navigate(ROUTES.dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kod noto'g'ri yoki muddati o'tgan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        yoki
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      {step === "idle" ? (
        <Button type="button" variant="outline" className="w-full" loading={busy} onClick={begin} leftIcon={<Send className="h-4 w-4" />}>
          Telegram orqali kirish
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <a href={botUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 underline">
                Telegram botni oching
              </a>{" "}
              va <b>Start</b> tugmasini bosing.
            </li>
            <li>Bot yuborgan 6 xonali kodni shu yerga kiriting.</li>
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
              Kirish
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
