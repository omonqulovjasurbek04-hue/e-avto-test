import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import type { CmsTranslations } from "@/services/platform.service";

/* ───── language versions ───── */

/** uz is the base text; the other two are optional translations (empty field → the uz text is shown). */
export type Lang = SupportedLanguage;
export type ExtraLang = Exclude<Lang, "uz">;
export const EXTRA: ExtraLang[] = ["uz_cyrl", "ru"];

export function LangTabs({ value, onChange, filled }: { value: Lang; onChange: (l: Lang) => void; filled?: Partial<Record<Lang, boolean>> }) {
  return (
    <div role="tablist" aria-label="Language" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
      {SUPPORTED_LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="tab"
          aria-selected={value === l.code}
          data-lang={l.code}
          onClick={() => onChange(l.code)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${value === l.code ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
        >
          {l.name}
          {l.code !== "uz" && filled && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${filled[l.code] ? "bg-emerald-500 dark:bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />}
        </button>
      ))}
    </div>
  );
}

export function FallbackHint({ lang }: { lang: Lang }) {
  const { t } = useTranslation();
  return lang === "uz" ? null : <p className="text-xs text-amber-700 dark:text-amber-300/80">{t("admin.cms.langFallbackHint")}</p>;
}

/** Stored translations → editable strings for every extra language. */
export const toTr = <F extends string>(fields: readonly F[], stored: CmsTranslations<string> | undefined): Record<ExtraLang, Record<F, string>> =>
  Object.fromEntries(EXTRA.map((l) => [l, Object.fromEntries(fields.map((f) => [f, stored?.[l]?.[f] ?? ""]))])) as Record<ExtraLang, Record<F, string>>;
export const hasText = (v: Record<string, string>) => Object.values(v).some((s) => s.trim() !== "");
