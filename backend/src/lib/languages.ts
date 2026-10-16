import { z } from "zod";

/** Site languages. "uz" (Latin) is the base: stored in the main columns and used as the fallback for the others. */
export const LANGUAGES = ["uz", "uz_cyrl", "ru"] as const;
export type Language = (typeof LANGUAGES)[number];
export const BASE_LANGUAGE = "uz" satisfies Language;
/** Languages kept as translations next to the uz base. */
export const EXTRA_LANGUAGES = ["uz_cyrl", "ru"] as const;
export type ExtraLanguage = (typeof EXTRA_LANGUAGES)[number];

export const languageSchema = z.enum(LANGUAGES);

/** Accepts our own codes and the usual BCP-47 spellings (uz-Cyrl, uz-Latn, ru-RU). Unknown → null. */
export const normalizeLanguage = (value: unknown): Language | null => {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/-/g, "_");
  if (v === "uz_cyrl" || v.startsWith("uz_cyrl")) return "uz_cyrl";
  if (v === "uz" || v.startsWith("uz_")) return "uz";
  if (v === "ru" || v.startsWith("ru_")) return "ru";
  return null;
};

/** Visitor language: ?lang= wins, then the first supported entry of Accept-Language, else uz. */
export const requestLanguage = (req: { query: Record<string, unknown>; headers: Record<string, string | string[] | undefined> }): Language => {
  const fromQuery = normalizeLanguage(req.query.lang);
  if (fromQuery) return fromQuery;
  const header = req.headers["accept-language"];
  const raw = Array.isArray(header) ? header.join(",") : header ?? "";
  for (const part of raw.split(",")) {
    const lang = normalizeLanguage(part.split(";")[0]);
    if (lang) return lang;
  }
  return BASE_LANGUAGE;
};
