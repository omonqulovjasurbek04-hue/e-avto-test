import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Clock, ExternalLink, Mail, MapPin, Phone, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useAuth } from "@/hooks/useAuth";
import { normalizeUzPhone } from "@/utils/phone";
import { Card } from "@/components/ui/Card";
import { siteService } from "@/services/site.service";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { DEFAULT_CONTACT } from "@/constants/config";

export default function Contact() {
  const { t, i18n } = useTranslation();
  const site = useSiteSettings();
  const { user } = useAuth();

  const schema = z.object({
    name: z.string().min(2, t("validation.minLength", { min: 2 })),
    // We answer by phone or Telegram, so the reply channel is the phone number.
    phone: z.string().refine((v) => normalizeUzPhone(v) !== null, t("contact.form.phoneInvalid")),
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // A signed-in student does not have to type their name and number again.
    values: { name: user?.name ?? "", phone: user?.phone ?? "", subject: "", message: "", website: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await siteService.contact({
        name: values.name,
        contact: normalizeUzPhone(values.phone) ?? values.phone,
        message: `${values.subject}\n\n${values.message}`,
        website: values.website || undefined,
      });
      toast.success(t("contact.form.success"));
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("contact.form.error", { defaultValue: "Yuborib bo'lmadi, keyinroq urinib ko'ring" }));
    }
  };

  // Centres from the admin panel; until they are entered, the site address is the one centre.
  const branches = site.branches?.length
    ? site.branches
    : [{ name: site.siteName || "E-Avto Test", address: site.address || DEFAULT_CONTACT.address }];
  const [active, setActive] = useState(0);
  const branch = branches[Math.min(active, branches.length - 1)];
  const mapQuery = encodeURIComponent(branch.address);
  const mapLang = i18n.language === "ru" ? "ru" : "uz";

  // Tappable contacts: the phone dials, e-mail opens the mail app, Telegram opens the bot.
  const telegramUrl = site.telegramBot || import.meta.env.VITE_TELEGRAM_URL;
  const contacts = [
    site.phone && { icon: Phone, label: t("contact.call"), value: site.phone, href: `tel:${site.phone.replace(/[^\d+]/g, "")}` },
    telegramUrl && { icon: Send, label: t("contact.telegram"), value: `@${telegramUrl.replace(/^https?:\/\/t\.me\//, "").replace(/\/$/, "")}`, href: telegramUrl, external: true },
    site.email && { icon: Mail, label: t("contact.email"), value: site.email, href: `mailto:${site.email}` },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string; external?: boolean }[];

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("contact.title")}</h1>
          <p className="mt-2 text-slate-500">{t("contact.description")}</p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div>
            {contacts.length > 0 && (
              <ul className="mb-6 grid gap-3 sm:grid-cols-2">
                {contacts.map(({ icon: Icon, label, value, href, external }) => (
                  <li key={href}>
                    <a
                      href={href}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-600"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-950/50 dark:text-brand-400">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{label}</span>
                        <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {site.workingHours && (
              <p className="-mt-3 mb-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4 shrink-0 text-brand-600" /> {site.workingHours}
              </p>
            )}

            <Card padded>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <Input label={t("contact.form.name")} placeholder={t("contact.form.namePlaceholder")} error={errors.name?.message} {...register("name")} />
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      id="contact-phone"
                      label={t("contact.form.phone")}
                      autoComplete="tel"
                      error={errors.phone?.message}
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
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

          {/* Centres: pick one in the list and the map shows it. */}
          <Card padded className="space-y-4 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("contact.map.title")}</h2>
            {branches.length > 1 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {branches.map((b, i) => (
                  <li key={`${b.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-pressed={i === active}
                      className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                        i === active
                          ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40"
                          : "border-slate-200 hover:border-brand-300 dark:border-slate-800 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className="block font-semibold text-slate-800 dark:text-slate-100">{b.name}</span>
                      <span className="block text-slate-500 dark:text-slate-400">{b.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <iframe
                key={branch.address}
                title={t("contact.map.frameTitle", { name: branch.name })}
                src={`https://www.google.com/maps?q=${mapQuery}&hl=${mapLang}&z=14&output=embed`}
                className="h-80 w-full lg:h-[460px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
                {branches.length > 1 ? `${branch.name} — ${branch.address}` : branch.address}
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                {t("contact.map.open")} <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
