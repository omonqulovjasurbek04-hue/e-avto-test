import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import { useAuthStore } from "../store/auth.store";
import { useUIStore } from "../store/ui.store";
import {
  Car,
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Trophy,
  Repeat,
  User as UserIcon,
  ShoppingBag,
  Bell,
  GraduationCap,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
  Library,
  Settings as SettingsIcon,
  Lock,
  Users,
  Newspaper,
  ScrollText,
  Activity,
  Receipt,
  ClipboardList,
} from "lucide-react";
import { cn } from "../utils/cn";
import { assetUrl } from "../utils/assetUrl";
import { accountLabel } from "../utils/studentId";
import { useCourseAccess } from "../hooks/useCourseAccess";
import { can } from "../lib/permissions";
import { env } from "../config/env";
import { studentService, UNREAD_EVENT } from "../services/platform.service";
import type { User } from "../types/user";

const COLLAPSE_KEY = "e_avto_sidebar_collapsed";

export const StudentLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop: the sidebar can be folded to icons; the choice is remembered in this browser.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleMenu = () => {
    if (!isDesktop()) {
      setSidebarOpen((v) => !v);
      return;
    }
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      } catch {
        // storage unavailable: the choice lasts until reload
      }
      return !v;
    });
  };
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // Unread counter for the red dot; a failed refresh just keeps the last number. It is re-read on every
  // page change, and the notifications page reports the new count right after "mark as read".
  const { pathname } = useLocation();
  // Re-read on each page change, so a purchase unlocks the menu without a reload.
  const { hasAnyCourse } = useCourseAccess(pathname);
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
  }, [pathname]);
  useEffect(() => {
    const onUnread = (e: Event) => setUnread((e as CustomEvent<number>).detail);
    window.addEventListener(UNREAD_EVENT, onUnread);
    return () => window.removeEventListener(UNREAD_EVENT, onUnread);
  }, []);

  // The phone drawer closes with Escape too.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSidebarOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const handleLogout = () => {
    void logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: <LayoutDashboard className="h-5 w-5" /> },
    // Teaching staff: their groups right after the dashboard; group managers run every group there.
    ...(["TEACHER", "MANAGER", "ADMIN", "SUPERADMIN"].includes(user?.role ?? "")
      ? [{ to: "/teacher", label: user?.role === "TEACHER" ? t("nav.teacher") : t("admin.nav.groups"), icon: <GraduationCap className="h-5 w-5" /> }]
      : []),
    // Admins manage the accounts here, next to their teaching page.
    ...(can(user?.role, "users:manage") ? [{ to: "/users", label: t("admin.nav.users"), icon: <Users className="h-5 w-5" /> }] : []),
    { to: "/my-courses", label: t("nav.courses"), icon: <Library className="h-5 w-5" /> },
    { to: "/lessons", label: t("nav.lessons"), icon: <BookOpen className="h-5 w-5" />, needsCourse: true },
    { to: "/tests", label: t("nav.tests"), icon: <CheckSquare className="h-5 w-5" />, needsCourse: true },
    { to: "/my-rating", label: t("nav.leaderboard"), icon: <Trophy className="h-5 w-5" /> },
    // Teachers: the same place shows their students' knowledge instead of their own mistakes.
    { to: "/mistakes", label: user?.role === "TEACHER" || can(user?.role, "groups:manage") ? t("nav.knowledge") : t("nav.mistakes"), icon: <Repeat className="h-5 w-5" />, needsCourse: true },
    // Staff tools, each for whoever holds its right.
    ...(can(user?.role, "content:manage") ? [{ to: "/site-content", label: t("admin.nav.cms"), icon: <Newspaper className="h-5 w-5" /> }] : []),
    ...(can(user?.role, "audit:read") ? [{ to: "/audit", label: t("admin.nav.audit"), icon: <ScrollText className="h-5 w-5" /> }] : []),
    ...(can(user?.role, "settings:manage") ? [{ to: "/system", label: t("admin.nav.system"), icon: <Activity className="h-5 w-5" /> }] : []),
    ...(can(user?.role, "orders:read") ? [{ to: "/revenue", label: t("admin.nav.orders"), icon: <Receipt className="h-5 w-5" /> }] : []),
    ...(can(user?.role, "tests:manage") ? [{ to: "/exam-settings", label: t("admin.nav.exam"), icon: <ClipboardList className="h-5 w-5" /> }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Full-width top bar: logo, menu button, account number on the left; language, theme, profile on the right. */}
      <header className="sticky top-0 z-40 flex h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div
          className={cn(
            "hidden shrink-0 items-center overflow-hidden border-r border-slate-200 transition-[width,padding] duration-300 ease-in-out lg:flex dark:border-slate-800",
            // Collapsed: the 36px logo mark sits in the middle of the 80px column.
            collapsed ? "w-20 px-[1.375rem]" : "w-72 px-6"
          )}
        >
          <Logo compact={collapsed} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={t("nav.menu")}
              aria-controls="student-sidebar"
              aria-expanded={isDesktop() ? !collapsed : sidebarOpen}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* On phones the logo column is hidden, so the logo sits next to the menu button. */}
            <div className="lg:hidden">
              <Logo compact />
            </div>
            {/* The account's own number instead of a page title: "student0001" after a bought course, otherwise "user0001". */}
            <span
              title={t("nav.profile")}
              className={`hidden max-w-[12rem] truncate rounded-lg px-2.5 py-1 font-mono text-xs font-semibold tracking-wide sm:inline-block ${
                user?.studentNumber
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {accountLabel(user, t) || t("nav.dashboard")}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <button
              onClick={toggleTheme}
              aria-label={theme === "light" ? t("settings.darkMode") : t("settings.lightMode")}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <ProfileMenu user={user} unread={unread} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Phone backdrop: fades in and out with the drawer instead of vanishing at once. */}
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />

        {/*
          Phones: a drawer over the page. Desktop: stays in place under the top bar while the page scrolls
          (sticky, own scroll), and the menu button folds it to icons only.
        */}
        <aside
          id="student-sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-x-hidden border-r border-slate-200 bg-white transition-[transform,width] duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900",
            "lg:sticky lg:top-16 lg:z-30 lg:h-[calc(100vh-4rem)] lg:translate-x-0",
            collapsed && "lg:w-20",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-6 lg:hidden dark:border-slate-800">
            <Logo />
            <button onClick={() => setSidebarOpen(false)} aria-label={t("common.close")} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              // No bought course yet: lessons and tests are locked and lead to the course catalogue.
              const locked = "needsCourse" in item && item.needsCourse && hasAnyCourse === false;
              return (
              <NavLink
                key={item.to}
                to={locked ? "/my-courses" : item.to}
                onClick={() => setSidebarOpen(false)}
                title={locked ? t("access.buyFirst") : collapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  "flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out",
                  // Collapsed: the icon slides to the middle of the narrow column (padding animates, no jump).
                  collapsed && "lg:px-[1.125rem]",
                  // A locked item points at the catalogue, but only "Kurslar" itself is the current page.
                  isActive && !locked
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
              >
                <span className="relative">
                  {item.icon}
                  {locked && collapsed && <Lock aria-hidden="true" className="absolute -bottom-1 -right-1.5 hidden h-3 w-3 lg:block" />}
                </span>
                {/* The label fades and folds away with the column (still read by screen readers). */}
                <span
                  className={cn(
                    "ml-3 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-in-out",
                    collapsed ? "max-w-[12rem] opacity-100 lg:ml-0 lg:max-w-0 lg:opacity-0" : "max-w-[12rem] opacity-100"
                  )}
                >
                  {item.label}
                </span>
                {locked && (
                  <Lock aria-label={t("access.locked")} className={cn("ml-auto h-4 w-4 opacity-70", collapsed && "lg:hidden")} />
                )}
              </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center" aria-label="E-AVTO TEST">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/30">
        <Car className="h-5 w-5" />
      </span>
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap font-extrabold tracking-tight text-slate-900 transition-[max-width,opacity,margin] duration-300 ease-in-out dark:text-white",
          compact ? "ml-0 max-w-0 opacity-0" : "ml-2.5 max-w-[10rem] opacity-100"
        )}
      >
        E-AVTO TEST
      </span>
    </Link>
  );
}
/**
 * The avatar chip in the header opens a small account menu: notifications (with the unread count),
 * the profile page and logout. Closes on an outside click, Escape, or when a page is opened.
 */
function ProfileMenu({ user, unread, onLogout }: { user: User | null; unread: number; onLogout: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = user?.name?.charAt(0).toUpperCase() || "U";
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
      isActive
        ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    );

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.profile")}
        className={cn(
          "flex items-center gap-2.5 rounded-full border py-1 pl-1 pr-1 transition sm:pr-2.5",
          open
            ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-950/40"
            : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
        )}
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {user?.avatarUrl ? <img src={assetUrl(user.avatarUrl)} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" /> : initial}
          {unread > 0 && (
            <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500 dark:border-slate-900" />
          )}
        </span>
        <span className="hidden max-w-[9rem] text-left leading-tight sm:block">
          <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name || t("nav.profile")}</span>
          <span className="block text-[11px] font-semibold text-brand-600 dark:text-brand-400">{t("nav.profile")}</span>
        </span>
        <ChevronDown className={cn("hidden h-4 w-4 text-slate-400 transition-transform sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("nav.profile")}
          className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 animate-fade-in dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
        >
          <div className="mb-1 flex items-center gap-3 border-b border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 font-bold text-white">
              {user?.avatarUrl ? <img src={assetUrl(user.avatarUrl)} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name}</span>
              {accountLabel(user, t) && (
                <span className="block truncate font-mono text-[11px] font-semibold text-brand-600 dark:text-brand-400">{accountLabel(user, t)}</span>
              )}
              {user?.phone && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{user.phone}</span>}
            </span>
          </div>
          <NavLink to="/notifications" role="menuitem" className={itemClass}>
            <Bell className="h-4 w-4" />
            <span>{t("nav.notifications")}</span>
            {unread > 0 && (
              <span aria-label={t("notifications.unreadAria", { count: unread })} className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </NavLink>
          <NavLink to="/profile" role="menuitem" className={itemClass}>
            <UserIcon className="h-4 w-4" />
            <span>{t("nav.profile")}</span>
          </NavLink>
          <NavLink to="/orders" role="menuitem" className={itemClass}>
            <ShoppingBag className="h-4 w-4" />
            <span>{t("nav.orders")}</span>
          </NavLink>
          <NavLink to="/settings" role="menuitem" className={itemClass}>
            <SettingsIcon className="h-4 w-4" />
            <span>{t("nav.settings")}</span>
          </NavLink>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
