import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Save, User as UserIcon, UserPen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/user.service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProfilePhoto } from "./ProfilePhoto";

const makeSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(2, t("account.nameShort")),
    phone: z
      .string()
      .optional()
      .refine((v) => !v || v.length >= 7, t("account.phoneInvalid")),
  });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

/** Name and phone of the account (Settings -> Security, above the password). */
export function AccountDetailsForm() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(t)),
    values: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await userService.updateProfile({ name: values.name, phone: values.phone });
      updateUser({ name: values.name, phone: values.phone });
      toast.success(t("account.saved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <UserPen className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {t("profile.editProfile")}
      </h3>
      {/* Photo first on phones; on wider screens the form on the left, the photo on the right. */}
      <div className="mt-4 flex flex-col-reverse gap-8 md:flex-row md:items-start">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md flex-1 space-y-4">
        <Input label={t("profile.name")} leftIcon={<UserIcon className="h-4 w-4" />} error={errors.name?.message} {...register("name")} />
        <Input label={t("account.phone")} leftIcon={<Phone className="h-4 w-4" />} error={errors.phone?.message} {...register("phone")} />
        <div className="flex justify-end">
          <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
            {t("common.save")}
          </Button>
        </div>
      </form>
      <div className="md:flex-1">
        <ProfilePhoto />
      </div>
      </div>
    </section>
  );
}
