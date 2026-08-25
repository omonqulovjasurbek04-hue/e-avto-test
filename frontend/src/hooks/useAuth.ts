import { useAuthStore } from "../store/auth.store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  return { user, isAuthenticated, isLoading, setAuth, logout };
}
