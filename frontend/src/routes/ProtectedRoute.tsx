import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
