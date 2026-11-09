import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import TelegramLogin from "@/components/auth/TelegramLogin";
import GoogleButton from "@/components/auth/GoogleButton";
import TwoFactorStep from "@/components/auth/TwoFactorStep";
import { useAuthStore } from "@/store/auth.store";
import { normalizeUzPhone } from "@/utils/phone";
import type { TFunction } from "i18next";

const REMEMBERED_LOGIN_KEY = "e_avto_login_phone";
const RETURN_TO_KEY = "e_avto_login_return_to";

const safeReturnPath = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const location = value as { pathname?: unknown; search?: unknown; hash?: unknown };
  if (typeof location.pathname !== "string" || !location.pathname.startsWith("/") || location.pathname.startsWith("//")) return null;
  if (location.pathname === ROUTES.login) return null;
  const search = typeof location.search === "string" ? location.search : "";
  const hash = typeof location.hash === "string" ? location.hash : "";
  return `${location.pathname}${search}${hash}`;
};

const readStoredValue = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const readRememberedLogin = (): string => {
  try {
    return localStorage.getItem(REMEMBERED_LOGIN_KEY) ?? "";
  } catch {
    return "";
  }
};

// The login is the phone number: the field always yields "+998XXXXXXXXX" (or a partial one while typing).
const makeLoginSchema = (t: TFunction) =>
  z.object({
    login: z
      .string()
      .trim()
      .min(1, t("auth.login.phoneRequired"))
      .refine((v) => normalizeUzPhone(v) !== null, t("auth.login.phoneInvalid")),
    password: z.string().min(1, t("auth.login.passwordRequired")),
  });

type LoginFormValues = z.infer<ReturnType<typeof makeLoginSchema>>;

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturnPath = safeReturnPath((location.state as { from?: unknown } | null)?.from);
  // Keep the protected destination through a refresh while signing in, including the 2FA step.
  const from = requestedReturnPath ?? safeReturnPath({ pathname: readStoredValue(RETURN_TO_KEY) }) ?? ROUTES.dashboard;
  const [rememberedLogin] = useState(readRememberedLogin);
  const [rememberPhone, setRememberPhone] = useState(Boolean(rememberedLogin));
  const { login } = useAuth();
  const twoFactorPending = useAuthStore((s) => Boolean(s.twoFactorChallenge));
  // Back from Google without a session: say why (cancelled, failed, account disabled, not configured).
  const googleError = useSearchParams()[0].get("google");
  const [serverError, setServerError] = useState<string | null>(
    googleError ? t(`auth.google.errors.${googleError}`, { defaultValue: t("auth.google.errors.failed") }) : null
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(makeLoginSchema(t)),
    defaultValues: { login: rememberedLogin, password: "" },
  });

  useEffect(() => {
    if (!requestedReturnPath) return;
    try {
      sessionStorage.setItem(RETURN_TO_KEY, requestedReturnPath);
    } catch {
      // The in-memory router state still preserves the destination for this visit.
    }
  }, [requestedReturnPath]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const result = await login(values.login, values.password);
      try {
        if (rememberPhone) localStorage.setItem(REMEMBERED_LOGIN_KEY, normalizeUzPhone(values.login) ?? values.login);
        else localStorage.removeItem(REMEMBERED_LOGIN_KEY);
      } catch {
        // Chrome can still offer to save the credentials when site storage is unavailable.
      }
      // Accounts with 2FA stay on this page for the code step.
      if ("token" in result) {
        try {
          sessionStorage.removeItem(RETURN_TO_KEY);
        } catch {
          // Navigation can proceed without session storage.
        }
        navigate(from, { replace: true });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.login.error");
      setServerError(message);
      toast.error(message);
    }
  };

  if (twoFactorPending) return <TwoFactorStep nextPath={from} />;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("auth.login.title")}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t("auth.login.subtitle")}
        </p>
      </div>

      {serverError && (
        <Alert variant="danger">{serverError}</Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on" noValidate>
        <Controller
          name="login"
          control={control}
          render={({ field }) => (
            <PhoneInput
              id="login-phone"
              label={t("auth.login.phone")}
              autoComplete="username"
              enterKeyHint="next"
              error={errors.login?.message}
              name="username"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />

        <Input
          id="login-password"
          label={t("auth.login.password")}
          type="password"
          autoComplete="current-password"
          enterKeyHint="go"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-start gap-2">
          <input
            id="remember-phone"
            type="checkbox"
            checked={rememberPhone}
            onChange={(event) => {
              const checked = event.target.checked;
              setRememberPhone(checked);
              if (!checked) {
                try {
                  localStorage.removeItem(REMEMBERED_LOGIN_KEY);
                } catch {
                  // The browser password manager still works without site storage.
                }
              }
            }}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="remember-phone" className="text-sm text-slate-600 dark:text-slate-300">
            {t("auth.login.rememberPhone")}
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{t("auth.login.browserPasswordHint")}</span>
          </label>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("auth.login.submit")}
        </Button>
      </form>

      <TelegramLogin />
      <GoogleButton next={from || ROUTES.dashboard} />

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        {t("auth.login.noAccount")}{" "}
        <Link
          to={ROUTES.register}
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {t("auth.login.register")}
        </Link>
      </p>
    </div>
  );
}
