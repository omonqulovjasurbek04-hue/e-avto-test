import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const forgotSchema = z.object({
  email: z.string().min(1, "Email kiritilishi shart").email("Noto'g'ri email formati"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (_values: ForgotFormValues) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success(t("auth.forgotPassword.success"));
    } catch {
      toast.error(t("auth.forgotPassword.error"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("auth.forgotPassword.title")}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t("auth.forgotPassword.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={t("auth.forgotPassword.email")}
          type="email"
          placeholder="example@mail.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("auth.forgotPassword.submit")}
        </Button>
      </form>
    </div>
  );
}
