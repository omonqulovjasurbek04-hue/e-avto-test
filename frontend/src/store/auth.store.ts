import { create } from "zustand";
import type { User } from "../types/user";
import { authService } from "../services/auth.service";
import { storage } from "../utils/storage";
import { env } from "../config/env";
import { ApiError } from "../services/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  loginWithSession: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storage.getUser<User>(),
  isAuthenticated: !!storage.getToken(),
  loading: false,

  init: async () => {
    const token = storage.getToken();
    const user = storage.getUser<User>();
    set({ isAuthenticated: !!(token && user), user: user ?? null });
    if (!token || env.useMock) return;

    // Refresh the user (role, profile) from the server; drop the session if it is no longer valid.
    try {
      const fresh = await authService.getCurrentUser();
      storage.setUser(fresh);
      set({ user: fresh, isAuthenticated: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        storage.removeToken();
        storage.removeUser();
        set({ user: null, isAuthenticated: false });
      }
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { user, token } = await authService.login({ email, password });
      storage.setToken(token);
      storage.setUser(user);
      set({ user, isAuthenticated: true, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  register: async (input) => {
    set({ loading: true });
    try {
      const { user, token } = await authService.register(input);
      storage.setToken(token);
      storage.setUser(user);
      set({ user, isAuthenticated: true, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  loginWithSession: (user, token) => {
    storage.setToken(token);
    storage.setUser(user);
    set({ user, isAuthenticated: true, loading: false });
  },

  logout: () => {
    storage.removeToken();
    storage.removeUser();
    set({ user: null, isAuthenticated: false, loading: false });
  },

  updateUser: (u) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...u };
    storage.setUser(updated);
    set({ user: updated });
  },
}));
