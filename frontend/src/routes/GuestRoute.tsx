import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";
import { hadSession } from "@/services/session";
import { FullSpinner } from "@/components/ui/Spinner";

/**
 * Pages for guests only (home, login, forgot password). A visitor whose session the server has just
 * confirmed (the start-up refresh through the httpOnly cookie) goes straight to the dashboard, or back
 * to the page that sent them to log in. A Telegram sign-up that still has no password finishes
 * registration first.
 *
 * While the session is being checked, only browsers that had a session wait on a spinner; a new
 * visitor sees the page at once instead of a loader.
 */
export default function GuestRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const from = (useLocation().state as { from?: { pathname?: string } } | null)?.from?.pathname;

  if (loading) return hadSession() ? <FullSpinner /> : <Outlet />;
  if (isAuthenticated) {
    if (user?.hasPassword === false) return <Navigate to={ROUTES.register} replace />;
    return <Navigate to={from || ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
