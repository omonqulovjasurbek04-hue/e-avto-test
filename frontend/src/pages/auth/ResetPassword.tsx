import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const resetSchema = z
  .object({
    newPassword: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo‘lishi kerak"),
    confirmPassword: z.string().min(6, "Parolni tasdiqlang"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Parollar mos kelmaydi",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetFormValues) => {
    setServerError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success("Parol muvaffaqiyatli yangilandi");
      navigate(ROUTES.login);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Parolni yangilashda xatolik yuz berdi";
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Yangi parol o‘rnating
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Hisobingiz uchun yangi parol yarating
        </p>
      </div>

      {serverError && <Alert variant="danger">{serverError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Yangi parol"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />

        <Input
          label="Yangi parolni tasdiqlang"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          Parolni yangilash
        </Button>
      </form>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        <Link
          to={ROUTES.login}
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Kirish sahifasiga qaytish
        </Link>
      </p>
    </div>
  );
}
