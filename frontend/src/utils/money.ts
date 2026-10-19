import i18n from "@/i18n";

/** The API stores money as integer minor units (tiyin). 1 so'm = 100 tiyin. */
export const toSom = (minor: number): number => minor / 100;
export const fromSom = (som: number): number => Math.round(som * 100);

const LOCALES: Record<string, string> = { uz: "uz-UZ", uz_cyrl: "uz-Cyrl-UZ", ru: "ru-RU" };
const SOM: Record<string, string> = { uz: "so'm", uz_cyrl: "сўм", ru: "сум" };
const lang = () => ((i18n.resolvedLanguage ?? i18n.language) in LOCALES ? (i18n.resolvedLanguage ?? i18n.language) : "uz");
const locale = () => LOCALES[lang()];

export const formatMoney = (minor: number, currency = "UZS"): string => {
  const som = toSom(minor);
  // Group digits with a normal space so the text is easy to copy and to match in tests. Built from parts:
  // browsers without full ICU data fall back to English grouping ("5,900,000") for uz-UZ.
  const text = new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 })
    .formatToParts(som)
    .map((p) => (p.type === "group" ? " " : p.value))
    .join("");
  return currency === "UZS" ? `${text} ${SOM[lang()]}` : `${text} ${currency}`;
};

const TZ = "Asia/Tashkent";

export const formatDateTime = (iso: string | Date): string =>
  new Intl.DateTimeFormat(locale(), { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const formatTime = (iso: string | Date): string =>
  new Intl.DateTimeFormat(locale(), { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Value for <input type="datetime-local"> in Tashkent time (UTC+5, no DST) -> ISO string in UTC. */
export const tashkentLocalToIso = (local: string): string => new Date(`${local}:00+05:00`).toISOString();

/** Whole numbers with a space as the thousands separator in every language ("2 850"). */
export const formatNumber = (n: number): string =>
  new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 })
    .formatToParts(n)
    .map((p) => (p.type === "group" ? " " : p.value))
    .join("");
