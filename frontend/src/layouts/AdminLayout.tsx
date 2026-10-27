import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/auth.store";
import {
  Shield,
  Menu,
  X,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";
import { cn } from "../utils/cn";
import { can, type Permission } from "../lib/permissions";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allItems: { to: string; label: string; icon: React.ReactNode; perm: Permission; end?: boolean }[] = [
    // Courses, categories, lessons, videos and materials are managed in the app (/my-courses, /lessons).
    { to: "/admin/exam", label: t("admin.nav.exam"), icon: <ClipboardList className="h-5 w-5" />, perm: "tests:manage" },
    // Own account security (password, 2FA, sessions): Settings → Security in the app.
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

        {/* Phones: the language switch (it is in the top bar on larger screens). Signing out is in the main site's profile menu. */}
        <div className="border-t border-slate-800 p-4 sm:hidden">
          <LanguageSwitcher />
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
