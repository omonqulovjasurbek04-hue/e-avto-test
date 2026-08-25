import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const loginSchema = z.object({
  email: z.string().min(1, "Email kiritilishi shart").email("Noto‘g‘ri email formati"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo‘lishi kerak"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(ROUTES.dashboard);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kirishda xatolik yuz berdi";
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Hisobingizga kiring
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          E-Avto Test platformasiga xush kelibsiz
        </p>
      </div>

      {serverError && (
        <Alert variant="danger">{serverError}</Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="example@mail.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Parol"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex justify-end">
          <Link
            to={ROUTES.forgotPassword}
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Parolni unutdingizmi?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Kirish
        </Button>
      </form>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Hisobingiz yo‘qmi?{" "}
        <Link
          to={ROUTES.register}
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Ro‘yxatdan o‘ting
        </Link>
      </p>
    </div>
  );
}
