import React, { useState } from "react";
import { Button, Input, Card, Badge } from "../../components/ui";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const ContactPage: React.FC = () => {
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    toast.success("Xabaringiz muvaffaqiyatli yuborildi!");
  };

  return (
    <div className="container-page py-12 max-w-4xl space-y-10">
      <div className="text-center space-y-3">
        <Badge variant="primary">Qo'llab-quvvatlash</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Biz Bilan Bog'laning
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Savollaringiz, takliflaringiz yoki texnik muammolar bo'lsa bizga yozing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Email</h4>
                <p className="text-xs text-slate-500">support@eavto.uz</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Telefon</h4>
                <p className="text-xs text-slate-500">+998 (71) 200-00-00</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Manzil</h4>
                <p className="text-xs text-slate-500">Toshkent shahri, Amir Temur ko'chasi 100</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-7">
          <Card className="p-6">
            {isSent ? (
              <div className="text-center py-10 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Rahmat! Xabaringiz qabul qilindi.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tez orada mutaxassislarimiz siz bilan bog'lanishadi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Ismingiz" placeholder="Jasurbek" required />
                <Input label="Email manzilingiz" type="email" placeholder="example@mail.uz" required />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Xabaringiz
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Savolingizni batafsil yozing..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full" rightIcon={<Send className="h-4 w-4" />}>
                  Xabarni Yuborish
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
