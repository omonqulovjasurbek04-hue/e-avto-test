import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import uz from "@/locales/uz.json";

export const SUPPORTED_LANGUAGES = [
  { code: "uz", name: "O'zbekcha", short: "UZ" },
  { code: "uz_cyrl", name: "Ўзбекча", short: "ЎЗ" },
  { code: "ru", name: "Русский", short: "RU" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Only the default language ships in the main bundle; the others are fetched when chosen (~40 KB gzip saved).
const loaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  uz_cyrl: () => import("@/locales/uz_cyrl.json"),
  ru: () => import("@/locales/ru.json"),
};

const loadLanguage = async (lng: string) => {
  if (!loaders[lng] || i18n.hasResourceBundle(lng, "translation")) return;
  i18n.addResourceBundle(lng, "translation", (await loaders[lng]()).default);
};

/** Switches the UI language after its texts are loaded, so no half-translated frame is shown. */
export const setLanguage = async (lng: string) => {
  await loadLanguage(lng);
  await i18n.changeLanguage(lng);
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { uz: { translation: uz } },
    partialBundledLanguages: true,
    fallbackLng: "uz",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    // Uzbek unless the user picked a language with the switcher (remembered here and on the account).
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

// Keep <html lang> in step with the UI language (screen readers, hyphenation, browser translation prompts).
const htmlLang = (lng: string) => (lng === "uz_cyrl" ? "uz-Cyrl" : lng);
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = htmlLang(lng);
});

/** Resolves once the detected language is loaded; the app renders after it. Falls back to Uzbek if the chunk fails. */
export const i18nReady = setLanguage(i18n.language).catch(() => i18n.changeLanguage("uz"));

export default i18n;
