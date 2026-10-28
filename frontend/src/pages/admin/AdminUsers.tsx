import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { useAuthStore } from "@/store/auth.store";
import { useDebounce } from "@/hooks/useDebounce";
import type { AdminUser, PageMeta } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { canAssignRole, ROLE_LABEL } from "@/lib/permissions";
import { formatAccountId, formatUserId } from "@/utils/studentId";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import { RolesInfo } from "@/components/admin/RolesInfo";
import type { UserRole } from "@/types/user";

export default function AdminUsers() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState<AdminUser | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>("USER");
  const [roleBusy, setRoleBusy] = useState(false);
  // The dashboard's per-role counts open this page already filtered to that role.
  const linked = (useLocation().state as { role?: string; kind?: "student" | "user" } | null) ?? {};
  const linkedRole = linked.role ?? "";
  const [roleFilter, setRoleFilter] = useState(linkedRole);
  // "student" = had a course, "user" = only signed up, "teacher" = teaches now.
  const [kindFilter, setKindFilter] = useState<"" | "student" | "user" | "teacher" | "staff">(linked.kind ?? "");
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  // Role changes and blocking ask for a reason; it goes to the audit log.
  const [roleReason, setRoleReason] = useState("");
  const [blocking, setBlocking] = useState<AdminUser | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [detail, setDetail] = useState<AdminUser | null>(null);

  const resetTwoFactor = async () => {
    const u = resetting;
    setResetting(null);
    if (!u) return;
    try {
      await adminService.resetUserTwoFactor(u.id);
      toast.success(t("admin.users.reset2faDone"));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.users.reset2faError"));
    }
  };

  const toggleActive = async (u: AdminUser, reason?: string) => {
    setBlocking(null);
    try {
      await adminService.setUserActive(u.id, !u.isActive, reason);
      toast.success(u.isActive ? t("admin.users.blockedToast") : t("admin.users.activatedToast"));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.users.statusError"));
    }
  };

  const requestId = useRef(0);
  const load = () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    adminService
      .listUsers({ page, search: debounced || undefined, role: roleFilter || undefined, kind: kindFilter || undefined })
      .then((res) => {
        if (id !== requestId.current) return; // a newer request is on its way
        setItems(res.items);
        setMeta(res.pagination);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, roleFilter, kindFilter]);
  useEffect(() => setPage(1), [debounced, roleFilter, kindFilter]);

  const openRole = (u: AdminUser) => {
    setNextRole(u.role);
    setRoleReason("");
    setChanging(u);
  };

  const confirmRoleChange = async () => {
    if (!changing || nextRole === changing.role) return;
    setRoleBusy(true);
    try {
      await adminService.setUserRole(changing.id, nextRole, roleReason.trim());
      toast.success(t("admin.users.roleUpdated"));
      setChanging(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.users.roleError"));
    } finally {
      setRoleBusy(false);
    }
  };

  const ALL_ROLES = Object.keys(ROLE_LABEL) as UserRole[];

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("admin.users.title")}</h1>
        <RolesInfo />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-sm">
          <Input
            placeholder={t("admin.users.searchPlaceholder")}
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t("admin.common.search")}
          />
        </div>
        <div className="flex flex-wrap gap-3 [&>*]:w-48">
          <Select aria-label={t("admin.users.byRole")} options={[{ value: "", label: t("admin.users.allRoles") }, ...ALL_ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))]} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} />
          <Select
            aria-label={t("admin.users.byKind")}
            options={[
              { value: "", label: t("admin.users.allKinds") },
              { value: "student", label: t("admin.users.kindStudent") },
              { value: "user", label: t("admin.users.kindUser") },
              { value: "teacher", label: t("admin.users.kindTeacher") },
              { value: "staff", label: t("admin.users.kindStaff") },
            ]}
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as "" | "student" | "user" | "teacher" | "staff")}
          />
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title={t("admin.users.empty")} />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t("admin.users.id")}</th>
                  <th className="px-4 py-3">{t("admin.users.name")}</th>
                  <th className="px-4 py-3">{t("admin.users.email")}</th>
                  <th className="px-4 py-3">{t("admin.users.role")}</th>
                  <th className="px-4 py-3">{t("admin.common.status")}</th>
                  <th className="px-4 py-3">{t("admin.users.registered")}</th>
                  <th className="px-4 py-3 text-right">{t("admin.common.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs">
                      {/* The prefix tells: teacher#### teaches, student#### had a course, user#### only signed up. */}
                      <Badge variant={u.staffNumber ? "warning" : u.role === "TEACHER" && u.teacherNumber ? "primary" : u.studentNumber ? "success" : "neutral"}>{formatAccountId(u)}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {u.name}
                      {u.phone && <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{u.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {u.email ?? "Telegram"}
                      {u.email && !u.emailVerifiedAt && <div className="text-xs text-amber-600 dark:text-amber-400">{t("admin.users.emailUnverified")}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={u.role === "USER" ? "neutral" : u.role === "ADMIN" || u.role === "SUPERADMIN" ? "warning" : "primary"}>{t(`roles.${u.role}`)}</Badge>
                        {u.totpEnabledAt && <Badge variant="success">{t("admin.users.twoFactor")}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? t("admin.common.active") : t("admin.users.blocked")}</Badge>
                    </td>
                    <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(u)}>
                          {t("admin.users.details")}
                        </Button>
                        <Button size="sm" variant="outline" disabled={u.id === me?.id || !ALL_ROLES.some((r) => r !== u.role && canAssignRole(me?.role, u.role, r))} onClick={() => openRole(u)}>
                          {t("admin.users.changeRole")}
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isActive ? "danger" : "success"}
                          disabled={u.id === me?.id}
                          onClick={() => {
                            // Blocking asks why; activating again is immediate.
                            if (u.isActive) {
                              setBlockReason("");
                              setBlocking(u);
                            } else void toggleActive(u);
                          }}
                        >
                          {u.isActive ? t("admin.users.block") : t("admin.users.activate")}
                        </Button>
                        {me?.role === "SUPERADMIN" && u.totpEnabledAt && u.id !== me.id && (
                          <Button size="sm" variant="outline" onClick={() => setResetting(u)}>
                            {t("admin.users.reset2fa")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />}
        </div>
      )}

      <ConfirmDialog
        isOpen={resetting !== null}
        title={t("admin.users.reset2faTitle", { name: resetting?.name ?? "" })}
        message={t("admin.users.reset2faConfirm")}
        confirmText={t("admin.users.reset2fa")}
        onConfirm={() => void resetTwoFactor()}
        onCancel={() => setResetting(null)}
      />

      <Modal isOpen={changing !== null} onClose={() => setChanging(null)} title={t("admin.users.roleTitle", { name: changing?.name ?? "" })} maxWidth="md">
        {changing && (
          <div className="space-y-4">
            <Select
              label={t("admin.users.newRole")}
              options={ALL_ROLES.filter((r) => r === changing.role || canAssignRole(me?.role, changing.role, r)).map((r) => ({ value: r, label: t(`roles.${r}`) }))}
              value={nextRole}
              onChange={(e) => setNextRole(e.target.value as UserRole)}
            />
            {/* What happens to the numbers: a teacher gets teacher#### and the user number is freed. */}
            {nextRole === "TEACHER" && changing.role !== "TEACHER" && (
              <p className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-800 dark:text-brand-200">{t("admin.users.toTeacherHint", { id: formatUserId(changing.userNumber) })}</p>
            )}
            {!["USER", "TEACHER"].includes(nextRole) && nextRole !== changing.role && (
              <p className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-800 dark:text-brand-200">
                {t("admin.users.toStaffHint", { id: `${nextRole.toLowerCase()}01…` })}
              </p>
            )}
            {changing.role === "TEACHER" && nextRole !== "TEACHER" && (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">{t("admin.users.fromTeacherHint")}</p>
            )}
            <Textarea label={t("admin.users.reasonLabel")} rows={2} value={roleReason} onChange={(e) => setRoleReason(e.target.value)} placeholder={t("admin.users.reasonPlaceholder")} />
            <p className="text-xs text-slate-500">{t("admin.users.roleHint")}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setChanging(null)}>{t("admin.common.cancel")}</Button>
              <Button loading={roleBusy} disabled={nextRole === changing.role || roleReason.trim().length < 3} onClick={confirmRoleChange}>{t("admin.common.save")}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={blocking !== null} onClose={() => setBlocking(null)} title={t("admin.users.blockTitle", { name: blocking?.name ?? "" })} maxWidth="md">
        {blocking && (
          <div className="space-y-4">
            <Textarea label={t("admin.users.reasonLabel")} rows={2} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder={t("admin.users.blockReasonPlaceholder")} />
            <p className="text-xs text-slate-500">{t("admin.users.blockHint")}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBlocking(null)}>{t("admin.common.cancel")}</Button>
              <Button variant="danger" disabled={blockReason.trim().length < 3} onClick={() => void toggleActive(blocking, blockReason.trim())}>
                {t("admin.users.block")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {detail && <UserDetailModal user={detail} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
}
