import crypto from "crypto";
import { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";
import * as googleService from "../services/google.service";
import { success } from "../utils/apiResponse";
import { readCookie, setRefreshCookie } from "../utils/cookies";
import { clientInfo } from "../utils/clientInfo";

const STATE_COOKIE = "eavto_gs";
const NEXT_COOKIE = "eavto_gn";

// Lax, not Strict: the callback is a top-level navigation coming back from Google.
const flowCookie = (): CookieOptions => ({
  httpOnly: true,
  secure: env.REFRESH_COOKIE_SECURE,
  sameSite: "lax",
  path: "/api/auth/google",
  maxAge: 10 * 60 * 1000,
});

const site = () => env.CLIENT_URL.split(",")[0].trim();
// Only a path on this site (no "//host" or "https://…"): the sign-in must not end on someone else's page.
const safeNext = (value: unknown) => (typeof value === "string" && /^\/(?!\/)[\w\-/?=&%.]*$/.test(value) ? value : "/dashboard");

const sameValue = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Whether the "Continue with Google" button should be shown. */
export const config = (_req: Request, res: Response): void => {
  success(res, { enabled: googleService.isGoogleConfigured() });
};

export const start = (req: Request, res: Response): void => {
  if (!googleService.isGoogleConfigured()) {
    res.redirect(`${site()}/login?google=unavailable`);
    return;
  }
  const state = googleService.newState();
  res.cookie(STATE_COOKIE, state, flowCookie());
  res.cookie(NEXT_COOKIE, safeNext(req.query.next), flowCookie());
  res.redirect(googleService.authorizationUrl(state));
};

/** Google sends the browser back here; it then lands on the site's /auth/google page, signed in or not. */
export const callback = async (req: Request, res: Response): Promise<void> => {
  const expected = readCookie(req, STATE_COOKIE);
  const next = safeNext(readCookie(req, NEXT_COOKIE));
  res.clearCookie(STATE_COOKIE, { ...flowCookie(), maxAge: undefined });
  res.clearCookie(NEXT_COOKIE, { ...flowCookie(), maxAge: undefined });
  const fail = (reason: string) => res.redirect(`${site()}/login?google=${reason}`);

  const { code, state } = req.query;
  if (req.query.error) return fail("cancelled");
  if (typeof code !== "string" || typeof state !== "string" || !expected || !sameValue(state, expected)) return fail("failed");

  try {
    const outcome = await googleService.googleLogin(await googleService.exchangeCode(code), clientInfo(req));
    if (outcome.kind === "2fa") {
      // The challenge travels in the fragment, which never reaches a server or a log.
      res.redirect(`${site()}/auth/google?next=${encodeURIComponent(next)}#challenge=${outcome.challengeToken}`);
      return;
    }
    setRefreshCookie(res, outcome.session.refreshToken);
    res.redirect(`${site()}/auth/google?next=${encodeURIComponent(next)}`);
  } catch (e) {
    fail(e instanceof Error && /disabled/i.test(e.message) ? "disabled" : "failed");
  }
};
