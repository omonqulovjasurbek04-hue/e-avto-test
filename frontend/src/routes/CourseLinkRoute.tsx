import { Navigate, useParams } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { FullSpinner } from "@/components/ui/Spinner";

/**
 * Old public course address (/courses/:id): the course page lives in the student panel now.
 * A signed-in user goes there; a guest signs up first and then lands on that course.
 */
export default function CourseLinkRoute() {
  const { courseId } = useParams<{ courseId: string }>();
  const { isAuthenticated, loading } = useAuth();
  const panelPath = `/my-courses/${courseId}`;
  // Wait for the stored session check, or a signed-in user would be sent to sign up.
  if (loading) return <FullSpinner />;
  return isAuthenticated ? (
    <Navigate to={panelPath} replace />
  ) : (
    <Navigate to={ROUTES.register} replace state={{ from: { pathname: panelPath } }} />
  );
}
