import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import { useAuthStore } from "../store/auth.store";
import { useUIStore } from "../store/ui.store";
import {
  Car,
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  History,
  TrendingUp,
  Trophy,
  User as UserIcon,
  ShoppingBag,
  CalendarDays,
  ClipboardCheck,
  Bell,
  GraduationCap,
  Shield,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { can } from "../lib/permissions";
import { env } from "../config/env";
import { studentService } from "../services/platform.service";

export const StudentLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // Unread counter for the bell; a failed refresh just keeps the last number.
  useEffect(() => {
    if (env.useMock) return;
    let alive = true;
    const refresh = () => studentService.notifications().then((r) => alive && setUnread(r.unread)).catch(() => undefined);
    void refresh();
    const t = setInterval(refresh, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: "/lessons", label: t("nav.lessons"), icon: <BookOpen className="h-5 w-5" /> },
    { to: "/tests", label: t("nav.tests"), icon: <CheckSquare className="h-5 w-5" /> },
    { to: "/history", label: t("nav.history"), icon: <History className="h-5 w-5" /> },
    { to: "/progress", label: t("nav.progress"), icon: <TrendingUp className="h-5 w-5" /> },
    { to: "/leaderboard", label: t("nav.leaderboard"), icon: <Trophy className="h-5 w-5" /> },
    { to: "/orders", label: t("nav.orders"), icon: <ShoppingBag className="h-5 w-5" /> },
    { to: "/schedule", label: t("nav.schedule"), icon: <CalendarDays className="h-5 w-5" /> },
    { to: "/attendance", label: t("nav.attendance"), icon: <ClipboardCheck className="h-5 w-5" /> },
    { to: "/notifications", label: t("nav.notifications"), icon: <Bell className="h-5 w-5" /> },
    ...(["TEACHER", "ADMIN", "SUPERADMIN"].includes(user?.role ?? "")
      ? [{ to: "/teacher", label: t("nav.teacher"), icon: <GraduationCap className="h-5 w-5" /> }]
      : []),
    ...(can(user?.role, "admin:access") ? [{ to: "/admin", label: "Admin panel", icon: <Shield className="h-5 w-5" /> }] : []),
    { to: "/profile", label: t("nav.profile"), icon: <UserIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/30">
              <Car className="h-5 w-5" />
            </div>
            <span className="font-extrabold tracking-tight text-slate-900 dark:text-white">E-AVTO TEST</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 mx-3 my-3 rounded-2xl bg-gradient-to-br from-brand-50 to-blue-50/50 border border-brand-100 dark:from-brand-950/40 dark:to-blue-950/20 dark:border-brand-900/60 flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || t("nav.profile")}</h4>
            <span className="inline-flex items-center text-[11px] font-semibold text-brand-600 dark:text-brand-400">{t("nav.profile")}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.to === "/notifications" && unread > 0 && (
                <span aria-label={t("notifications.unreadAria", { count: unread })} className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button onClick={toggleTheme} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition">
            <span className="flex items-center gap-2">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span>{theme === "light" ? t("settings.darkMode") : t("settings.lightMode")}</span>
            </span>
          </button>
          <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition">
            <LogOut className="h-4 w-4" />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 sm:px-8 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <button aria-label={t("nav.menu")} onClick={() => setSidebarOpen(true)} className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              <Menu className="h-6 w-6" />
            </button>
            <span className="max-w-[10rem] truncate text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline-block">
              {t("nav.dashboard")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="pills" />
            <Link to="/tests" className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 border border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800 hover:bg-brand-100 transition">
              <CheckSquare className="h-4 w-4" />
              <span>{t("nav.tests")}</span>
            </Link>
            <button onClick={toggleTheme} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};