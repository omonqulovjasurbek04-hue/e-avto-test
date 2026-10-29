import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Car } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { DEFAULT_CONTACT } from "@/constants/config";

/** The site footer (sections, about, contacts): under the public pages and under every page of the app. */
export default function SiteFooter() {
  const { t } = useTranslation();
  const site = useSiteSettings();
  const siteName = site.siteName || "E-Avto Test";
  return (
  <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
    <div className="container-page py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Car className="h-4 w-4" /></div>
            <span className="font-extrabold text-slate-900 dark:text-white tracking-tight">{siteName.toUpperCase()}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{site.tagline || t("home.heroSubtitle")}</p>
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
            <li><Link to="/news" className="hover:text-brand-600 transition">{t("nav.news")}</Link></li>
            <li><Link to="/privacy" className="hover:text-brand-600 transition">{t("nav.privacy")}</Link></li>
            <li><Link to="/terms" className="hover:text-brand-600 transition">{t("nav.terms")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">{t("nav.contact")}</h4>
          <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
            {[site.address || DEFAULT_CONTACT.address, site.phone, site.email, site.workingHours]
              .filter(Boolean)
              .map((v) => <li key={v}>{v}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} {siteName}.
      </div>
    </div>
  </footer>
  );
}
