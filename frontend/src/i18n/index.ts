import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import uz from "@/locales/uz.json";
import uzCyrl from "@/locales/uz_cyrl.json";
import ru from "@/locales/ru.json";

export const SUPPORTED_LANGUAGES = [
  { code: "uz", name: "O'zbek", short: "UZ", flag: "🇺🇿" },
  { code: "uz_cyrl", name: "Ўзбек", short: "ЎЗ", flag: "🇺🇿" },
  { code: "ru", name: "Русский", short: "RU", flag: "🇷🇺" },
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
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
