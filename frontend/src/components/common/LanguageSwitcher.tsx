import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";

interface LanguageSwitcherProps {
  variant?: "pills" | "options" | "dropdown";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "pills",
  className = "",
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const handleSelect = (code: string) => {
    void i18n.changeLanguage(code);
  };

  if (variant === "options") {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Til / Язык
          </span>
        </div>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = i18n.language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-50 text-brand-700 ring-2 ring-brand-500 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-400"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.name}</span>
              {isActive && <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "pills") {
    return (
      <div className={`flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 ${className}`}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = i18n.language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.short}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}