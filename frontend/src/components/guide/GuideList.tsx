import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { GUIDES, guideText } from "@/content/siteGuide";
import GuideIcon from "./GuideIcon";

/** "Platformadan foydalanish": the always-open guides about the site, as a list of rows. */
export default function GuideList() {
  const { t, i18n } = useTranslation();
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {GUIDES.map((g, i) => {
        const text = guideText(g, i18n.language);
        return (
          <li key={g.slug}>
            <Link
              to={`/guide/${g.slug}`}
              className="group flex h-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-600"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                <GuideIcon kind={g.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800 dark:text-slate-100">
                  {i + 1}. {text.title}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {text.summary} · {t("guide.minutes", { count: g.minutes })}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
