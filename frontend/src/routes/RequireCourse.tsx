import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCourseAccess } from "@/hooks/useCourseAccess";
import { FullSpinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/auth.store";
import { can, type Permission } from "@/lib/permissions";

/**
 * Lessons and tests are for students who bought a course. Without any, the student is sent to the
 * course catalogue (with a short explanation) instead of a page full of locks.
 */
export default function RequireCourse({ children, staffPerm }: { children: ReactNode; staffPerm?: Permission }) {
  const { t } = useTranslation();
  const { loaded, hasAnyCourse } = useCourseAccess();
  // Staff with this right use the page for their work (e.g. knowledge control), not as students.
  const role = useAuthStore((s) => s.user?.role);
  const staff = staffPerm !== undefined && can(role, staffPerm);
  const blocked = !staff && loaded && hasAnyCourse === false;

  useEffect(() => {
    if (blocked) toast.info(t("access.buyFirst"), { id: "buy-first" });
  }, [blocked, t]);

  if (staff) return <>{children}</>;
  if (!loaded) return <FullSpinner />;
  if (blocked) return <Navigate to="/my-courses" replace />;
  return <>{children}</>;
}
