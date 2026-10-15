import { z } from "zod";

/** Only web URLs. Plain `.url()` also accepts `javascript:`, `data:` and `file:` which become XSS when rendered as links/sources. */
export const httpUrl = z
  .string()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be an http(s) URL");

export const httpsUrl = httpUrl.refine((v) => v.toLowerCase().startsWith("https://"), "Must use https");
