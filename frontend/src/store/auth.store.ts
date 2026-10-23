import { create } from "zustand";
import type { AuthResponse, LoginResult, User } from "../types/user";
import { authService } from "../services/auth.service";
import { env } from "../config/env";
import { setSessionLostHandler } from "../services/api";
import { endSession, refreshSession, setAccessToken } from "../services/session";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** True until the start-up session check has finished (route guards wait for it). */
  loading: boolean;
  /** Set when the password (or Telegram) step succeeded and the account needs a 2FA code. */
  twoFactorChallenge: string | null;
  init: () => Promise<void>;
  /** `login` is a phone number, or an e-mail address (contains "@"). */
  login: (login: string, password: string) => Promise<LoginResult>;
  completeTwoFactor: (code: string) => Promise<void>;
  cancelTwoFactor: () => void;
  register: (input: { name: string; phone: string; email?: string; password: string }) => Promise<AuthResponse>;
  /** Applies the result of any login method: a session, or the 2FA step. */
  applyLoginResult: (result: LoginResult) => void;
  logout: () => Promise<void>;
  updateUser: (u: Partial<User>) => void;
}

const isSession = (r: LoginResult): r is AuthResponse => "token" in r && Boolean((r as AuthResponse).token);

// Demo mode keeps its fake session in sessionStorage (there is no server to refresh against).
const MOCK_KEY = "e_avto_mock_user";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  twoFactorChallenge: null,

  init: async () => {
    if (env.useMock) {
      const cached = sessionStorage.getItem(MOCK_KEY);
      const user = cached ? (JSON.parse(cached) as User) : null;
      set({ user, isAuthenticated: !!user, loading: false });
      return;
    }
    setSessionLostHandler(() => set({ user: null, isAuthenticated: false }));
    // Always try the httpOnly refresh cookie on startup. The local-storage hint is only a UI hint;
    // it may be absent or unavailable even while the browser still has a valid refresh cookie.
    const session = await refreshSession();
    set({ user: session?.user ?? null, isAuthenticated: !!session, loading: false });
  },

  applyLoginResult: (result) => {
    if (!isSession(result)) {
      set({ twoFactorChallenge: result.challengeToken, loading: false });
      return;
    }
    if (env.useMock) sessionStorage.setItem(MOCK_KEY, JSON.stringify(result.user));
    else setAccessToken(result.token);
    set({ user: result.user, isAuthenticated: true, loading: false, twoFactorChallenge: null });
  },

  login: async (login, password) => {
    const id = login.trim();
    const result = await authService.login(id.includes("@") ? { email: id, password } : { phone: id, password });
    get().applyLoginResult(result);
    return result;
  },

  completeTwoFactor: async (code) => {
    const challenge = get().twoFactorChallenge;
    if (!challenge) throw new Error("No sign-in in progress");
    try {
      get().applyLoginResult(await authService.twoFactorLogin(challenge, code));
    } catch (e) {
      // An expired challenge cannot be retried; the user starts again with the password.
      if (e instanceof Error && "status" in e && (e as { status?: number }).status === 401 && /expired/i.test(e.message)) {
        set({ twoFactorChallenge: null });
      }
      throw e;
    }
  },

  cancelTwoFactor: () => set({ twoFactorChallenge: null }),

  register: async (input) => {
    const result = await authService.register(input);
    get().applyLoginResult(result);
    return result;
  },

  logout: async () => {
    // The next person on this browser must not inherit an unfinished test.
    sessionStorage.removeItem("ea_active_test");
    sessionStorage.removeItem(MOCK_KEY);
    set({ user: null, isAuthenticated: false, loading: false, twoFactorChallenge: null });
    if (!env.useMock) await endSession();
  },

  updateUser: (u) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...u } });
  },
}));
