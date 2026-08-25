import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "../../store/auth.store";
import { authService } from "../../services/auth.service";
import { Button, Input, Card } from "../../components/ui";
import { User as UserIcon, Mail, Lock, Phone, UserPlus } from "lucide-react";
import { toast } from "sonner";

const registerSchema = z
  .object({
    name: z.string().min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak"),
    email: z.string().email("To'g'ri email manzil kiriting"),
    phone: z.string().optional(),
    password: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lishi kerak"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parollar bir xil emas",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const res = await authService.register({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
      setAuth(res.user, res.token);
      toast.success("Ro'yxatdan muvaffaqiyatli o'tdingiz!");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Yangi Hisob Ochish
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          E-Avto Test oilasiga qo'shiling va ta'limni boshlang
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Ism va Familiyangiz"
            placeholder="Jasurbek Omonqulov"
            leftIcon={<UserIcon className="h-4 w-4" />}
            error={errors.name?.message}
            {...register("name")}
          />

          <Input
            label="Email manzil"
            type="email"
            placeholder="jasur@mail.uz"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Telefon raqam (ixtiyoriy)"
            placeholder="+998 90 123 45 67"
            leftIcon={<Phone className="h-4 w-4" />}
            error={errors.phone?.message}
            {...register("phone")}
          />

          <Input
            label="Parol"
            type="password"
            placeholder="Kamida 6 belgi"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register("password")}
          />

          <Input
            label="Parolni tasdiqlang"
            type="password"
            placeholder="Parolni qayta kiriting"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full font-bold"
            isLoading={isLoading}
            rightIcon={<UserPlus className="h-4 w-4" />}
          >
            Ro'yxatdan o'tish
          </Button>
        </form>
      </Card>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        Allaqachon hisobingiz bormi?{" "}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          Kirish
        </Link>
      </div>
    </div>
  );
};
