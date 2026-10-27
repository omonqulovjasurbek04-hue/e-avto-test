import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/auth.store";
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  FolderTree,
  HelpCircle,
  PlayCircle,
  Users,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  BadgeDollarSign,
  Receipt,
  CalendarRange,
  Newspaper,
  ClipboardList,
  ScrollText,
  Film,
  BarChart3,
  Activity,
  ShieldCheck,
  Brain,
} from "lucide-react";
import { cn } from "../utils/cn";
import { can, type Permission } from "../lib/permissions";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    void logout();
    navigate("/login");
  };

  const allItems: { to: string; label: string; icon: React.ReactNode; perm: Permission; end?: boolean }[] = [
    { to: "/admin", label: t("admin.nav.dashboard"), icon: <LayoutDashboard className="h-5 w-5" />, end: true, perm: "users:manage" },
    { to: "/admin/courses", label: t("admin.nav.courses"), icon: <BookOpen className="h-5 w-5" />, perm: "catalog:manage" },
    { to: "/admin/categories", label: t("admin.nav.categories"), icon: <FolderTree className="h-5 w-5" />, perm: "catalog:manage" },
    { to: "/admin/lessons", label: t("admin.nav.lessons"), icon: <PlayCircle className="h-5 w-5" />, perm: "catalog:manage" },
    { to: "/admin/questions", label: t("admin.nav.questions"), icon: <HelpCircle className="h-5 w-5" />, perm: "tests:manage" },
    { to: "/admin/catalog", label: t("admin.nav.catalog"), icon: <BadgeDollarSign className="h-5 w-5" />, perm: "catalog:manage" },
    { to: "/admin/orders", label: t("admin.nav.orders"), icon: <Receipt className="h-5 w-5" />, perm: "orders:read" },
    { to: "/admin/groups", label: t("admin.nav.groups"), icon: <CalendarRange className="h-5 w-5" />, perm: "groups:manage" },
    { to: "/admin/knowledge", label: t("admin.nav.knowledge"), icon: <Brain className="h-5 w-5" />, perm: "groups:manage" },
    { to: "/admin/exam", label: t("admin.nav.exam"), icon: <ClipboardList className="h-5 w-5" />, perm: "tests:manage" },
    { to: "/admin/cms", label: t("admin.nav.cms"), icon: <Newspaper className="h-5 w-5" />, perm: "content:manage" },
    { to: "/admin/users", label: t("admin.nav.users"), icon: <Users className="h-5 w-5" />, perm: "users:manage" },
    { to: "/admin/media", label: t("admin.nav.media"), icon: <Film className="h-5 w-5" />, perm: "media:manage" },
    { to: "/admin/reports", label: t("admin.nav.reports"), icon: <BarChart3 className="h-5 w-5" />, perm: "reports:read" },
    { to: "/admin/audit", label: t("admin.nav.audit"), icon: <ScrollText className="h-5 w-5" />, perm: "audit:read" },
    { to: "/admin/system", label: t("admin.nav.system"), icon: <Activity className="h-5 w-5" />, perm: "settings:manage" },
    // Own account security (password, 2FA, sessions) lives on the shared settings page.
    { to: "/settings?tab=security", label: t("admin.nav.security"), icon: <ShieldCheck className="h-5 w-5" />, perm: "admin:access" },
  ];
  // Only what this role can actually use; the API still refuses anything else.
  const navItems = allItems.filter((i) => can(user?.role, i.perm));

  return (
    <div className="dark flex min-h-screen bg-slate-900 text-slate-100 antialiased">
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
                {t("admin.layout.subtitle")}
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
            <span>{t("admin.layout.backToStudent")}</span>
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
          <LanguageSwitcher className="sm:hidden" />
          <div className="flex items-center gap-3 px-2 py-1 text-xs text-slate-400">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("admin.layout.mode", { role: t(`roles.${user?.role ?? "ADMIN"}`) })}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("admin.layout.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 sm:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              aria-label={t("admin.layout.menu")}
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="truncate text-xs font-semibold text-slate-400">
              {t("admin.layout.platform")}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <LanguageSwitcher className="hidden sm:flex" />
            <span className="max-w-[9rem] truncate sm:max-w-none">{user?.name || t("roles.ADMIN")}</span>
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
