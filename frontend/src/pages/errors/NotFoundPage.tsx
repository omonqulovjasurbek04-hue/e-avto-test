import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui";
import { Home, ArrowLeft } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <span className="text-8xl font-black text-brand-600 dark:text-brand-400">404</span>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        Sahifa topilmadi
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
        Siz qidirayotgan sahifa o'chirilgan, nomi o'zgartirilgan yoki vaqtincha mavjud emas.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/">
          <Button variant="primary" leftIcon={<Home className="h-4 w-4" />}>
            Bosh sahifaga qaytish
          </Button>
        </Link>
      </div>
    </div>
  );
};
