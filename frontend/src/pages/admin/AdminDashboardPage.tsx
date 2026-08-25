import React, { useEffect, useState } from "react";
import { adminService, AdminStats } from "../../services/admin.service";
import { Card, Badge, Spinner, Button } from "../../components/ui";
import { Users, BookOpen, HelpCircle, CheckSquare, TrendingUp, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const data = await adminService.getStats();
      setStats(data);
      setIsLoading(false);
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Admin Boshqaruv Markazi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Platforma umumiy statistikasi, kontent va foydalanuvchilar holati
          </p>
        </div>

        <div className="flex gap-3">
          <Link to="/admin/questions">
            <Button size="sm" variant="accent" leftIcon={<HelpCircle className="h-4 w-4" />}>
              Savol Qo'shish
            </Button>
          </Link>
          <Link to="/admin/courses">
            <Button size="sm" variant="primary" leftIcon={<BookOpen className="h-4 w-4" />}>
              Kurs Qo'shish
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Jami Foydalanuvchilar</span>
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="text-3xl font-black text-white">{stats?.totalUsers}</h3>
          <span className="text-xs text-emerald-400 font-semibold">+12% oxirgi oyda</span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Faol Kurslar</span>
            <BookOpen className="h-5 w-5 text-amber-400" />
          </div>
          <h3 className="text-3xl font-black text-white">{stats?.totalCourses}</h3>
          <span className="text-xs text-slate-400">A, B, C, YHQ toifalari</span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Savollar Banki</span>
            <HelpCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-black text-white">{stats?.totalQuestions}</h3>
          <span className="text-xs text-emerald-400 font-semibold">100% rasmiy baza</span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">O'rtacha Muvaffaqiyat</span>
            <TrendingUp className="h-5 w-5 text-purple-400" />
          </div>
          <h3 className="text-3xl font-black text-white">{stats?.averagePassRate}%</h3>
          <span className="text-xs text-slate-400">90% o'tish chegarasi</span>
        </div>
      </div>

      {/* Quick Action shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <h3 className="font-bold text-white">Savollar Banki</h3>
          <p className="text-xs text-slate-400">
            Yangi rasmli va matnli savollar qo'shish, variantlarni tahrirlash va YHQ moddalarini biriktirish.
          </p>
          <Link to="/admin/questions" className="block pt-2">
            <Button size="sm" variant="outline" className="w-full text-slate-200 border-slate-700">
              Savollarni boshqarish
            </Button>
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <h3 className="font-bold text-white">Kurslar va Modullar</h3>
          <p className="text-xs text-slate-400">
            Yangi toifalar va video darsliklarni boshqarish, o'quv rejasini tartibga solish.
          </p>
          <Link to="/admin/courses" className="block pt-2">
            <Button size="sm" variant="outline" className="w-full text-slate-200 border-slate-700">
              Kurslarni boshqarish
            </Button>
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <h3 className="font-bold text-white">Foydalanuvchilar</h3>
          <p className="text-xs text-slate-400">
            Ro'yxatdan o'tgan o'quvchilar ro'yxati, rollari va o'quv faolligi monitoringi.
          </p>
          <Link to="/admin/users" className="block pt-2">
            <Button size="sm" variant="outline" className="w-full text-slate-200 border-slate-700">
              Foydalanuvchilarni ko'rish
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
