import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Moon,
  Languages,
  Shield,
  Check,
} from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/utils/cn";
import { SUPPORTED_LANGUAGES, setLanguage } from "@/i18n";
import LanguageFlag from "@/components/common/LanguageFlag";
import NotificationPreferences from "@/components/settings/NotificationPreferences";
import SecuritySettings from "@/components/settings/SecuritySettings";
import { ConnectedDevices } from "@/components/settings/ConnectedDevices";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useUIStore();
  const [params] = useSearchParams();
  type Tab = "appearance" | "language" | "notifications" | "security";
  // Security is the first tab and opens by default; ?tab=<id> opens another one.
  const [tab, setTab] = useState<Tab>((["appearance", "language", "notifications"] as Tab[]).find((id) => id === params.get("tab")) ?? "security");

  const passwordSchema = z
    .object({
      current: z.string().min(6, t("validation.minLength", { min: 6 })),
      next: z.string().min(8, t("validation.minLength", { min: 8 })),
      confirm: z.string().min(6, t("validation.minLength", { min: 6 })),
    })
    .refine((v) => v.next === v.confirm, {
      message: t("validation.passwordMatch"),
      path: ["confirm"],
    });

  type PasswordValues = z.infer<typeof passwordSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const onPassword = async (values: PasswordValues) => {
    try {
      await authService.changePassword(values.current, values.next);
      toast.success(t("profile.updatePassword") + " " + t("contact.form.success"));
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  const tabs = [
    { id: "security", label: t("security.tab") },
    { id: "appearance", label: t("settings.appearance") },
    { id: "language", label: t("settings.language") },
    { id: "notifications", label: t("settings.notifications") },
  ];

  return (
    <div className="container-page py-8 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Interfeys tili, rejim va xavfsizlik sozlamalari
        </p>
      </header>

      <Tabs tabs={tabs} activeTab={tab} onChange={(id) => setTab(id as typeof tab)} />

      {tab === "appearance" && (
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Sun className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("settings.appearance")}
            </CardTitle>
            <CardDescription>{t("settings.theme")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid max-w-md grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-4 transition shadow-sm",
                  theme === "light"
                    ? "border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-900"
                    : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                )}
              >
                <span className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
                  <Sun className="h-5 w-5 text-amber-500" /> {t("settings.lightMode")}
                </span>
                {theme === "light" && <Check className="h-5 w-5 text-brand-600" />}
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-4 transition shadow-sm",
                  theme === "dark"
                    ? "border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-300"
                    : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                )}
              >
                <span className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
                  <Moon className="h-5 w-5 text-indigo-500" /> {t("settings.darkMode")}
                </span>
                {theme === "dark" && <Check className="h-5 w-5 text-brand-400" />}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "language" && (
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Languages className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("settings.language")}
            </CardTitle>
            <CardDescription>Platforma tilini tanlang (O'zbekcha lotin, Ўзбекча кирилл, Русский)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid max-w-xl grid-cols-1 sm:grid-cols-3 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = i18n.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      void setLanguage(lang.code);
                      toast.success(`${lang.name} tanlandi`);
                    }}
                    className={cn(
                      "flex flex-col items-start justify-between rounded-2xl border p-4 transition text-left space-y-3",
                      isActive
                        ? "border-brand-500 bg-brand-50/80 dark:border-brand-400 dark:bg-brand-500/10 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <LanguageFlag code={lang.code} className="h-4 w-6" />
                      {isActive && <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 font-black" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {lang.name}
                      </h4>
                      <span className="text-xs text-slate-400 font-semibold">{lang.short}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "notifications" && <NotificationPreferences />}

      {tab === "security" && (
        <div className="space-y-6">
        {/* One card: password on the left, connected devices on the right, a line between them. */}
        <Card className="grid overflow-hidden rounded-3xl border border-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-slate-200 dark:border-slate-800 lg:dark:divide-slate-800">
          <div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("profile.changePassword")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onPassword)} className="max-w-md space-y-4">
              <Input
                label={t("profile.currentPassword")}
                type="password"
                error={errors.current?.message}
                {...register("current")}
              />
              <Input
                label={t("profile.newPassword")}
                type="password"
                error={errors.next?.message}
                {...register("next")}
              />
              <Input
                label={t("profile.confirmPassword")}
                type="password"
                error={errors.confirm?.message}
                {...register("confirm")}
              />
              <div className="flex justify-end pt-2">
                <Button type="submit" loading={isSubmitting} className="font-bold">
                  {t("profile.updatePassword")}
                </Button>
              </div>
            </form>
          </CardContent>
          </div>
          <div className="border-t border-slate-200 p-6 lg:border-t-0 dark:border-slate-800">
            <ConnectedDevices />
          </div>
        </Card>
        <SecuritySettings />
        </div>
      )}

    </div>
  );
}