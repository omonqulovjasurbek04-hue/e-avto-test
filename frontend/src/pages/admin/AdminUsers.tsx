import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { useAuthStore } from "@/store/auth.store";
import { useDebounce } from "@/hooks/useDebounce";
import type { AdminUser, PageMeta } from "@/types/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { canAssignRole, ROLE_LABEL } from "@/lib/permissions";
import type { UserRole } from "@/types/user";

export default function AdminUsers() {
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
  const [roleFilter, setRoleFilter] = useState("");

  const toggleActive = async (u: AdminUser) => {
    try {
      await adminService.setUserActive(u.id, !u.isActive);
      toast.success(u.isActive ? "Foydalanuvchi bloklandi" : "Foydalanuvchi faollashtirildi");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Holatni o'zgartirib bo'lmadi");
    }
  };

  const load = () => {
    setLoading(true);
    setError(null);
    adminService
      .listUsers({ page, search: debounced || undefined, role: roleFilter || undefined })
      .then((res) => {
        setItems(res.items);
        setMeta(res.pagination);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, roleFilter]);
  useEffect(() => setPage(1), [debounced, roleFilter]);

  const openRole = (u: AdminUser) => {
    setNextRole(u.role);
    setChanging(u);
  };

  const confirmRoleChange = async () => {
    if (!changing || nextRole === changing.role) return;
    setRoleBusy(true);
    try {
      await adminService.setUserRole(changing.id, nextRole);
      toast.success("Rol yangilandi; foydalanuvchi qayta kiradi");
      setChanging(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rolni o'zgartirib bo'lmadi");
    } finally {
      setRoleBusy(false);
    }
  };

  const ALL_ROLES = Object.keys(ROLE_LABEL) as UserRole[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Foydalanuvchilar</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-sm">
          <Input
            placeholder="Ism yoki email bo'yicha qidirish"
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Qidirish"
          />
        </div>
        <div className="w-48">
          <Select aria-label="Rol bo'yicha" options={[{ value: "", label: "Barcha rollar" }, ...ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))]} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title="Foydalanuvchilar topilmadi" />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Ism</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3">Ro'yxatdan o'tgan</th>
                  <th className="px-4 py-3 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                    <td className="px-4 py-3">{u.email ?? "Telegram"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === "USER" ? "neutral" : u.role === "ADMIN" || u.role === "SUPERADMIN" ? "warning" : "primary"}>{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? "Faol" : "Bloklangan"}</Badge>
                    </td>
                    <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={u.id === me?.id || !ALL_ROLES.some((r) => r !== u.role && canAssignRole(me?.role, u.role, r))} onClick={() => openRole(u)}>
                          Rolni o'zgartirish
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isActive ? "danger" : "success"}
                          disabled={u.id === me?.id}
                          onClick={() => void toggleActive(u)}
                        >
                          {u.isActive ? "Bloklash" : "Faollashtirish"}
                        </Button>
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

      <Modal isOpen={changing !== null} onClose={() => setChanging(null)} title={`Rol: ${changing?.name ?? ""}`} maxWidth="md">
        {changing && (
          <div className="space-y-4">
            <Select
              label="Yangi rol"
              options={ALL_ROLES.filter((r) => r === changing.role || canAssignRole(me?.role, changing.role, r)).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
              value={nextRole}
              onChange={(e) => setNextRole(e.target.value as UserRole)}
            />
            <p className="text-xs text-slate-500">Rol o'zgargach foydalanuvchining joriy sessiyalari yopiladi. Administrator rollarini faqat superadmin bera oladi. Amal audit jurnaliga yoziladi.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setChanging(null)}>Bekor qilish</Button>
              <Button loading={roleBusy} disabled={nextRole === changing.role} onClick={confirmRoleChange}>Saqlash</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
