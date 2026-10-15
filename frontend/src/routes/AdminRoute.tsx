import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { can, type Permission } from "../lib/permissions";

/** Back-office shell: any staff role with admin access. Individual pages narrow it with <RequirePerm>. */
export const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!can(user?.role, "admin:access")) {
    return <Navigate to="/403" replace />;
  }
  return children;
};

/** UI guard for one admin page. The API enforces the same rule independently. */
export const RequirePerm: React.FC<{ perm: Permission; children: React.ReactElement }> = ({ perm, children }) => {
  const role = useAuthStore((s) => s.user?.role);
  return can(role, perm) ? children : <Navigate to="/403" replace />;
};
