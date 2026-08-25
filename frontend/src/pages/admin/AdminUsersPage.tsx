import React, { useEffect, useState } from "react";
import { adminService } from "../../services/admin.service";
import { User } from "../../types/user";
import { Card, Badge, Spinner, Input } from "../../components/ui";
import { Search, Shield, User as UserIcon } from "lucide-react";
import { formatDate } from "../../utils/formatDate";

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
      setIsLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Foydalanuvchilar</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Ro'yxatdan o'tgan barcha talabalar va ma'murlar ro'yxati
          </p>
        </div>

        <Input
          placeholder="Ism yoki email bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <Card className="bg-slate-950 border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/60 uppercase text-[11px] font-semibold text-slate-400">
              <tr>
                <th className="p-4">Foydalanuvchi</th>
                <th className="p-4">Email</th>
                <th className="p-4">Telefon</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Ro'yxatdan o'tgan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-4 flex items-center gap-3 font-bold text-white">
                    <img
                      src={
                        u.avatarUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={u.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span>{u.name}</span>
                  </td>
                  <td className="p-4 text-slate-400">{u.email}</td>
                  <td className="p-4 text-slate-400">{u.phone || "—"}</td>
                  <td className="p-4">
                    <Badge variant={u.role === "ADMIN" ? "accent" : "primary"} size="sm">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="p-4 text-slate-400">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
