import { ServerCrash, Home, RefreshCw } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/Button";

export default function ServerError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/10">
        <ServerCrash className="h-8 w-8" />
      </div>
      <p className="mt-4 text-8xl font-extrabold text-red-500">500</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
        Server xatosi
      </h1>
      <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">
        Kutilmagan xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko‘ring.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" onClick={() => location.reload()}>
          <RefreshCw className="h-4 w-4" />
          Qayta urinish
        </Button>
        <a href={ROUTES.home}>
          <Button variant="outline">
            <Home className="h-4 w-4" />
            Bosh sahifa
          </Button>
        </a>
      </div>
    </div>
  );
}
