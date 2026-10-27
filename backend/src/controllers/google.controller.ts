import crypto from "crypto";
import { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";
import * as googleService from "../services/google.service";
import { success } from "../utils/apiResponse";
import { REFRESH_COOKIE, readCookie, setRefreshCookie } from "../utils/cookies";
import { userIdFromRefresh } from "../services/session.service";
import * as authService from "../services/auth.service";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";
import { clientInfo } from "../utils/clientInfo";

const STATE_COOKIE = "eavto_gs";
const NEXT_COOKIE = "eavto_gn";
// Set when a signed-in user links Google in Settings: the callback links instead of signing in.
const LINK_COOKIE = "eavto_gl";

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

export const start = async (req: Request, res: Response): Promise<void> => {
  const linking = req.query.link === "1";
  if (!googleService.isGoogleConfigured()) {
    res.redirect(linking ? `${site()}/settings?google=unavailable` : `${site()}/login?google=unavailable`);
    return;
  }
  const state = googleService.newState();
  res.cookie(STATE_COOKIE, state, flowCookie());
  res.cookie(NEXT_COOKIE, safeNext(req.query.next), flowCookie());
  if (linking) {
    // A top-level navigation carries no access token; the session cookie says who is linking.
    const userId = await userIdFromRefresh(readCookie(req, REFRESH_COOKIE));
    if (!userId) {
      res.redirect(`${site()}/login`);
      return;
    }
    res.cookie(LINK_COOKIE, googleService.signLink(userId, state), flowCookie());
  }
  res.redirect(googleService.authorizationUrl(state));
};

/** Google sends the browser back here; it then lands on the site's /auth/google page, signed in or not. */
export const callback = async (req: Request, res: Response): Promise<void> => {
  const expected = readCookie(req, STATE_COOKIE);
  const next = safeNext(readCookie(req, NEXT_COOKIE));
  res.clearCookie(STATE_COOKIE, { ...flowCookie(), maxAge: undefined });
  res.clearCookie(NEXT_COOKIE, { ...flowCookie(), maxAge: undefined });
  const linkCookie = readCookie(req, LINK_COOKIE);
  res.clearCookie(LINK_COOKIE, { ...flowCookie(), maxAge: undefined });
  const back = linkCookie ? "/settings" : "/login";
  const fail = (reason: string) => res.redirect(`${site()}${back}?google=${reason}`);

  const { code, state } = req.query;
  if (req.query.error) return fail("cancelled");
  if (typeof code !== "string" || typeof state !== "string" || !expected || !sameValue(state, expected)) return fail("failed");

  if (linkCookie) {
    const userId = googleService.readLink(linkCookie, state);
    if (!userId) return fail("failed");
    try {
      await googleService.linkGoogle(userId, await googleService.exchangeCode(code));
      res.redirect(`${site()}/settings?google=linked`);
    } catch (e) {
      fail(e instanceof Error && /another user/i.test(e.message) ? "taken" : "failed");
    }
    return;
  }

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
    const message = e instanceof Error ? e.message : "";
    fail(/disabled/i.test(message) ? "disabled" : /turned off/i.test(message) ? "unlinked" : "failed");
  }
};

export const unlink = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await authService.unlinkSignIn(requireUserId(req), "google"));
};
