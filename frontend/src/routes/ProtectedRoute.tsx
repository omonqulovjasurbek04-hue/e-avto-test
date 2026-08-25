import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";
import { FullSpinner } from "@/components/ui/Spinner";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullSpinner />;
  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />;

  return <Outlet />;
}
