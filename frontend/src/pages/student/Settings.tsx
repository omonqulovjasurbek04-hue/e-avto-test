import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sun,
  Moon,
  Languages,
  Bell,
  Shield,
  LogOut,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/store/ui.store";
import { ROUTES } from "@/constants/routes";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/utils/cn";

const passwordSchema = z
  .object({
    current: z.string().min(6, "Kamida 6 belgi"),
    next: z.string().min(6, "Kamida 6 belgi"),
    confirm: z.string().min(6, "Kamida 6 belgi"),
  })
  .refine((v) => v.next === v.confirm, {
    message: "Parollar mos kelmaydi",
    path: ["confirm"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

type TabId = "appearance" | "language" | "notifications" | "security";

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, setTheme } = useUIStore();
  const [tab, setTab] = useState<TabId>("appearance");
  const [notifications, setNotifications] = useState({
    results: true,
    reminders: false,
    promotions: false,
  });

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
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Parol muvaffaqiyatli o'zgartirildi (mock)");
    reset();
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  const tabs = [
    { id: "appearance", label: "Ko'rinish" },
    { id: "language", label: "Til" },
    { id: "notifications", label: "Bildirishnomalar" },
    { id: "security", label: "Xavfsizlik" },
  ];

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sozlamalar</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ilova ko'rinishi va hisob sozlamalari.
        </p>
      </header>

      <Tabs tabs={tabs} activeTab={tab} onChange={(id) => setTab(id as TabId)} className="mb-6" />

      {tab === "appearance" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-brand-600" /> Ko'rinish (Mavzu)
            </CardTitle>
            <CardDescription>Yorug' yoki tungi rejimni tanlang.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid max-w-md grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 transition",
                  theme === "light"
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                    : "border-slate-300 dark:border-slate-700"
                )}
              >
                <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                  <Sun className="h-5 w-5" /> Kunduzgi
                </span>
                {theme === "light" && <Check className="h-5 w-5 text-brand-600" />}
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 transition",
                  theme === "dark"
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                    : "border-slate-300 dark:border-slate-700"
                )}
              >
                <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                  <Moon className="h-5 w-5" /> Tungi
                </span>
                {theme === "dark" && <Check className="h-5 w-5 text-brand-600" />}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "language" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-brand-600" /> Til
            </CardTitle>
            <CardDescription>Interfeys tili (tez orada mavjud bo'ladi).</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              label="Tilni tanlang"
              disabled
              value="uz"
              options={[
                { value: "uz", label: "O'zbekcha" },
                { value: "ru", label: "Русский" },
                { value: "en", label: "English" },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {tab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-600" /> Bildirishnomalar
            </CardTitle>
            <CardDescription>Qaysi xabarnomalarni olishni belgilang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { key: "results", label: "Test natijalari", desc: "Har bir imtihondan keyin xabar olish" },
                { key: "reminders", label: "Eslatmalar", desc: "O'qish vaqti kelganida eslatma" },
                { key: "promotions", label: "Aksiyalar", desc: "Yangiliklar va chegirmalar" },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <span>
                  <span className="block font-medium text-slate-800 dark:text-slate-100">
                    {item.label}
                  </span>
                  <span className="block text-xs text-slate-500">{item.desc}</span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-brand-600"
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-600" /> Xavfsizlik
            </CardTitle>
            <CardDescription>Parolingizni o'zgartiring (mock).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onPassword)} className="max-w-md space-y-4">
              <Input
                label="Joriy parol"
                type="password"
                error={errors.current?.message}
                {...register("current")}
              />
              <Input
                label="Yangi parol"
                type="password"
                error={errors.next?.message}
                {...register("next")}
              />
              <Input
                label="Yangi parolni tasdiqlang"
                type="password"
                error={errors.confirm?.message}
                {...register("confirm")}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={isSubmitting}>
                  Parolni o'zgartirish
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Alert variant="warning" title="Hisobdan chiqish" className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <span>Seansni tugatish uchun quyidagi tugmani bosing.</span>
          <Button variant="danger" leftIcon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
            Chiqish
          </Button>
        </div>
      </Alert>
    </div>
  );
}
