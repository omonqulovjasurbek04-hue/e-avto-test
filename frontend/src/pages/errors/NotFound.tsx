import { Link } from "react-router-dom";
import { Home } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <p className="text-8xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
        Sahifa topilmadi
      </h1>
      <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">
        Siz qidirayotgan sahifa mavjud emas yoki ko‘chirib o‘zgartirilgan bo‘lishi mumkin.
      </p>
      <Link to={ROUTES.home} className="mt-6">
        <Button>
          <Home className="h-4 w-4" />
          Bosh sahifaga qaytish
        </Button>
      </Link>
    </div>
  );
}
