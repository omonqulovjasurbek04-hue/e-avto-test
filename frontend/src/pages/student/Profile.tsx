import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User as UserIcon, Mail, Phone, Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/user.service";
import { resultService } from "@/services/result.service";
import type { TestResultSummary } from "@/types/result";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

const schema = z.object({
  name: z.string().min(2, "Ism juda qisqa"),
  // Read-only here: Telegram accounts may have none, and changing it is not supported on this page.
  email: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 7, "Noto'g'ri telefon raqam"),
});

type FormValues = z.infer<typeof schema>;

export default function Profile() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    },
  });

  const load = () => {
    setLoading(true);
    setError(false);
    resultService
      .list()
      .then((data) => setResults(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const tests = results.length;
    const best = results.length
      ? Math.max(...results.map((r) => r.score))
      : 0;
    const passed = results.filter((r) => r.passed).length;
    return { tests, best: Math.round(best), passed };
  }, [results]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await userService.updateProfile({
        name: values.name,
        phone: values.phone,
      });
      updateUser({ name: values.name, phone: values.phone });
      toast.success("Profil muvaffaqiyatli yangilandi");
    } catch {
      toast.error("Profilni yangilashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container-page py-8">
        <ErrorState
          title={t("common.error")}
          message={t("auth.login.title")}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
          <UserIcon className="h-6 w-6 text-brand-600" />
          {t("profile.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("profile.description")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar name={user.name} color="bg-brand-600" size="lg" />
            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              {user.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              {t(`roles.${user.role}`, user.role)}
            </span>

            <div className="mt-6 grid w-full grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {loading ? "—" : stats.tests}
                </p>
                <p className="text-xs text-slate-500">{t("nav.tests")}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {loading ? "—" : `${stats.best}%`}
                </p>
                <p className="text-xs text-slate-500">{t("leaderboard.avgScore")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("profile.editProfile")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label={t("profile.name")}
                  leftIcon={<UserIcon className="h-4 w-4" />}
                  error={errors.name?.message}
                  {...register("name")}
                />
                <Input
                  label={t("profile.email")}
                  type="email"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  readOnly
                  disabled
                  {...register("email")}
                />
                <Input
                  label="Telefon"
                  leftIcon={<Phone className="h-4 w-4" />}
                  error={errors.phone?.message}
                  {...register("phone")}
                />
                <div className="flex justify-end">
                  <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorState onRetry={load} />
        </div>
      )}

      {saving && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading")}
        </div>
      )}
    </div>
  );
}
