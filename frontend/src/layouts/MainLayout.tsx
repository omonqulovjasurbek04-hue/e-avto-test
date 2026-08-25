import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import { useAuthStore } from "../store/auth.store";
import { useUIStore } from "../store/ui.store";
import { Button } from "../components/ui";
import {
  Car,
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

export const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="container-page flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 text-white shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <Car className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-brand-600 to-blue-700 bg-clip-text text-transparent dark:from-brand-400 dark:to-blue-300">
                E-AVTO<span className="text-slate-900 dark:text-white">.TEST</span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <Link to="/courses" className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition">
              {t("nav.courses")}
            </Link>
            <Link to="/tests" className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition">
              {t("nav.tests")}
            </Link>
            <Link to="/leaderboard" className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition">
              {t("nav.leaderboard")}
            </Link>
            <Link to="/faq" className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition">
              {t("nav.faq")}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="pills" />
            <button onClick={toggleTheme} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition" title={theme === "light" ? t("settings.darkMode") : t("settings.lightMode")}>
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard">
                  <Button size="sm" variant="secondary" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                    {t("nav.dashboard")}
                  </Button>
                </Link>
                <button onClick={handleLogout} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition" title={t("nav.logout")}>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login"><Button variant="ghost" size="sm">{t("nav.login")}</Button></Link>
                <Link to="/register"><Button variant="primary" size="sm">{t("nav.register")}</Button></Link>
              </div>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 space-y-3 animate-fade-in">
            <Link to="/courses" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t("nav.courses")}</Link>
            <Link to="/tests" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t("nav.tests")}</Link>
            <Link to="/leaderboard" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t("nav.leaderboard")}</Link>
            <Link to="/faq" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t("nav.faq")}</Link>
            {!isAuthenticated && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}><Button variant="outline" className="w-full">{t("nav.login")}</Button></Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}><Button variant="primary" className="w-full">{t("nav.register")}</Button></Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 mt-16">
        <div className="container-page py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Car className="h-4 w-4" /></div>
                <span className="font-extrabold text-slate-900 dark:text-white tracking-tight">E-AVTO TEST</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t("home.heroSubtitle")}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">{t("nav.courses")}</h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/courses" className="hover:text-brand-600 transition">{t("nav.courses")}</Link></li>
                <li><Link to="/tests" className="hover:text-brand-600 transition">{t("nav.tests")}</Link></li>
                <li><Link to="/leaderboard" className="hover:text-brand-600 transition">{t("nav.leaderboard")}</Link></li>
                <li><Link to="/lessons" className="hover:text-brand-600 transition">{t("nav.lessons")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">{t("nav.about")}</h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/about" className="hover:text-brand-600 transition">{t("nav.about")}</Link></li>
                <li><Link to="/faq" className="hover:text-brand-600 transition">{t("nav.faq")}</Link></li>
                <li><Link to="/contact" className="hover:text-brand-600 transition">{t("nav.contact")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">{t("nav.contact")}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Toshkent, O'zbekiston</p>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} E-Avto Test.
          </div>
        </div>
      </footer>
    </div>
  );
};