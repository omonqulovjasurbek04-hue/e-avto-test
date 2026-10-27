import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { hadSession } from "@/services/session";
import { FullSpinner } from "@/components/ui/Spinner";
import { MainLayout } from "@/layouts/MainLayout";
import { StudentLayout } from "@/layouts/StudentLayout";

/** A finished sign-up: the app with its side menu. Guests (and unfinished Telegram sign-ups): the public site. */
const useInApp = () => {
  const { isAuthenticated, loading, user } = useAuth();
  return { loading, inApp: isAuthenticated && user?.hasPassword !== false };
};

/**
 * Layout of the public pages (about, FAQ, news, legal …). A signed-in user never drops out of the app
 * into the public top menu and footer: the same page opens inside the app's side menu.
 */
export function SiteLayout() {
  const { loading, inApp } = useInApp();
  // A browser that had a session waits for the check instead of flashing the public menu.
  if (loading && hadSession()) return <FullSpinner />;
  return inApp ? <StudentLayout /> : <MainLayout />;
}

/** A public page that has its own place in the app (/courses → /my-courses): signed-in users go there. */
export function PanelRedirect({ to }: { to: string }) {
  const { loading, inApp } = useInApp();
  if (loading && hadSession()) return <FullSpinner />;
  return inApp ? <Navigate to={to} replace /> : <Outlet />;
}
