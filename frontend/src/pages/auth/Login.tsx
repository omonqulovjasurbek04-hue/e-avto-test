import { useState } from "react";
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
  // A protected page that sent the guest here is where they return after logging in.
  const from = (useLocation().state as { from?: { pathname?: string } } | null)?.from?.pathname;
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
    defaultValues: { login: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const result = await login(values.login, values.password);
      // Accounts with 2FA stay on this page for the code step.
      if ("token" in result) navigate(from || ROUTES.dashboard, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.login.error");
      setServerError(message);
      toast.error(message);
    }
  };

  if (twoFactorPending) return <TwoFactorStep />;

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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* The phone number is the account login: "username" lets password managers fill it with the password. */}
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
              name={field.name}
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
