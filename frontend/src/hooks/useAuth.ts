import { useAuthStore } from "../store/auth.store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const init = useAuthStore((s) => s.init);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const loginWithSession = useAuthStore((s) => s.loginWithSession);
  const updateUser = useAuthStore((s) => s.updateUser);

  return {
    user,
    isAuthenticated,
    loading,
    init,
    login,
    register,
    logout,
    loginWithSession,
    updateUser,
  };
}
