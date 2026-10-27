import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Moon,
  Shield,
  Check,
  UserRound,
  Lock,
  Palette,
  Bell,
} from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/cn";
import NotificationPreferences from "@/components/settings/NotificationPreferences";
import SecuritySettings from "@/components/settings/SecuritySettings";
import { ConnectedDevices } from "@/components/settings/ConnectedDevices";
import { LinkedAccounts } from "@/components/settings/LinkedAccounts";
import { AccountDetailsForm } from "@/components/settings/AccountDetailsForm";

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useUIStore();
  const [params, setParams] = useSearchParams();
  type Tab = "personal" | "security" | "appearance" | "notifications";
  // Personal details open by default; ?tab=<id> opens another section.
  const [tab, setTab] = useState<Tab>((["security", "appearance", "notifications"] as Tab[]).find((id) => id === params.get("tab")) ?? "personal");

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

  // The open section is kept in the address (?tab=…): a reload or a shared link opens the same one.
  const openSection = (id: Tab) => {
    setTab(id);
    const next = new URLSearchParams(params);
    if (id === "personal") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };

  const sections: { id: Tab; label: string; icon: typeof UserRound }[] = [
    { id: "personal", label: t("settings.personal"), icon: UserRound },
    { id: "security", label: t("settings.securityPassword"), icon: Lock },
    { id: "appearance", label: t("settings.appearance"), icon: Palette },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
  ];

  return (
    <div className="container-page py-8 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("settings.subtitle")}
        </p>
      </header>

      {/* Sections as one bar above the content; on a phone a 2 x 2 grid, so every section is in view. */}
      <nav
        aria-label={t("settings.title")}
        className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:flex dark:border-slate-800 dark:bg-slate-900"
      >
        {sections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            aria-current={tab === sec.id ? "page" : undefined}
            onClick={() => openSection(sec.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition",
              tab === sec.id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            <sec.icon className="h-4 w-4 shrink-0" aria-hidden /> {sec.label}
          </button>
        ))}
      </nav>

      <div className="space-y-6">

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

      {tab === "notifications" && <NotificationPreferences />}

      {tab === "personal" && (
        // Name and phone on the left, linked sign-in methods on the right, a line between them.
        <Card className="grid overflow-hidden rounded-3xl border border-slate-200 xl:grid-cols-2 xl:divide-x xl:divide-slate-200 dark:border-slate-800 xl:dark:divide-slate-800">
          <div className="p-6">
            <AccountDetailsForm />
          </div>
          <div className="border-t border-slate-200 p-6 xl:border-t-0 dark:border-slate-800">
            <LinkedAccounts />
          </div>
        </Card>
      )}

      {tab === "security" && (
        <div className="space-y-6">
          <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
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
          </Card>
          <SecuritySettings />
          <Card className="rounded-3xl border border-slate-200 p-6 dark:border-slate-800">
            <ConnectedDevices />
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}