import i18n from "i18next";
import { setLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./index";
import { studentService } from "@/services/platform.service";
import { env } from "@/config/env";

/**
 * One language per account: the site language is also the language the server writes notifications in.
 * It is stored with the notification preferences, so it follows the user to every device.
 */
const isSupported = (code: string): code is SupportedLanguage => SUPPORTED_LANGUAGES.some((l) => l.code === code);

const save = (code: string) => {
  if (env.useMock || !isSupported(code)) return;
  // A failed save only means notifications keep the previous language; the site has already switched.
  void studentService.savePreferences({ language: code }).catch(() => undefined);
};

/** Switches the site language; for a signed-in user it is saved on the server too. */
export const chooseLanguage = async (code: string, signedIn: boolean) => {
  await setLanguage(code);
  if (signedIn) save(code);
};

/** After sign-in: the language saved on the account wins (the user chose it on some device). */
export const applySavedLanguage = async () => {
  if (env.useMock) return;
  try {
    const { language } = await studentService.preferences();
    if (isSupported(language) && language !== i18n.language) await setLanguage(language);
  } catch {
    // Keep the current language.
  }
};

/** A new account starts with the language its owner used to sign up. */
export const saveCurrentLanguage = () => save(i18n.language);
