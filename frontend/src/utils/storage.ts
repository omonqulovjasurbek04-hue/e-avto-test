const TOKEN_KEY = "e_avto_token";
const USER_KEY = "e_avto_user";
const THEME_KEY = "e_avto_theme";

export const storage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error("Failed to store token", e);
    }
  },
  removeToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error("Failed to remove token", e);
    }
  },

  getUser: <T>(): T | null => {
    try {
      const item = localStorage.getItem(USER_KEY);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  setUser: <T>(user: T): void => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Failed to store user", e);
    }
  },
  removeUser: (): void => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error("Failed to remove user", e);
    }
  },

  getTheme: (): "light" | "dark" => {
    try {
      return (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  },
  setTheme: (theme: "light" | "dark"): void => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.error("Failed to store theme", e);
    }
  },
};
