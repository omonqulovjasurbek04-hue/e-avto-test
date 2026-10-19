import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import LanguageFlag from "./LanguageFlag";

/** Compact labels for the header dropdown; the full name stays in the tooltip and for screen readers. */
const SHORT: Record<string, string> = { uz: "UZ", uz_cyrl: "KR", ru: "RU" };

interface LanguageSwitcherProps {
  variant?: "options" | "dropdown";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "dropdown",
  className = "",
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: string) => {
    void i18n.changeLanguage(code);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
              <LanguageFlag code={lang.code} />
              <span className="flex-1 text-left">{lang.name}</span>
              {isActive && <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
            </button>
          );
        })}
      </div>
    );
  }

  const others = SUPPORTED_LANGUAGES.filter((l) => l.code !== current.code);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={`Til: ${current.name}`}
        title={current.name}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-full cursor-pointer items-center gap-2 px-3 text-xs font-bold tracking-tight text-slate-700 transition-colors hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400 ${
          open
            ? "rounded-t-lg bg-white shadow-lg dark:bg-slate-800"
            : "rounded-lg"
        }`}
      >
        <LanguageFlag code={current.code} />
        <span>{SHORT[current.code] ?? current.code.toUpperCase()}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Til"
            role="menu"
            initial={{ opacity: 0, scaleY: 0.9 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.9 }}
            transition={{ duration: 0.12 }}
            style={{ transformOrigin: "top" }}
            className="absolute right-0 top-full z-50 min-w-full overflow-hidden rounded-b-lg bg-white shadow-lg dark:bg-slate-800"
          >
            {others.map((lang) => (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                title={lang.name}
                aria-label={lang.name}
                onClick={() => handleSelect(lang.code)}
                className="flex h-10 w-full cursor-pointer items-center gap-2 px-3 text-xs font-medium tracking-tight text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-brand-400"
              >
                <LanguageFlag code={lang.code} />
                <span>{SHORT[lang.code] ?? lang.code.toUpperCase()}</span>
              </button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
