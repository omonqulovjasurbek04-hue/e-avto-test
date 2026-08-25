import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Moon,
  Languages,
  Bell,
  Shield,
  LogOut,
  Check,
  Globe,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/store/ui.store";
import { ROUTES } from "@/constants/routes";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/utils/cn";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, setTheme } = useUIStore();
  const [tab, setTab] = useState<"appearance" | "language" | "notifications" | "security">("appearance");
  const [notifications, setNotifications] = useState({
    results: true,
    reminders: false,
    promotions: false,
  });

  const passwordSchema = z
    .object({
      current: z.string().min(6, t("validation.minLength", { min: 6 })),
      next: z.string().min(6, t("validation.minLength", { min: 6 })),
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

  const onPassword = async (_values: PasswordValues) => {
    await new Promise((r) => setTimeout(r, 600));
    toast.success(t("profile.updatePassword") + " " + t("contact.form.success"));
    reset();
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  const tabs = [
    { id: "appearance", label: t("settings.appearance") },
    { id: "language", label: t("settings.language") },
    { id: "notifications", label: t("settings.notifications") },
    { id: "security", label: t("settings.title") },
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
                      void i18n.changeLanguage(lang.code);
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
                      <span className="text-2xl">{lang.flag}</span>
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

      {tab === "notifications" && (
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Bell className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("settings.notifications")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-w-xl">
            {(
              [
                { key: "results", label: t("testResult.title"), desc: t("settings.emailNotifications") },
                { key: "reminders", label: t("settings.notifications"), desc: t("settings.pushNotifications") },
                { key: "promotions", label: t("nav.home"), desc: t("settings.notifications") },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <span>
                  <span className="block font-bold text-sm text-slate-800 dark:text-slate-100">
                    {item.label}
                  </span>
                  <span className="block text-xs text-slate-500">{item.desc}</span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-brand-600 rounded"
                  checked={notifications[item.key]}
                  onChange={(e) =>
                    setNotifications((s) => ({ ...s, [item.key]: e.target.checked }))
                  }
                />
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "security" && (
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("settings.title")}
            </CardTitle>
            <CardDescription>{t("profile.changePassword")}</CardDescription>
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
        </Card>
      )}

      <Alert variant="warning" title={t("nav.logout")} className="mt-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs sm:text-sm">{t("settings.deleteAccountDesc")}</span>
          <Button variant="danger" size="sm" leftIcon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
            {t("nav.logout")}
          </Button>
        </div>
      </Alert>
    </div>
  );
}