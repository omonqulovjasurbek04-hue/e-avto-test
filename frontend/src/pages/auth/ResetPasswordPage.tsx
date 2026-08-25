import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Card } from "../../components/ui";
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Parol kamida 6 belgidan iborat bo'lishi shart");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Parollar bir xil emas");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Parolingiz muvaffaqiyatli yangilandi!");
      navigate("/login");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Yangi Parol O'rnatish
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Hisobingiz uchun yangi xavfsiz parol kiriting
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Yangi parol"
            type="password"
            placeholder="Kamida 6 belgi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            leftIcon={<Lock className="h-4 w-4" />}
          />

          <Input
            label="Parolni tasdiqlang"
            type="password"
            placeholder="Parolni qayta kiriting"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            leftIcon={<Lock className="h-4 w-4" />}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full font-bold"
            isLoading={isLoading}
          >
            Parolni Saqlash
          </Button>
        </form>
      </Card>

      <div className="text-center">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          <span>Kirishga qaytish</span>
        </Link>
      </div>
    </div>
  );
};
