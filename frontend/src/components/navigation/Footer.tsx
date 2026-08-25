import { Link } from "react-router-dom";
import { Car, Facebook, Instagram, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants/routes";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-page grid gap-8 py-10 md:grid-cols-4">
        <div>
          <Link to={ROUTES.home} className="flex items-center gap-2 font-bold text-brand-700 dark:text-brand-400">
            <Car className="h-6 w-6" />
            <span>E-Avto Test</span>
          </Link>
          <p className="mt-3 text-sm text-slate-500">
            {t("home.heroSubtitle")}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("nav.home")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to={ROUTES.courses} className="hover:text-brand-600">{t("nav.courses")}</Link></li>
            <li><Link to={ROUTES.tests} className="hover:text-brand-600">{t("nav.tests")}</Link></li>
            <li><Link to={ROUTES.leaderboard} className="hover:text-brand-600">{t("nav.leaderboard")}</Link></li>
            <li><Link to={ROUTES.about} className="hover:text-brand-600">{t("nav.about")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("nav.faq")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to={ROUTES.faq} className="hover:text-brand-600">{t("nav.faq")}</Link></li>
            <li><Link to={ROUTES.contact} className="hover:text-brand-600">{t("nav.contact")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("nav.about")}</h4>
          <div className="mt-3 flex gap-3 text-slate-500">
            <a href="#" aria-label="Telegram" className="hover:text-brand-600"><Send className="h-5 w-5" /></a>
            <a href="#" aria-label="Instagram" className="hover:text-brand-600"><Instagram className="h-5 w-5" /></a>
            <a href="#" aria-label="Facebook" className="hover:text-brand-600"><Facebook className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        © {new Date().getFullYear()} E-Avto Test.
      </div>
    </footer>
  );
}