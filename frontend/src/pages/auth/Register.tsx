import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, User, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import TelegramLogin from "@/components/auth/TelegramLogin";
import GoogleButton from "@/components/auth/GoogleButton";
import { normalizeUzPhone } from "@/utils/phone";
import { cn } from "@/utils/cn";

const registerSchema = z
  .object({
    // First and last name, as the server requires ("Ali Valiyev").
    name: z
      .string()
      .trim()
      .refine((v) => v.split(/\s+/).filter((p) => p.length >= 2).length >= 2, "Ism va familiyani to'liq kiriting: Ali Valiyev"),
    phone: z
      .string()
      .trim()
      .min(1, "Telefon raqam kiritilishi shart")
      .refine((v) => normalizeUzPhone(v) !== null, "Telefon raqamni to'liq kiriting: +998 90 123-45-67"),
    password: z
      .string()
      .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
      .regex(/[A-Za-z]/, "Parolda kamida bitta harf bo'lishi kerak")
      .regex(/\d/, "Parolda kamida bitta raqam bo'lishi kerak"),
    confirmPassword: z.string().min(6, "Parolni tasdiqlang"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parollar mos kelmaydi",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;
type FormSubmit = (v: { name: string; phone: string; password: string }) => Promise<void>;

/** The placeholder name Telegram accounts get when the user has no first name in Telegram. */
const TELEGRAM_PLACEHOLDER = "Telegram foydalanuvchi";

/**
 * Sign-up in two steps: 1) confirm the person (Telegram bot code or Google), 2) name, phone and password.
 * If the server has no Telegram bot configured, the form is shown directly (sign-up must not get stuck).
 */
export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // A guest sent here from a course card returns to that course once signed up.
  const from = (useLocation().state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const next = from || ROUTES.dashboard;
  const { user, isAuthenticated, loading, register: registerUser, updateUser } = useAuth();
  const [telegramUnavailable, setTelegramUnavailable] = useState(false);

  if (loading) return null;
  // Already a full account: nothing to register.
  if (isAuthenticated && user?.hasPassword !== false) return <Navigate to={next} replace />;

  const needsProfile = isAuthenticated && user?.hasPassword === false;
  const step = needsProfile ? 2 : 1;

  const afterTelegram = () => {
    const fresh = useAuthStore.getState().user;
    // This Telegram account was registered before: just signed in.
    if (fresh?.hasPassword) {
      toast.success(t("auth.register.alreadyRegistered"));
      navigate(next);
    }
    // Otherwise the page re-renders into step 2 (needsProfile).
  };

  const completeProfile: FormSubmit = async (v) => {
    const updated = await authService.completeRegistration(v);
    updateUser(updated);
    toast.success(t("auth.register.done"));
    navigate(next);
  };

  const plainRegister: FormSubmit = async (v) => {
    await registerUser(v);
    navigate(next);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("auth.register.title")}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("auth.register.subtitle")}</p>
      </div>

      {!telegramUnavailable && (
        <ol className="flex items-center gap-3 text-sm" aria-label={t("auth.register.stepsLabel")}>
          {[t("auth.register.step1"), t("auth.register.step2")].map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", done ? "bg-emerald-500 text-white" : current ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
                  {done ? <Check className="h-4 w-4" /> : n}
                </span>
                <span className={cn("font-medium", current ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {step === 1 && !telegramUnavailable && (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl bg-brand-50 p-4 text-sm text-slate-700 dark:bg-brand-950/40 dark:text-slate-300">
            <Send className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
            <p>{t("auth.register.telegramIntro")}</p>
          </div>
          <TelegramLogin mode="register" onVerified={afterTelegram} onUnavailable={() => setTelegramUnavailable(true)} />
        </div>
      )}

      {step === 2 && (
        <ProfileForm
          submitLabel={t("auth.register.finish")}
          defaultName={user?.name && user.name !== TELEGRAM_PLACEHOLDER ? user.name : ""}
          onSubmit={completeProfile}
        />
      )}

      {step === 1 && telegramUnavailable && <ProfileForm submitLabel={t("auth.register.submit")} defaultName="" onSubmit={plainRegister} />}

      {step === 1 && <GoogleButton next={from || ROUTES.dashboard} />}

      {step === 1 && (
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          {t("auth.register.hasAccount")}{" "}
          <Link to={ROUTES.login} state={from ? { from: { pathname: from } } : undefined} className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            {t("auth.register.login")}
          </Link>
        </p>
      )}
    </div>
  );
}

function ProfileForm({ submitLabel, defaultName, onSubmit }: { submitLabel: string; defaultName: string; onSubmit: FormSubmit }) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: defaultName, phone: "", password: "", confirmPassword: "" },
  });

  const submit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await onSubmit({ name: values.name.trim().replace(/\s+/g, " "), phone: normalizeUzPhone(values.phone) ?? values.phone, password: values.password });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.register.error");
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {serverError && <Alert variant="danger">{serverError}</Alert>}
      <Input id="register-name" label={t("auth.register.name")} type="text" autoComplete="name" enterKeyHint="next" placeholder="Ali Valiyev" leftIcon={<User className="h-4 w-4" />} error={errors.name?.message} {...register("name")} />
      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <PhoneInput
            id="register-phone"
            label={t("auth.register.phone")}
            autoComplete="tel"
            enterKeyHint="next"
            error={errors.phone?.message}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
      <Input id="register-password" label={t("auth.register.password")} type="password" autoComplete="new-password" enterKeyHint="next" placeholder="••••••••" leftIcon={<Lock className="h-4 w-4" />} error={errors.password?.message} {...register("password")} />
      <Input id="register-password-confirm" label={t("auth.register.confirmPassword")} type="password" autoComplete="new-password" enterKeyHint="done" placeholder="••••••••" leftIcon={<Lock className="h-4 w-4" />} error={errors.confirmPassword?.message} {...register("confirmPassword")} />
      <Button type="submit" loading={isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
