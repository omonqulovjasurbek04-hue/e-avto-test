import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import type { UserRole } from "@/types/user";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

const ROLES: UserRole[] = ["USER", "TEACHER", "MODERATOR", "FINANCE", "MANAGER", "ADMIN", "SUPERADMIN"];
const tone = (r: UserRole) => (r === "USER" ? "neutral" : r === "ADMIN" || r === "SUPERADMIN" ? "warning" : "primary");

/**
 * "About roles" on the users page: what each role is for and what it can open, so whoever hands out a
 * role knows what they give. The server checks every right on its own; this is only the explanation.
 */
export function RolesInfo() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" leftIcon={<Info className="h-4 w-4" />} onClick={() => setOpen(true)}>
        {t("rolesInfo.button")}
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("rolesInfo.title")} maxWidth="2xl">
        <p className="mb-4 text-sm text-slate-500">{t("rolesInfo.intro")}</p>
        <ul className="space-y-3">
          {ROLES.map((r) => (
            <li key={r} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={tone(r)}>{t(`roles.${r}`)}</Badge>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t(`rolesInfo.${r}.who`)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t(`rolesInfo.${r}.can`)}</p>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-semibold">{t("rolesInfo.menu")}:</span> {t(`rolesInfo.${r}.menu`)}
              </p>
            </li>
          ))}
        </ul>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>{t("rolesInfo.rule1")}</li>
          <li>{t("rolesInfo.rule2")}</li>
          <li>{t("rolesInfo.rule3")}</li>
          <li>{t("rolesInfo.rule4")}</li>
        </ul>
      </Modal>
    </>
  );
}
