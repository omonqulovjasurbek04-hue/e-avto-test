import axios from "axios";
import { env } from "../config/env";
import type { User } from "../types/user";

/**
 * The access token lives only in memory (never in localStorage), so an XSS payload cannot read a
 * long-lived credential from storage. The session survives reloads through the httpOnly refresh
 * cookie, which JavaScript cannot read at all.
 */
let accessToken: string | null = null;
let inFlight: Promise<{ user: User; token: string } | null> | null = null;

// Non-secret hint ("this browser had a session"), so guests do not fire a refresh request on every visit.
const HINT_KEY = "e_avto_session";
// Left by older versions that kept the JWT in localStorage; removed on start.
const LEGACY_KEYS = ["e_avto_token", "e_avto_user"];

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  try {
    if (token) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {
    // storage unavailable (private mode): the session still works for this tab
  }
};

export const hadSession = (): boolean => {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
};

/** Plain axios (no interceptors): a failing refresh must not trigger another refresh. */
const raw = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
});

const doRefresh = async (): Promise<{ user: User; token: string } | null> => {
  try {
    const res = await raw.post<{ data: { user: User; token: string } }>("/auth/refresh");
    setAccessToken(res.data.data.token);
    return res.data.data;
  } catch {
    setAccessToken(null);
    return null;
  }
};

/**
 * Exchanges the refresh cookie for a new access token. Calls are shared within the tab, and across
 * tabs they are serialised with a Web Lock: two tabs presenting the same (single-use) refresh token
 * would otherwise look like token theft and end the session.
 */
type Refreshed = { user: User; token: string } | null;

export const refreshSession = (): Promise<Refreshed> => {
  if (!inFlight) {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    const run: Promise<Refreshed> = locks ? locks.request("e-avto-refresh", () => doRefresh()).then((r) => r) : doRefresh();
    const shared = run.finally(() => {
      inFlight = null;
    });
    inFlight = shared;
    return shared;
  }
  return inFlight;
};

/** A refresh started at app start-up; API calls wait for it so they are sent with the token. */
export const pendingRefresh = () => inFlight;

export const endSession = async () => {
  setAccessToken(null);
  try {
    await raw.post("/auth/logout");
  } catch {
    // Offline: this tab forgets the session; the server-side token stays valid until it expires ("log out everywhere" ends it).
  }
};
