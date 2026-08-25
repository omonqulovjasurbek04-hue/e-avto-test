import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { useUIStore } from "../store/ui.store";
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Users,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../utils/cn";

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/admin", label: "Dashboard (Statistika)", icon: <LayoutDashboard className="h-5 w-5" />, end: true },
    { to: "/admin/courses", label: "Kurslar & Modullar", icon: <BookOpen className="h-5 w-5" /> },
    { to: "/admin/questions", label: "Savollar Banki", icon: <HelpCircle className="h-5 w-5" /> },
    { to: "/admin/users", label: "Foydalanuvchilar", icon: <Users className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-black tracking-tight text-white block leading-none">
                E-AVTO ADMIN
              </span>
              <span className="text-[10px] text-amber-400 font-semibold tracking-wider">
                BOSHQARUV PANELI
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Back to student app button */}
        <div className="p-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-xl bg-slate-850 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition border border-slate-800"
          >
            <ArrowLeft className="h-4 w-4 text-slate-400" />
            <span>Talaba qismiga qaytish</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Admin footer info */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1 text-xs text-slate-400">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Admin Rejimi Faol</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 sm:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-xs font-semibold text-slate-400">
              Admin Platformasi
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{user?.name || "Bosh Admin"}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
