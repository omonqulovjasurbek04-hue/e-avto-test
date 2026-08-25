import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "../../store/auth.store";
import { authService } from "../../services/auth.service";
import { Button, Input, Card, Badge } from "../../components/ui";
import { Mail, Lock, LogIn, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Yaroqli email kiriting"),
  password: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lishi kerak"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "student@eavto.uz",
      password: "password123",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await authService.login(values);
      setAuth(res.user, res.token);
      toast.success(`Xush kelibsiz, ${res.user.name}!`);
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Kirishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoAccount = (role: "student" | "admin") => {
    if (role === "admin") {
      setValue("email", "admin@eavto.uz");
      setValue("password", "admin123");
    } else {
      setValue("email", "student@eavto.uz");
      setValue("password", "password123");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Tizimga Kirish
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Shaxsiy kabinetingizga kiring va test ishlashni davom ettiring
        </p>
      </div>

      {/* Demo Credentials Quick Switch */}
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
          Tezkor demo login:
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDemoAccount("student")}
            className="text-[11px] font-bold px-2 py-1 rounded bg-brand-50 text-brand-600 border border-brand-200 dark:bg-brand-950 dark:text-brand-300"
          >
            Talaba
          </button>
          <button
            type="button"
            onClick={() => setDemoAccount("admin")}
            className="text-[11px] font-bold px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950 dark:text-amber-300"
          >
            Admin
          </button>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email manzil"
            type="email"
            placeholder="student@eavto.uz"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Parol"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
              <input type="checkbox" className="rounded text-brand-600" defaultChecked />
              <span>Eslab qolish</span>
            </label>
            <Link to="/forgot-password" className="font-medium text-brand-600 hover:underline">
              Parolni unutdingizmi?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full font-bold"
            isLoading={isLoading}
            rightIcon={<LogIn className="h-4 w-4" />}
          >
            Kirish
          </Button>
        </form>
      </Card>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        Hisobingiz yo'qmi?{" "}
        <Link to="/register" className="font-bold text-brand-600 hover:underline">
          Ro'yxatdan o'ting
        </Link>
      </div>
    </div>
  );
};
