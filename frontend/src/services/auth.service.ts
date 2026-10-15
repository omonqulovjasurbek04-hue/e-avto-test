import { apiGet, apiPost, apiPut } from "./api";
import { env } from "../config/env";
import { storage } from "../utils/storage";
import { AuthResponse, LoginPayload, RegisterPayload, UpdateProfilePayload, User } from "../types/user";

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    if (env.useMock) {
      const { mockUsers } = await import("../data/mockUsers");
      const user = payload.email === "admin@eavto.uz" ? mockUsers[1] : mockUsers[0];
      return { user: { ...user, email: payload.email }, token: "demo-token-" + Date.now() };
    }
    return apiPost<AuthResponse>("/auth/login", payload);
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
  async telegramVerify(sessionId: string, code: string): Promise<AuthResponse> {
    return apiPost<AuthResponse>("/auth/telegram/verify", { sessionId, code });
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
    storage.setToken(res.token);
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
