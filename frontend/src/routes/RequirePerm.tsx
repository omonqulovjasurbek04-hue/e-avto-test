import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { can, type Permission } from "../lib/permissions";

/** UI guard for one staff page. The API enforces the same rule independently. */
export const RequirePerm: React.FC<{ perm: Permission; children: React.ReactElement }> = ({ perm, children }) => {
  const role = useAuthStore((s) => s.user?.role);
  return can(role, perm) ? children : <Navigate to="/403" replace />;
};
