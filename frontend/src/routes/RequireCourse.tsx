import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCourseAccess } from "@/hooks/useCourseAccess";
import { FullSpinner } from "@/components/ui/Spinner";

/**
 * Lessons and tests are for students who bought a course. Without any, the student is sent to the
 * course catalogue (with a short explanation) instead of a page full of locks.
 */
export default function RequireCourse({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { loaded, hasAnyCourse } = useCourseAccess();
  const blocked = loaded && hasAnyCourse === false;

  useEffect(() => {
    if (blocked) toast.info(t("access.buyFirst"), { id: "buy-first" });
  }, [blocked, t]);

  if (!loaded) return <FullSpinner />;
  if (blocked) return <Navigate to="/my-courses" replace />;
  return <>{children}</>;
}
