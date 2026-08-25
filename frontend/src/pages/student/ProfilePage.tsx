import React, { useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import { authService } from "../../services/auth.service";
import { Card, Button, Input, Badge } from "../../components/ui";
import { User as UserIcon, Mail, Phone, Lock, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "+998 90 123 45 67");
  const [isLoading, setIsLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isPassLoading, setIsPassLoading] = useState(false);

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updated = await authService.updateProfile({ name, phone });
      updateUser(updated);
      toast.success("Profil ma'lumotlari muvaffaqiyatli saqlandi!");
    } catch {
      toast.error("Ma'lumotlarni saqlashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Yangi parol kamida 6 ta belgidan iborat bo'lishi shart");
      return;
    }
    setIsPassLoading(true);
    setTimeout(() => {
      setIsPassLoading(false);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Parol muvaffaqiyatli yangilandi!");
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Mening Profilim & Sozlamalar
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Shaxsiy ma'lumotlarni tahrirlash va xavfsizlik sozlamalari
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="p-6 flex flex-col sm:flex-row items-center gap-6">
        <img
          src={
            user?.avatarUrl ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
          }
          alt={user?.name}
          className="h-20 w-20 rounded-full object-cover ring-4 ring-brand-500/20"
        />
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <Badge variant={user?.role === "ADMIN" ? "accent" : "primary"} size="sm">
              {user?.role === "ADMIN" ? "Administrator" : "O'quvchi"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
      </Card>

      {/* Edit Profile Form */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Asosiy Ma'lumotlar
        </h3>
        <form onSubmit={handleUpdateInfo} className="space-y-4">
          <Input
            label="Ism va Familiya"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<UserIcon className="h-4 w-4" />}
            required
          />

          <Input
            label="Email manzil"
            value={user?.email || ""}
            disabled
            leftIcon={<Mail className="h-4 w-4" />}
            helperText="Email manzilni o'zgartirish uchun administratorga murojaat qiling."
          />

          <Input
            label="Telefon raqam"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="h-4 w-4" />}
          />

          <Button type="submit" variant="primary" isLoading={isLoading} leftIcon={<Save className="h-4 w-4" />}>
            O'zgarishlarni Saqlash
          </Button>
        </form>
      </Card>

      {/* Security Form */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Parolni Yangilash
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Joriy parol"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            required
          />

          <Input
            label="Yangi parol"
            type="password"
            placeholder="Kamida 6 belgi"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            required
          />

          <Button type="submit" variant="outline" isLoading={isPassLoading} leftIcon={<ShieldCheck className="h-4 w-4" />}>
            Parolni O'zgartirish
          </Button>
        </form>
      </Card>
    </div>
  );
};
