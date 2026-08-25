import { create } from "zustand";
import { User } from "../types/user";
import { storage } from "../utils/storage";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storage.getUser<User>(),
  token: storage.getToken(),
  isAuthenticated: !!storage.getToken(),
  isLoading: false,

  setAuth: (user, token) => {
    storage.setToken(token);
    storage.setUser(user);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  updateUser: (updatedFields) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, ...updatedFields };
    storage.setUser(updated);
    set({ user: updated });
  },

  logout: () => {
    storage.removeToken();
    storage.removeUser();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  initAuth: () => {
    const token = storage.getToken();
    const user = storage.getUser<User>();
    if (token && user) {
      set({ token, user, isAuthenticated: true });
    } else {
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
