import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";
import { FullSpinner } from "@/components/ui/Spinner";

export default function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <FullSpinner />;
  // Remember where the guest was going, so the login brings them back there.
  if (!isAuthenticated) return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  // A Telegram sign-up that stopped before the phone/password step has to finish it first.
  if (user?.hasPassword === false) return <Navigate to={ROUTES.register} replace />;

  return <Outlet />;
}
