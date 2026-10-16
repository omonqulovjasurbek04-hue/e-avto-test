import { apiGet, apiPost, apiPut } from "./api";
import { env } from "../config/env";
import { setAccessToken } from "./session";
import type { AuthResponse, EmailDelivery, LoginPayload, LoginResult, RegisterPayload, TwoFactorStatus, UpdateProfilePayload, User } from "../types/user";

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    if (env.useMock) {
      const { mockUsers } = await import("../data/mockUsers");
      const user = payload.email === "admin@eavto.uz" ? mockUsers[1] : mockUsers[0];
      return { user: { ...user, email: payload.email }, token: "demo-token-" + Date.now() };
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

  /** Telegram login, step 1: returns the bot link to open (the bot then sends a one-time code). */
  async telegramStart(): Promise<{ sessionId: string; botUrl: string; expiresInSeconds: number }> {
    return apiPost("/auth/telegram/start");
  },

  /** Telegram login, step 3: exchange the code from the bot for a session. */
  async telegramVerify(sessionId: string, code: string): Promise<LoginResult> {
    return apiPost<LoginResult>("/auth/telegram/verify", { sessionId, code });
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

  async verifyEmail(token: string): Promise<void> {
    await apiPost<unknown>("/auth/verify-email", { token });
  },

  async resendVerification(): Promise<EmailDelivery & { alreadyVerified: boolean }> {
    if (env.useMock) return { alreadyVerified: false, sent: false, mailConfigured: false };
    return apiPost("/auth/verify-email/resend");
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
