import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Search } from "lucide-react";
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

type SelectionMode = "delete" | "block" | "unblock";

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
  // The dashboard's student/user cards point at the two plain-account kinds; the role filter carries them too.
  const linkedRole = linked.kind === "student" ? "student" : linked.kind === "user" ? "user" : linked.role ?? "";
  const [roleFilter, setRoleFilter] = useState(linkedRole);
  // The role filter also carries the two plain-account kinds (User = no course, O'quvchi = had a course).
  const isKindRole = roleFilter === "user" || roleFilter === "student";
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  // Role changes and blocking ask for a reason; it goes to the audit log.
  const [roleReason, setRoleReason] = useState("");
  const [detail, setDetail] = useState<AdminUser | null>(null);
  // Bulk workflow: pick an action at the top, then tick the rows it should apply to.
  const [mode, setMode] = useState<SelectionMode | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [bulkBlockOpen, setBulkBlockOpen] = useState(false);
  const [bulkBlockReason, setBulkBlockReason] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  // You cannot block or delete your own account, so it is never selectable.
  const isSelectable = (u: AdminUser) => u.id !== me?.id;
  const selectableIds = items.filter(isSelectable).map((u) => u.id);
  const allOnPageSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      selectableIds.forEach((id) => (allOnPageSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const startMode = (next: SelectionMode) => {
    setMode(next);
    setSelected(new Set());
    setMoreOpen(false);
  };
  const cancelMode = () => {
    setMode(null);
    setSelected(new Set());
  };

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

  const bulkBlock = async () => {
    const ids = [...selected].filter((id) => id !== me?.id);
    if (!ids.length) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(ids.map((id) => adminService.setUserActive(id, false, bulkBlockReason.trim())));
    const failed = results.filter((r) => r.status === "rejected").length;
    const done = results.length - failed;
    setBulkBusy(false);
    setBulkBlockOpen(false);
    setBulkBlockReason("");
    if (done) toast.success(t("admin.users.bulkBlockedToast", { n: done }));
    if (failed) toast.error(t("admin.users.bulkPartialError", { n: failed }));
    cancelMode();
    load();
  };

  const bulkUnblock = async () => {
    const ids = [...selected].filter((id) => id !== me?.id);
    if (!ids.length) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(ids.map((id) => adminService.setUserActive(id, true)));
    const failed = results.filter((r) => r.status === "rejected").length;
    const done = results.length - failed;
    setBulkBusy(false);
    if (done) toast.success(t("admin.users.bulkUnblockedToast", { n: done }));
    if (failed) toast.error(t("admin.users.bulkPartialError", { n: failed }));
    cancelMode();
    load();
  };

  const bulkDelete = async () => {
    const ids = [...selected].filter((id) => id !== me?.id);
    if (!ids.length) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(ids.map((id) => adminService.deleteUser(id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    const done = results.length - failed;
    setBulkBusy(false);
    setBulkDeleteOpen(false);
    if (done) toast.success(t("admin.users.bulkDeletedToast", { n: done }));
    if (failed) toast.error(t("admin.users.bulkPartialError", { n: failed }));
    cancelMode();
    load();
  };

  const requestId = useRef(0);
  const load = () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    adminService
      .listUsers({
        page,
        search: debounced || undefined,
        role: isKindRole ? undefined : roleFilter || undefined,
        kind: isKindRole ? roleFilter : undefined,
      })
      .then((res) => {
        if (id !== requestId.current) return; // a newer request is on its way
        setItems(res.items);
        setMeta(res.pagination);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, roleFilter, isKindRole]);
  useEffect(() => setPage(1), [debounced, roleFilter]);
  // A different page or filter means a different set of rows; leave selection mode as well.
  useEffect(() => {
    setSelected(new Set());
    setMode(null);
  }, [page, debounced, roleFilter]);

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
        {mode && (
          <div className="text-center">
            <p className="text-sm font-medium text-brand-800 dark:text-brand-200">
              {t(mode === "delete" ? "admin.users.modeDelete" : mode === "block" ? "admin.users.modeBlock" : "admin.users.modeUnblock")}
            </p>
            <p className="text-xs text-brand-700 dark:text-brand-300">{t("admin.users.selectedCount", { n: selected.size })}</p>
          </div>
        )}
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
          <Select
            aria-label={t("admin.users.byRole")}
            options={[
              { value: "", label: t("admin.users.allRoles") },
              { value: "user", label: t("admin.users.filterUser") },
              { value: "student", label: t("roles.USER") },
              { value: "TEACHER", label: t("roles.TEACHER") },
              { value: "MANAGER", label: t("roles.MANAGER") },
              { value: "ADMIN", label: t("roles.ADMIN") },
              { value: "SUPERADMIN", label: t("roles.SUPERADMIN") },
            ]}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {mode ? (
            <>
              <Button size="md" variant="outline" disabled={selectableIds.length === 0} onClick={toggleAll}>
                {t("admin.users.selectAll")}
              </Button>
              {mode === "delete" && (
                <Button size="md" variant="danger" disabled={selected.size === 0} onClick={() => setBulkDeleteOpen(true)}>
                  {t("admin.users.deleteSelected")}
                </Button>
              )}
              {mode === "block" && (
                <Button
                  size="md"
                  variant="danger"
                  disabled={selected.size === 0}
                  onClick={() => {
                    setBulkBlockReason("");
                    setBulkBlockOpen(true);
                  }}
                >
                  {t("admin.users.blockSelected")}
                </Button>
              )}
              {mode === "unblock" && (
                <Button size="md" variant="success" loading={bulkBusy} disabled={selected.size === 0} onClick={() => void bulkUnblock()}>
                  {t("admin.users.unblockSelected")}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button size="md" variant="outline" disabled={loading || items.length === 0} onClick={() => startMode("delete")}>
                {t("admin.users.delete")}
              </Button>
              <Button size="md" variant="outline" disabled={loading || items.length === 0} onClick={() => startMode("block")}>
                {t("admin.users.block")}
              </Button>
            </>
          )}
          <div className="relative" ref={moreRef}>
            <Button
              size="md"
              variant="ghost"
              rightIcon={<MoreHorizontal className="h-4 w-4" />}
              onClick={() => setMoreOpen((v) => !v)}
            >
              {t("admin.users.more")}
            </Button>
            {moreOpen && (
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  disabled={!mode}
                  onClick={() => {
                    cancelMode();
                    setMoreOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t("admin.users.clearSelection")}
                </button>
                <button
                  type="button"
                  disabled={loading || items.length === 0}
                  onClick={() => {
                    startMode("unblock");
                    setMoreOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t("admin.users.unblock")}
                </button>
              </div>
            )}
          </div>
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
                  {mode && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={t("admin.users.selectAll")}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
                        checked={allOnPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = selected.size > 0 && !allOnPageSelected;
                        }}
                        onChange={toggleAll}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3">{t("admin.users.id")}</th>
                  <th className="px-4 py-3">{t("admin.users.name")}</th>
                  <th className="px-4 py-3">{t("admin.users.role")}</th>
                  <th className="px-4 py-3">{t("admin.users.registered")}</th>
                  <th className="px-4 py-3 text-right">{t("admin.common.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {mode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={t("admin.users.selectRow", { name: u.name })}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800"
                          checked={selected.has(u.id)}
                          disabled={!isSelectable(u)}
                          onChange={() => toggleOne(u.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs">
                      {/* The prefix tells: teacher#### teaches, student#### had a course, user#### only signed up. */}
                      <Badge variant={u.staffNumber ? "warning" : u.role === "TEACHER" && u.teacherNumber ? "primary" : u.studentNumber ? "success" : "neutral"}>{formatAccountId(u)}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {u.name}
                      {u.phone && <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{u.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={u.role === "USER" ? "neutral" : u.role === "ADMIN" || u.role === "SUPERADMIN" ? "warning" : "primary"}>{t(`roles.${u.role}`)}</Badge>
                        {u.totpEnabledAt && <Badge variant="success">{t("admin.users.twoFactor")}</Badge>}
                      </div>
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

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title={t("admin.users.bulkDeleteTitle")}
        message={t("admin.users.bulkDeleteConfirm", { n: selected.size })}
        confirmText={t("admin.users.deleteSelected")}
        onConfirm={() => void bulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <Modal isOpen={bulkBlockOpen} onClose={() => setBulkBlockOpen(false)} title={t("admin.users.bulkBlockTitle", { n: selected.size })} maxWidth="md">
        <div className="space-y-4">
          <Textarea label={t("admin.users.reasonLabel")} rows={2} value={bulkBlockReason} onChange={(e) => setBulkBlockReason(e.target.value)} placeholder={t("admin.users.blockReasonPlaceholder")} />
          <p className="text-xs text-slate-500">{t("admin.users.bulkBlockHint")}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBulkBlockOpen(false)}>{t("admin.common.cancel")}</Button>
            <Button variant="danger" loading={bulkBusy} disabled={bulkBlockReason.trim().length < 3} onClick={() => void bulkBlock()}>
              {t("admin.users.blockSelected")}
            </Button>
          </div>
        </div>
      </Modal>

      {detail && <UserDetailModal user={detail} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
}
