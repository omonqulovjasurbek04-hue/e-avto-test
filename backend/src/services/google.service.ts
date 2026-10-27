import crypto from "crypto";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { HttpError, badRequest, conflict } from "../utils/errors";
import { completeLogin } from "./auth.service";
import type { ClientInfo } from "./session.service";

/**
 * "Continue with Google" (OAuth 2.0 authorization-code flow, no Google script on the page):
 * /api/auth/google/start sends the browser to Google, Google sends it back to /api/auth/google/callback
 * with a one-time code, the server trades the code for the user's verified e-mail and signs them in.
 */
export const isGoogleConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

/** Where Google returns the browser: the site's own /api (first-party cookies), unless set explicitly. */
export const redirectUri = () => env.GOOGLE_REDIRECT_URI || `${env.CLIENT_URL.split(",")[0].trim()}/api/auth/google/callback`;

/** Random value tying the callback to the browser that started the sign-in (kept in a short-lived cookie). */
export const newState = () => crypto.randomBytes(24).toString("base64url");

export const authorizationUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params}`;
};

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Trades the one-time code for the ID token. The token comes straight from Google over TLS in this
 * server-to-server call, so its claims are checked but its signature need not be (OpenID Connect 3.1.3.7).
 */
export const exchangeCode = async (code: string): Promise<GoogleProfile> => {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw badRequest("Google sign-in failed");
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  const payload = idToken?.split(".")[1];
  if (!payload) throw badRequest("Google sign-in failed");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;

  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    !ISSUERS.has(String(claims.iss)) ||
    !audience.includes(env.GOOGLE_CLIENT_ID) ||
    typeof claims.exp !== "number" ||
    claims.exp * 1000 < Date.now() ||
    typeof claims.sub !== "string" ||
    typeof claims.email !== "string" ||
    claims.email_verified !== true
  ) {
    throw badRequest("Google account could not be verified");
  }
  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : claims.email.split("@")[0],
    picture: typeof claims.picture === "string" ? claims.picture : undefined,
  };
};

/**
 * The account for this Google user: the one already linked, else the one with the same (Google-verified)
 * e-mail, which gets linked, else a new one. A new account still has to finish sign-up (name, phone,
 * password) like a Telegram one; its e-mail counts as verified.
 */
export const googleLogin = async (profile: GoogleProfile, client?: ClientInfo) => {
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (user) {
    // Keep the shown address current (the user may have renamed the Google account).
    if (user.googleEmail !== profile.email) user = await prisma.user.update({ where: { id: user.id }, data: { googleEmail: profile.email } });
  } else {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    // The owner turned Google sign-in off: it does not come back through the e-mail; they link again in Settings.
    if (byEmail?.googleUnlinkedAt) throw conflict("Google sign-in is turned off for this account");
    user = byEmail
      ? await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: profile.sub, googleEmail: profile.email, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(), avatarUrl: byEmail.avatarUrl ?? profile.picture },
        })
      : await prisma.user.create({
          data: {
            googleId: profile.sub,
            googleEmail: profile.email,
            email: profile.email,
            emailVerifiedAt: new Date(),
            name: profile.name.slice(0, 100),
            avatarUrl: profile.picture,
            role: "USER", // never elevated through Google
          },
        });
  }
  if (!user.isActive) throw new HttpError(403, "Account is disabled");
  return completeLogin(user, client);
};

/** Links this Google account to a user who is already signed in (Settings -> linked accounts). */
export const linkGoogle = async (userId: string, profile: GoogleProfile) => {
  const owner = await prisma.user.findUnique({ where: { googleId: profile.sub }, select: { id: true } });
  if (owner && owner.id !== userId) throw conflict("This Google account is linked to another user");
  await prisma.user.update({ where: { id: userId }, data: { googleId: profile.sub, googleEmail: profile.email, googleUnlinkedAt: null } });
};

/** Ties a link request to the browser's sign-in trip: the user id plus an HMAC over it and the state. */
export const signLink = (userId: string, state: string) =>
  `${userId}.${crypto.createHmac("sha256", env.JWT_SECRET).update(`google-link:${state}:${userId}`).digest("base64url")}`;

export const readLink = (value: string | undefined, state: string): string | null => {
  const userId = value?.split(".")[0];
  if (!userId || !value) return null;
  const expected = signLink(userId, state);
  return value.length === expected.length && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected)) ? userId : null;
};
