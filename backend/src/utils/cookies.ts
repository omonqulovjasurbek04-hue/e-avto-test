import { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";

export const REFRESH_COOKIE = "eavto_rt";
// Only the auth endpoints ever receive the refresh token.
const REFRESH_PATH = "/api/auth";

const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.REFRESH_COOKIE_SECURE,
  sameSite: env.REFRESH_COOKIE_SAMESITE,
  path: REFRESH_PATH,
});

export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000 });
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, baseOptions());
};

/** Minimal Cookie header parser (no dependency needed for the one cookie we read). */
export const readCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
};
