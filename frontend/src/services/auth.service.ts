import { apiDelete, apiGet, apiPost, apiPut } from "./api";
import { env } from "../config/env";
import { setAccessToken } from "./session";
import type { AuthResponse, LoginPayload, LoginResult, RegisterPayload, TwoFactorStatus, UpdateProfilePayload, User } from "../types/user";

export interface ConnectedDevice {
  /** Login (refresh-token family) id. */
  id: string;
  browser: string;
  os: string;
  type: "mobile" | "tablet" | "desktop";
  ip: string | null;
  signedInAt: string;
  lastActiveAt: string;
  current: boolean;
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    if (env.useMock) {
      const { mockUsers } = await import("../data/mockUsers");
      const user = payload.email === "admin@eavto.uz" ? mockUsers[1] : mockUsers[0];
      return { user: { ...user, ...(payload.email ? { email: payload.email } : {}) }, token: "demo-token-" + Date.now() };
    }
    return apiPost<LoginResult>("/auth/login", payload);
  },

  /** Second login step for accounts with 2FA: a code from the authenticator app or a recovery code. */
  async twoFactorLogin(challengeToken: string, code: string): Promise<AuthResponse> {
    return apiPost<AuthResponse>("/auth/2fa/login", { challengeToken, code });
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    if (env.useMock) {
      const now = new Date().toISOString();
      const user: User = {
        id: "user-" + Date.now(),
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: "USER",
        createdAt: now,
        updatedAt: now,
      };
      return { user, token: "demo-token-" + Date.now() };
    }
    return apiPost<AuthResponse>("/auth/register", payload);
  },

  /** Second sign-up step after the Telegram code: name, phone and password (once). */
  async completeRegistration(payload: { name: string; phone: string; password: string }): Promise<User> {
    return apiPost<User>("/auth/complete-registration", payload);
  },

  /** Telegram login, step 1: the plain bot link (no token); pressing Start there gives a random code. */
  async telegramStart(): Promise<{ botUrl: string; botUsername: string; codeLength: number; expiresInSeconds: number }> {
    return apiPost("/auth/telegram/start");
  },

  /** Telegram login, step 2: the code from the bot finds the Telegram account and opens a session. */
  async telegramVerify(code: string): Promise<LoginResult> {
    return apiPost<LoginResult>("/auth/telegram/verify", { code });
  },

  async getCurrentUser(): Promise<User> {
    if (env.useMock) return (await import("../data/mockUsers")).mockCurrentUserProfile;
    return apiGet<User>("/auth/me");
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    if (env.useMock) return { ...(await import("../data/mockUsers")).mockCurrentUserProfile, ...payload };
    const res = await apiPut<{ user: User }>("/profile", payload);
    return res.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (env.useMock) return;
    const res = await apiPut<{ token: string }>("/auth/password", { currentPassword, newPassword });
    // Other devices were signed out; this one continues with the new token (and the new refresh cookie).
    setAccessToken(res.token);
  },

  async logoutEverywhere(): Promise<void> {
    if (env.useMock) return;
    await apiPost<unknown>("/auth/logout-all");
  },

  /** Signed-in devices of this account, this one first. */
  async devices(): Promise<ConnectedDevice[]> {
    if (env.useMock) return [];
    return apiGet<ConnectedDevice[]>("/auth/devices");
  },

  /** Signs one device out; `current` tells whether it was this one. */
  async signOutDevice(id: string): Promise<{ current: boolean }> {
    return apiDelete<{ current: boolean }>(`/auth/devices/${id}`);
  },

  /** Signs every other device out; this one continues with a fresh access token. */
  async signOutOtherDevices(): Promise<void> {
    const res = await apiPost<{ token: string }>("/auth/devices/sign-out-others");
    setAccessToken(res.token);
  },

  async twoFactorStatus(): Promise<TwoFactorStatus> {
    if (env.useMock) return { available: false, enabled: false, recoveryCodesLeft: 0 };
    return apiGet<TwoFactorStatus>("/auth/2fa");
  },

  async twoFactorSetup(): Promise<{ secret: string; otpauthUrl: string }> {
    return apiPost("/auth/2fa/setup");
  },

  async twoFactorEnable(code: string): Promise<{ recoveryCodes: string[] }> {
    return apiPost("/auth/2fa/enable", { code });
  },

  async twoFactorDisable(password: string | undefined, code: string): Promise<void> {
    await apiPost<unknown>("/auth/2fa/disable", { password, code });
  },

  async twoFactorRecoveryCodes(code: string): Promise<{ recoveryCodes: string[] }> {
    return apiPost("/auth/2fa/recovery-codes", { code });
  },

  async forgotPassword(email: string): Promise<void> {
    if (env.useMock) return;
    await apiPost<unknown>("/auth/forgot-password", { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    if (env.useMock) return;
    await apiPost<unknown>("/auth/reset-password", { token, password });
  },
};
