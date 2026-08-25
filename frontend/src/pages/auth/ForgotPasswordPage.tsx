import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input, Card } from "../../components/ui";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitted(true);
    toast.success("Parolni tiklash havolasi emailingizga yuborildi!");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Parolni Tiklash
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Email manzilingizni kiriting, biz sizga tiklash havolasini yuboramiz
        </p>
      </div>

      <Card className="p-6">
        {isSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Havola yuborildi!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">{email}</strong> manziliga parolni yangilash bo'yicha ko'rsatma yuborildi.
            </p>
            <Link to="/login">
              <Button variant="primary" size="sm" className="mt-2">
                Kirish sahifasiga qaytish
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email manzilingiz"
              type="email"
              placeholder="student@eavto.uz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="h-4 w-4" />}
            />

            <Button type="submit" variant="primary" className="w-full font-bold">
              Tiklash havolasini yuborish
            </Button>
          </form>
        )}
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
