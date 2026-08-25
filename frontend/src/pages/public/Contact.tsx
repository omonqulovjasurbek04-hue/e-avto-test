import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function Contact() {
  const { t } = useTranslation();

  const schema = z.object({
    name: z.string().min(2, t("validation.minLength", { min: 2 })),
    email: z.string().email(t("validation.email")),
    subject: z.string().min(3, t("validation.minLength", { min: 3 })),
    message: z.string().min(10, t("validation.minLength", { min: 10 })),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (_values: FormValues) => {
    await new Promise((r) => setTimeout(r, 600));
    toast.success(t("contact.form.success"));
    reset();
  };

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("contact.title")}</h1>
          <p className="mt-2 text-slate-500">
            {t("contact.description")}
          </p>
        </div>

        <Card padded>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t("contact.form.name")}
              placeholder={t("contact.form.namePlaceholder")}
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label={t("contact.form.email")}
              type="email"
              placeholder={t("contact.form.emailPlaceholder")}
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label={t("contact.form.subject")}
              placeholder={t("contact.form.subjectPlaceholder")}
              error={errors.subject?.message}
              {...register("subject")}
            />
            <Textarea
              label={t("contact.form.message")}
              rows={5}
              placeholder={t("contact.form.messagePlaceholder")}
              error={errors.message?.message}
              {...register("message")}
            />
            <Button type="submit" loading={isSubmitting} rightIcon={<Send className="h-4 w-4" />}>
              {t("contact.form.send")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}