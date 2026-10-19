interface LanguageFlagProps {
  code: string;
  className?: string;
}

/** Simplified SVG flags — emoji flags don't render on Windows. */
export default function LanguageFlag({ code, className = "" }: LanguageFlagProps) {
  const base = `inline-block shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10 dark:ring-white/15 ${className}`;

  if (code === "ru") {
    return (
      <svg viewBox="0 0 18 12" width="18" height="12" className={base} aria-hidden="true">
        <rect width="18" height="4" fill="#FFFFFF" />
        <rect y="4" width="18" height="4" fill="#0039A6" />
        <rect y="8" width="18" height="4" fill="#D52B1E" />
      </svg>
    );
  }

  // uz, uz_cyrl
  return (
    <svg viewBox="0 0 18 12" width="18" height="12" className={base} aria-hidden="true">
      <rect width="18" height="4" fill="#0099B5" />
      <rect y="4" width="18" height="4" fill="#FFFFFF" />
      <rect y="8" width="18" height="4" fill="#1EB53A" />
      <rect y="3.7" width="18" height="0.6" fill="#CE1126" />
      <rect y="7.7" width="18" height="0.6" fill="#CE1126" />
    </svg>
  );
}
