import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { useLoad } from "@/hooks/useLoad";
import { useAuthStore } from "@/store/auth.store";
import { can } from "@/lib/permissions";
import type { AdminUser, UserIdentifierRow } from "@/types/admin";
import { formatAccountId, formatStudentId, formatTeacherId, formatUserId } from "@/utils/studentId";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";

const FORMAT: Record<UserIdentifierRow["kind"], (n: number) => string> = {
  USER: formatUserId,
  STUDENT: formatStudentId,
  TEACHER: formatTeacherId,
};
const day = (iso: string) => new Date(iso).toLocaleDateString();

/**
 * One account for the admin: every public number it has held (when given, when freed and why), its
 * courses, and — with enrollments:grant — opening a course without payment, with a reason.
 */
export function UserDetailModal({ user, onClose, onChanged }: { user: AdminUser; onClose: () => void; onChanged: () => void }) {
  const { t } = useTranslation();
  const mayGrant = can(useAuthStore((s) => s.user?.role), "enrollments:grant");
  const ids = useLoad(() => adminService.userIdentifiers(user.id), [user.id]);
  const enrollments = useLoad(() => adminService.userEnrollments(user.id), [user.id]);
  const courses = useLoad(() => (mayGrant ? adminService.listCourses() : Promise.resolve([])), [mayGrant]);

  const [courseId, setCourseId] = useState("");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const grant = async () => {
    setSaving(true);
    try {
      await adminService.grantEnrollment(user.id, { courseId, days: days ? Number(days) : null, reason: reason.trim() });
      toast.success(t("admin.users.detail.granted"));
      setCourseId("");
      setDays("");
      setReason("");
      enrollments.reload();
      ids.reload();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.users.detail.grantError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`${user.name} · ${formatAccountId(user)}`} maxWidth="2xl">
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-200">{t("admin.users.detail.numbers")}</h3>
          <p className="mb-3 text-xs text-slate-500">{t("admin.users.detail.numbersHint")}</p>
          {ids.loading && !ids.data ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1.5">{t("admin.users.detail.number")}</th>
                  <th className="py-1.5">{t("admin.users.detail.given")}</th>
                  <th className="py-1.5">{t("admin.users.detail.freed")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(ids.data ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-mono text-xs">
                      <Badge variant={r.releasedAt ? "neutral" : r.kind === "TEACHER" ? "primary" : r.kind === "STUDENT" ? "success" : "neutral"}>{FORMAT[r.kind](r.number)}</Badge>
                    </td>
                    <td className="py-2 text-slate-300">{day(r.assignedAt)}</td>
                    <td className="py-2 text-slate-400">
                      {r.releasedAt ? `${day(r.releasedAt)} · ${t(`admin.users.detail.reason.${r.releaseReason ?? "ROLE_CHANGE"}`, r.releaseReason ?? "")}` : t("admin.users.detail.active")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-200">{t("admin.users.detail.courses")}</h3>
          {enrollments.loading && !enrollments.data ? (
            <Skeleton className="h-16 w-full" />
          ) : (enrollments.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">{t("admin.users.detail.noCourses")}</p>
          ) : (
            <ul className="space-y-1.5">
              {(enrollments.data ?? []).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-200">{e.course.title}</span>
                  <Badge variant={e.status === "ACTIVE" ? "success" : "neutral"}>{e.status}</Badge>
                  <Badge variant={e.orderId ? "primary" : "warning"}>{e.orderId ? t("admin.users.detail.paid") : t("admin.users.detail.grantedBadge")}</Badge>
                  <span className="text-xs text-slate-500">
                    {day(e.startsAt)} → {e.expiresAt ? day(e.expiresAt) : t("admin.users.detail.noEnd")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {mayGrant && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h3 className="text-sm font-semibold text-amber-300">{t("admin.users.detail.grantTitle")}</h3>
            <p className="mb-3 text-xs text-slate-400">{t("admin.users.detail.grantHint")}</p>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <Select
                label={t("admin.users.detail.course")}
                options={[{ value: "", label: t("admin.users.detail.chooseCourse") }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]}
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              />
              <Input
                label={t("admin.users.detail.days")}
                type="number"
                min={1}
                max={3650}
                placeholder={t("admin.users.detail.daysPlaceholder")}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <Textarea label={t("admin.users.reasonLabel")} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("admin.users.detail.grantReasonPlaceholder")} />
            </div>
            <div className="mt-3 flex justify-end">
              <Button loading={saving} disabled={!courseId || reason.trim().length < 3} onClick={grant}>
                {t("admin.users.detail.grant")}
              </Button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
