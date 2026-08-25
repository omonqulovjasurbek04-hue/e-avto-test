import React from "react";
import { Badge, Card } from "../../components/ui";
import { ShieldCheck, Award, Users, BookOpen, Target, Sparkles } from "lucide-react";

export const AboutPage: React.FC = () => {
  return (
    <div className="container-page py-12 space-y-12 max-w-4xl">
      <div className="text-center space-y-3">
        <Badge variant="primary">Platforma haqida</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          E-Avto Test — Aqlli Haydovchilik Ta'limi
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Bizning asosiy maqsadimiz — O'zbekiston yoshlari va bo'lajak haydovchilariga Yo'l Harakati Qoidalarini mukammal o'rgatish va yo'llarda xavfsiz harakatlanish madaniyatini yuksaltirish.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600">
            <Target className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">100% Aniq Savollar</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            YHXDX imtihon markazlarida tushadigan rasmiy va dolzarb savollar bazasi.
          </p>
        </Card>

        <Card className="p-6 space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Aqlli Tahlil</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Xatolaringizni aniqlab, qaysi mavzularni qayta o'qish kerakligini ko'rsatuvchi tizim.
          </p>
        </Card>

        <Card className="p-6 space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Xavfsiz Haydash</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Faqat quruq yodlash emas, balki real vaziyatlarda to'g'ri qaror qabul qilish ko'nikmasi.
          </p>
        </Card>
      </div>
    </div>
  );
};
