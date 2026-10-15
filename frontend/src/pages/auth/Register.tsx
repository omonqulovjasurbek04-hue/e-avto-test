import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import TelegramLogin from "@/components/auth/TelegramLogin";

const registerSchema = z
  .object({
    name: z.string().min(2, "Ism kamida 2 ta belgidan iborat bo'lishi kerak"),
    email: z.string().min(1, "Email kiritilishi shart").email("Noto'g'ri email formati"),
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

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      navigate(ROUTES.dashboard);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("auth.register.error");
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("auth.register.title")}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t("auth.register.subtitle")}
        </p>
      </div>

      {serverError && <Alert variant="danger">{serverError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={t("auth.register.name")}
          type="text"
          placeholder={t("auth.register.name")}
          leftIcon={<User className="h-4 w-4" />}
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label={t("auth.register.email")}
          type="email"
          placeholder="example@mail.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label={t("auth.register.password")}
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label={t("auth.register.confirmPassword")}
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("auth.register.submit")}
        </Button>
      </form>

      <TelegramLogin />

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        {t("auth.register.hasAccount")}{" "}
        <Link
          to={ROUTES.login}
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {t("auth.register.login")}
        </Link>
      </p>
    </div>
  );
}
