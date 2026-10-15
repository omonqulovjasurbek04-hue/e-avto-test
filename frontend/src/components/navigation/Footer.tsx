import { Link } from "react-router-dom";
import { Car, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";
import { useSiteSettings } from "@/hooks/useSiteSettings";

// Only real, configured links are shown (no placeholder social icons).
const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM_URL as string | undefined;

export default function Footer() {
  const { t } = useTranslation();
  const site = useSiteSettings();
  const name = site.siteName || "E-Avto Test";

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-page grid gap-8 py-10 md:grid-cols-4">
        <div>
          <Link to={ROUTES.home} className="flex items-center gap-2 font-bold text-brand-700 dark:text-brand-400">
            <Car className="h-6 w-6" />
            <span>{name}</span>
          </Link>
          <p className="mt-3 text-sm text-slate-500">
            {site.tagline || t("home.heroSubtitle")}
          </p>
          {(site.phone || site.email) && (
            <p className="mt-2 text-sm text-slate-500">{[site.phone, site.email].filter(Boolean).join(" · ")}</p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("nav.home")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to={ROUTES.courses} className="hover:text-brand-600">{t("nav.courses")}</Link></li>
            <li><Link to={ROUTES.tests} className="hover:text-brand-600">{t("nav.tests")}</Link></li>
            <li><Link to={ROUTES.leaderboard} className="hover:text-brand-600">{t("nav.leaderboard")}</Link></li>
            <li><Link to="/news" className="hover:text-brand-600">Yangiliklar</Link></li>
            <li><Link to="/pricing" className="hover:text-brand-600">Narxlar</Link></li>
            <li><Link to={ROUTES.about} className="hover:text-brand-600">{t("nav.about")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("nav.faq")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to={ROUTES.faq} className="hover:text-brand-600">{t("nav.faq")}</Link></li>
            <li><Link to={ROUTES.contact} className="hover:text-brand-600">{t("nav.contact")}</Link></li>
            <li><Link to="/privacy" className="hover:text-brand-600">Maxfiylik siyosati</Link></li>
            <li><Link to="/terms" className="hover:text-brand-600">Foydalanish shartlari</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("nav.about")}</h4>
          {TELEGRAM_URL && (
            <div className="mt-3 flex gap-3 text-slate-500">
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="hover:text-brand-600">
                <Send className="h-5 w-5" />
              </a>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        © {new Date().getFullYear()} {name}.
      </div>
    </footer>
  );
}