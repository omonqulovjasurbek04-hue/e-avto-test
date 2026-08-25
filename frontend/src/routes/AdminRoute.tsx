import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to="/403" replace />;
  }

  return children;
};
