import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "E-Avto Test nima uchun kerak?",
    a: "Haydovchilik imtihoniga tayyorgarlik ko'rish va bilimlarni sinash uchun mo'ljallangan platforma.",
  },
  {
    q: "Kurslar bepulmi?",
    a: "Ro'yxatdan o'tish va ko'pgina kurslar bepul. Ba'zi maxsus materiallar alohida ochilishi mumkin.",
  },
  {
    q: "Mobil qurilmada ishlaydimi?",
    a: "Ha, sayt barcha zamonaviy qurilmalarda to'liq ishlaydi va responsive dizaynga ega.",
  },
  {
    q: "Test natijalarim saqlanadimi?",
    a: "Ha, hisobingizga kirgan holda natijalaringiz profilda saqlanadi va kuzatib boriladi.",
  },
  {
    q: "Imtihon qanchalik haqiqiy testlarga o'xshaydi?",
    a: "Testlar haqiqiy haydovchilik imtihoni formatiga imkon qadar yaqin tarzda tayyorlangan.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          Tez-tez so'raladigan savollar
        </h1>
        <p className="mt-2 text-slate-500">
          Sizni qiziqtirgan savollarga javoblar quyida keltirilgan.
        </p>

        <div className="mt-8 space-y-3">
          {faqs.map((item, i) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-800 dark:text-slate-100"
              >
                {item.q}
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <p className="px-5 pb-5 text-sm text-slate-500">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
