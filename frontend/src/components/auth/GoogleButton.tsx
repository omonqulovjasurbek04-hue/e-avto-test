import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet } from "@/services/api";
import { env } from "@/config/env";

let available: Promise<boolean> | null = null;
// Asked once per page load: the server shows the button only when a Google client is configured.
const googleEnabled = () =>
  (available ??= env.useMock ? Promise.resolve(false) : apiGet<{ enabled: boolean }>("/auth/google/config").then((r) => r.enabled).catch(() => false));

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/**
 * "Continue with Google": a full-page trip to Google and back through the site's own /api, so the
 * session cookie it ends with is first-party. Hidden while Google sign-in is not configured.
 */
export default function GoogleButton({ next = "/dashboard" }: { next?: string }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void googleEnabled().then((on) => alive && setEnabled(on));
    return () => {
      alive = false;
    };
  }, []);

  if (!enabled) return null;
  return (
    <button
      type="button"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        window.location.assign(`${env.apiUrl}/auth/google/start?next=${encodeURIComponent(next)}`);
      }}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      <GoogleLogo /> {t("auth.google.continue")}
    </button>
  );
}
