import React, { useEffect } from "react";
import { AppRoutes } from "./routes/AppRoutes";
import { useAuthStore } from "./store/auth.store";

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AppRoutes />
    </div>
  );
};

export default App;
