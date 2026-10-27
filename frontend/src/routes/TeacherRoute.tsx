import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { FullSpinner } from "@/components/ui/Spinner";

// Teachers, and the group managers who run every group (admins, front desk).
const TEACHING_ROLES = ["TEACHER", "MANAGER", "ADMIN", "SUPERADMIN"];

/** UI guard only — every /api/groups and /api/slots call is authorised again on the server. */
export const TeacherRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuthStore();
  const location = useLocation();
  // Wait for the start-up session refresh instead of bouncing a signed-in user to /login.
  if (loading) return <FullSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user || !TEACHING_ROLES.includes(user.role)) return <Navigate to="/403" replace />;
  return children;
};
