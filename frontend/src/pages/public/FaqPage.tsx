import React, { useState } from "react";
import { Badge, Card } from "../../components/ui";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "E-Avto Testdagi savollar YHXDX imtihoniga to'g'ri keladimi?",
      a: "Ha, tizimdagi barcha savollar O'zbekiston Respublikasi YHXDX imtihon markazlarining eng so'nggi 2025-yilgi rasmiy bazasi va YHQ qonunchiligi asosida shakllantirilgan.",
    },
    {
      q: "Imtihon testidan o'tish uchun nechta savolga to'g'ri javob berish kerak?",
      a: "Standart 20 talik davlat imtihonida kamida 18 ta (90%) savolga to'g'ri javob berish lozim. Beriladigan vaqt — 20 daqiqa.",
    },
    {
      q: "Xatolarimni qayerdan ko'rishim mumkin?",
      a: "Testni yakunlaganingizdan so'ng darhol 'Xatolar tahlili' tugmasi chiqadi. Unda qaysi savolda adashganingiz, to'g'ri javob va YHQ moddasi bo'yicha batafsil izoh beriladi.",
    },
    {
      q: "Mobil telefonda test ishlash qulaymi?",
      a: "Platformamiz to'liq mobil qurilmalarga moslashtirilgan. Siz xohlagan vaqtda smartfoningizdan qulay foydalanishingiz mumkin.",
    },
    {
      q: "Reyting qanday shakllanadi?",
      a: "O'quvchilar reytingi topshirilgan testlar soni, to'plangan o'rtacha ball va kunlik ketma-ket o'qish (streak) kunlariga asosan har kuni yangilanadi.",
    },
  ];

  return (
    <div className="container-page py-12 max-w-3xl space-y-8">
      <div className="text-center space-y-3">
        <Badge variant="primary">FAQ</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Ko'p Beriladigan Savollar
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Platforma, test topshirish tartibi va darslar bo'yicha barcha javoblar.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <Card
              key={index}
              className="cursor-pointer transition-all border-slate-200 dark:border-slate-800"
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-brand-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {faq.q}
                  </h3>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                )}
              </div>
              {isOpen && (
                <div className="px-5 pb-5 pt-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 mt-2">
                  <div className="pt-3">{faq.a}</div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
