import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui";
import { ShieldAlert, Home } from "lucide-react";

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 dark:bg-red-950/50 text-red-600 mb-4">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        403 — Ruxsat berilmagan
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
        Ushbu sahifaga faqat platforma ma'murlari (Admin) kirish huquqiga ega.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/dashboard">
          <Button variant="primary" leftIcon={<Home className="h-4 w-4" />}>
            Mening kabinetimga o'tish
          </Button>
        </Link>
      </div>
    </div>
  );
};
