import { Link } from "react-router-dom";
import { ShieldAlert, Home, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/Button";

export default function Forbidden() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/10">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <p className="mt-4 text-8xl font-extrabold text-amber-500">403</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
        {t("errors.forbidden.title")}
      </h1>
      <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">
        {t("errors.forbidden.description")}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to={ROUTES.dashboard}>
          <Button variant="primary">
            <LayoutDashboard className="h-4 w-4" />
            {t("nav.dashboard")}
          </Button>
        </Link>
        <Link to={ROUTES.home}>
          <Button variant="outline">
            <Home className="h-4 w-4" />
            {t("errors.forbidden.backHome")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
