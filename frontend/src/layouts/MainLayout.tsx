import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { useUIStore } from "../store/ui.store";
import { Button } from "../components/ui";
import {
  Car,
  BookOpen,
  CheckCircle,
  Trophy,
  Moon,
  Sun,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Shield,
  LayoutDashboard,
} from "lucide-react";

export const MainLayout: React.FC = () => {
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
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="container-page flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 text-white shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <Car className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-brand-600 to-blue-700 bg-clip-text text-transparent dark:from-brand-400 dark:to-blue-300">
                E-AVTO<span className="text-slate-900 dark:text-white">.TEST</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 -mt-1 tracking-wider">
                YHQ NAZARIYASI
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7">
            <Link
              to="/courses"
              className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition"
            >
              Kurslar
            </Link>
            <Link
              to="/tests"
              className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition"
            >
              Imtihon Testlari
            </Link>
            <Link
              to="/leaderboard"
              className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition"
            >
              Reyting
            </Link>
            <Link
              to="/faq"
              className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition"
            >
              Savol-Javob
            </Link>
          </nav>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              title={theme === "light" ? "Tungi rejim" : "Kunduzgi rejim"}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Auth / User Buttons */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard">
                  <Button size="sm" variant="secondary" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                    Kabinet
                  </Button>
                </Link>
                {user.role === "ADMIN" && (
                  <Link to="/admin">
                    <Button size="sm" variant="accent" leftIcon={<Shield className="h-4 w-4" />}>
                      Admin
                    </Button>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
                  title="Chiqish"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Kirish
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Ro'yxatdan o'tish
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 space-y-3 animate-fade-in">
            <Link
              to="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Kurslar
            </Link>
            <Link
              to="/tests"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Imtihon Testlari
            </Link>
            <Link
              to="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reyting
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Savol-Javob
            </Link>
            {!isAuthenticated && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Kirish
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Ro'yxatdan o'tish
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 mt-16">
        <div className="container-page py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                  <Car className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white tracking-tight">
                  E-AVTO TEST
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Avtomobil haydash nazariyasini o'rganish va YHXDX imtihonlariga 100% ishonch bilan tayyorlanish platformasi.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                Bo'limlar
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/courses" className="hover:text-brand-600 transition">B toifa kurslari</Link></li>
                <li><Link to="/tests" className="hover:text-brand-600 transition">20 talik Davlat Testi</Link></li>
                <li><Link to="/leaderboard" className="hover:text-brand-600 transition">O'quvchilar reytingi</Link></li>
                <li><Link to="/lessons" className="hover:text-brand-600 transition">Video darsliklar</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                Ma'lumot
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/about" className="hover:text-brand-600 transition">Biz haqimizda</Link></li>
                <li><Link to="/faq" className="hover:text-brand-600 transition">Ko'p beriladigan savollar</Link></li>
                <li><Link to="/contact" className="hover:text-brand-600 transition">Aloqa va qo'llab-quvvatlash</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                Aloqa
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toshkent shahri, O'zbekiston<br />
                Email: support@eavto.uz<br />
                Tel: +998 71 200 00 00
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <p>© {new Date().getFullYear()} E-Avto Test. Barcha huquqlar himoyalangan.</p>
            <div className="flex gap-4 mt-3 sm:mt-0">
              <span>Maxfiylik siyosati</span>
              <span>Foydalanish shartlari</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
