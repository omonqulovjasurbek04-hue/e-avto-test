import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Car, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/utils/cn";

const publicLinks = [
  { to: ROUTES.home, label: "Bosh sahifa" },
  { to: ROUTES.courses, label: "Kurslar" },
  { to: ROUTES.tests, label: "Testlar" },
  { to: ROUTES.leaderboard, label: "Reyting" },
  { to: ROUTES.about, label: "Haqida" },
];

const studentLinks = [
  { to: ROUTES.dashboard, label: "Kabinet" },
  { to: ROUTES.courses, label: "Kurslar" },
  { to: ROUTES.tests, label: "Testlar" },
  { to: ROUTES.history, label: "Tarix" },
  { to: ROUTES.leaderboard, label: "Reyting" },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = isAuthenticated ? studentLinks : publicLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to={ROUTES.home} className="flex items-center gap-2 font-bold text-brand-700 dark:text-brand-400">
          <Car className="h-6 w-6" />
          <span className="text-lg">E-Avto Test</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Link to={ROUTES.dashboard}>
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="h-4 w-4" /> Kabinet
                </Button>
              </Link>
              <Link to={ROUTES.profile}>
                <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Avatar name={user?.name ?? "U"} size="sm" />
                  <span className="text-sm font-medium">{user?.name.split(" ")[0]}</span>
                </div>
              </Link>
              <Button variant="outline" size="sm" onClick={() => { logout(); navigate(ROUTES.home); }}>
                <LogOut className="h-4 w-4" /> Chiqish
              </Button>
            </>
          ) : (
            <>
              <Link to={ROUTES.login}>
                <Button variant="ghost" size="sm">Kirish</Button>
              </Link>
              <Link to={ROUTES.register}>
                <Button size="sm">Ro'yxatdan o'tish</Button>
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2">
              {isAuthenticated ? (
                <Button variant="outline" size="sm" onClick={() => { logout(); navigate(ROUTES.home); setOpen(false); }}>
                  Chiqish
                </Button>
              ) : (
                <>
                  <Link to={ROUTES.login} onClick={() => setOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">Kirish</Button>
                  </Link>
                  <Link to={ROUTES.register} onClick={() => setOpen(false)} className="flex-1">
                    <Button size="sm" className="w-full">Ro'yxatdan o'tish</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
