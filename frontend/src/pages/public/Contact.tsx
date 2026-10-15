import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { siteService } from "@/services/site.service";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Contact() {
  const { t } = useTranslation();
  const site = useSiteSettings();

  const schema = z.object({
    name: z.string().min(2, t("validation.minLength", { min: 2 })),
    email: z.string().email(t("validation.email")),
    subject: z.string().min(3, t("validation.minLength", { min: 3 })),
    message: z.string().min(10, t("validation.minLength", { min: 10 })),
    // Honeypot: hidden from people, filled by bots.
    website: z.string().optional(),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await siteService.contact({
        name: values.name,
        contact: values.email,
        message: `${values.subject}\n\n${values.message}`,
        website: values.website || undefined,
      });
      toast.success(t("contact.form.success"));
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("contact.form.error", { defaultValue: "Yuborib bo'lmadi, keyinroq urinib ko'ring" }));
    }
  };

  const info = [
    { icon: Phone, value: site.phone },
    { icon: Mail, value: site.email },
    { icon: MapPin, value: site.address },
    { icon: Clock, value: site.workingHours },
  ].filter((i) => i.value);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("contact.title")}</h1>
          <p className="mt-2 text-slate-500">{t("contact.description")}</p>
        </div>

        {info.length > 0 && (
          <ul className="mb-6 grid gap-3 sm:grid-cols-2">
            {info.map(({ icon: Icon, value }) => (
              <li key={value} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <Icon className="h-4 w-4 shrink-0 text-brand-600" />
                <span>{value}</span>
              </li>
            ))}
          </ul>
        )}

        <Card padded>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input label={t("contact.form.name")} placeholder={t("contact.form.namePlaceholder")} error={errors.name?.message} {...register("name")} />
            <Input label={t("contact.form.email")} type="email" placeholder={t("contact.form.emailPlaceholder")} leftIcon={<Mail className="h-4 w-4" />} error={errors.email?.message} {...register("email")} />
            <Input label={t("contact.form.subject")} placeholder={t("contact.form.subjectPlaceholder")} error={errors.subject?.message} {...register("subject")} />
            <Textarea label={t("contact.form.message")} rows={5} placeholder={t("contact.form.messagePlaceholder")} error={errors.message?.message} {...register("message")} />
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Veb-sayt
                <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
              </label>
            </div>
            <Button type="submit" loading={isSubmitting} rightIcon={<Send className="h-4 w-4" />}>
              {t("contact.form.send")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
