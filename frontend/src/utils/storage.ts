// Auth tokens are deliberately NOT stored here (see services/session.ts).
const THEME_KEY = "e_avto_theme";

export const storage = {
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
