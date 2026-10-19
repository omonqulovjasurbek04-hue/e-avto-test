import React, { useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Car, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "@/store/ui.store";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import { ROUTES } from "@/constants/routes";

/**
 * Login / sign-up: a full-screen car video behind a frosted-glass card.
 * Every auth page plays login.mp4 (mirrored on login), in its own colours (no tint); the frosted
 * card keeps the form readable. Inside the card the dark palette is forced (`dark`), so all text is
 * white on the glass in both themes; inputs stay white for contrast.
 */
export const AuthLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isRegister = pathname.startsWith(ROUTES.register);
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-slate-900">
      {/* Login: the card sits on the left, so the video is mirrored and the car ends up on the right, uncovered. */}
      <BackgroundVideo src="/video/login.mp4" mirror={!isRegister} />

      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="E-Avto Test">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur">
            <Car className="h-5 w-5" />
          </span>
          <span className="text-lg font-black tracking-tight text-white drop-shadow">E-AVTO.TEST</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Day / night: the button shows the mode you switch TO. */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("settings.lightMode") : t("settings.darkMode")}
            title={theme === "dark" ? t("settings.lightMode") : t("settings.darkMode")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-700 backdrop-blur transition hover:bg-white dark:bg-slate-900/70 dark:text-amber-300 dark:hover:bg-slate-900"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="rounded-xl bg-white/80 backdrop-blur dark:bg-slate-900/70">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Wide screens: sign-up card on the right, login card on the left — the car stays visible beside it. */}
      <main className={`flex flex-1 items-center justify-center px-4 pb-12 sm:px-6 ${isRegister ? "lg:justify-end lg:pr-16 xl:pr-28" : "lg:justify-start lg:pl-16 xl:pl-28"}`}>
        {/*
          Glass card; the video itself is never covered, only the card is tinted.
          Day: light white glass with dark (black) text. Night: light black glass with white text.
          The pages inside follow the site theme on <html>; the rules below only adapt them to the glass.
        */}
        <div
          className={[
            // Same size on every auth page (login and sign-up cards match); content is centred vertically.
            "flex w-full max-w-md flex-col justify-center rounded-3xl border p-6 shadow-2xl backdrop-blur-[3px] transition-colors duration-300 sm:p-8",
            // Sign-up (step 1) is shorter than the login form: give it the login card's natural height so both
            // cards match, without adding empty space to the login card itself.
            isRegister ? "sm:min-h-[530px]" : "",
            // Outline/ghost buttons (e.g. "Telegram orqali kirish") are transparent and vanish over the video: give them a glass fill.
            "[html:not(.dark)_&_button[class*='bg-transparent']]:!border-white/70 [html:not(.dark)_&_button[class*='bg-transparent']]:!bg-white/70 [html:not(.dark)_&_button[class*='bg-transparent']]:!text-black [html:not(.dark)_&_button[class*='bg-transparent']]:hover:!bg-white/90",
            "[html.dark_&_button[class*='bg-transparent']]:!border-white/25 [html.dark_&_button[class*='bg-transparent']]:!bg-white/10 [html.dark_&_button[class*='bg-transparent']]:!text-white",
            // Day glass is kept thin so the video stays partly visible behind the form.
            "border-white/50 bg-white/20 shadow-black/20",
            "[html.dark_&]:border-white/15 [html.dark_&]:bg-black/35 [html.dark_&]:shadow-black/40",
            // Inputs: solid white with dark text in both modes.
            "[&_input]:!border-slate-300/70 [&_input]:!bg-white/95 [&_input]:!text-slate-900 [&_input::placeholder]:!text-slate-400",
            // The show/hide password eye sits inside the white input, so it keeps light-field colours at night too.
            "[&_button[aria-controls][aria-pressed]]:!text-slate-500 [&_button[aria-controls][aria-pressed]:hover]:!bg-slate-100 [&_button[aria-controls][aria-pressed]:hover]:!text-slate-800",
            // Same for the fixed "+998" prefix of the phone field.
            "[&_[data-phone-prefix]]:!text-slate-800",
            "[&_a[class*='text-brand']]:underline [&_a[class*='text-brand']]:underline-offset-2",
            // Day: the pale-blue info box becomes clear white glass.
            "[html:not(.dark)_&_[class*='bg-brand-50']]:!bg-white/30",
            // Day: on the thin glass, grey helper text needs to be near-black to stay readable.
            // Day text: pure black, a bit heavier, with a faint white halo so it stays crisp over the moving video
            // (the card and the background are not changed).
            "[html:not(.dark)_&_:is(h1,h2,h3,p,span,li,ol,ul,label,div)[class*='text-slate-']]:!text-black [html:not(.dark)_&_a[class*='text-brand']]:!text-brand-800",
            "[html:not(.dark)_&_:is(p,li,label,span)]:!font-semibold [html:not(.dark)_&_:is(h1,h2)]:!font-extrabold [html:not(.dark)_&]:[text-shadow:0_0_2px_rgba(255,255,255,0.9),0_0_8px_rgba(255,255,255,0.6)]",
            // ...but not on the blue button (white text) and not inside the white inputs.
            "[html:not(.dark)_&_button]:[text-shadow:none] [html:not(.dark)_&_input]:[text-shadow:none]",
            // Night: inner panels become clear glass, grey helper text is lifted towards white
            // (icons inside the white inputs are excluded), brand links turn light cyan.
            "[html.dark_&_[class*='dark:bg-brand-950']]:!bg-white/10 [html.dark_&_[class*='dark:bg-slate-800']]:!bg-white/15 [html.dark_&_[class*='dark:text-slate-3']]:!text-white/90",
            "[html.dark_&_:is(p,span,li,a)[class*='text-slate-4']]:!text-white/80 [html.dark_&_:is(p,span,li,a)[class*='text-slate-5']]:!text-white/80 [html.dark_&_:is(p,span,li)[class*='text-slate-6']]:!text-white/85",
            "[html.dark_&_a[class*='text-brand']]:!text-sky-200",
          ].join(" ")}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function BackgroundVideo({ src, mirror = false }: { src: string; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Users who ask for less motion see the still poster.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return;
    }
    v.muted = true;
    v.play().catch(() => {});
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster="/images/login-poster.jpg"
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      className={`absolute inset-0 -z-20 h-full w-full object-cover ${mirror ? "lg:-scale-x-100" : ""}`}
    />
  );
}
