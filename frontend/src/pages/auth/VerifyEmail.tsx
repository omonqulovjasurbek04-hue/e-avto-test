import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { Spinner } from "@/components/ui/Spinner";

type State = "checking" | "ok" | "invalid" | "missing";

/** Landing page of the e-mailed verification link. */
export default function VerifyEmail() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>(token ? "checking" : "missing");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateUser = useAuthStore((s) => s.updateUser);
  // The token is single-use: React StrictMode's double effect must not send it twice.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    authService
      .verifyEmail(token)
      .then(() => {
        setState("ok");
        updateUser({ emailVerified: true });
      })
      .catch(() => setState("invalid"));
  }, [token, updateUser]);

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("auth.verifyEmail.title")}</h2>
      {state === "checking" && (
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
          <Spinner />
          {t("auth.verifyEmail.verifying")}
        </div>
      )}
      {state === "ok" && (
        <p className="flex items-center justify-center gap-2 font-medium text-emerald-600">
          <CheckCircle2 className="h-5 w-5" /> {t("auth.verifyEmail.success")}
        </p>
      )}
      {(state === "invalid" || state === "missing") && (
        <p className="flex items-center justify-center gap-2 font-medium text-red-600">
          <XCircle className="h-5 w-5 shrink-0" /> {t(state === "missing" ? "auth.verifyEmail.missing" : "auth.verifyEmail.invalid")}
        </p>
      )}
      {state !== "checking" && (
        <Link to={isAuthenticated ? ROUTES.dashboard : ROUTES.login} className="inline-block font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
          {t(isAuthenticated ? "auth.verifyEmail.toDashboard" : "auth.verifyEmail.toLogin")}
        </Link>
      )}
    </div>
  );
}
