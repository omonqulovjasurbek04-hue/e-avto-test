import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { ROUTES } from "@/constants/routes";
import { FullSpinner } from "@/components/ui/Spinner";

/**
 * Where Google sign-in lands. The server has already set the session cookie (or, for 2FA accounts,
 * put the challenge in the URL fragment); this page restores the session and moves on.
 */
export default function GoogleCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next")?.startsWith("/") && !params.get("next")?.startsWith("//") ? params.get("next")! : ROUTES.dashboard;

  useEffect(() => {
    const challenge = new URLSearchParams(window.location.hash.slice(1)).get("challenge");
    if (challenge) {
      // The code step of the login page finishes the sign-in.
      useAuthStore.setState({ twoFactorChallenge: challenge, loading: false });
      navigate(ROUTES.login, { replace: true, state: { from: { pathname: next } } });
      return;
    }
    void (async () => {
      await useAuthStore.getState().init();
      const { isAuthenticated, user } = useAuthStore.getState();
      if (!isAuthenticated) return navigate(`${ROUTES.login}?google=failed`, { replace: true });
      // A new Google account still needs a name, phone number and password (step 2 of sign-up).
      navigate(user?.hasPassword === false ? ROUTES.register : next, { replace: true });
    })();
  }, [navigate, next]);

  return <FullSpinner />;
}
