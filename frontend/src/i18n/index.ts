import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import uz from "@/locales/uz.json";
import uzCyrl from "@/locales/uz_cyrl.json";
import ru from "@/locales/ru.json";

export const SUPPORTED_LANGUAGES = [
  { code: "uz", name: "O'zbekcha", short: "UZ" },
  { code: "uz_cyrl", name: "Ўзбекча", short: "ЎЗ" },
  { code: "ru", name: "Русский", short: "RU" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      uz_cyrl: { translation: uzCyrl },
      ru: { translation: ru },
    },
    fallbackLng: "uz",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

// Keep <html lang> in step with the UI language (screen readers, hyphenation, browser translation prompts).
const htmlLang = (lng: string) => (lng === "uz_cyrl" ? "uz-Cyrl" : lng);
document.documentElement.lang = htmlLang(i18n.resolvedLanguage ?? "uz");
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = htmlLang(lng);
});

export default i18n;
