import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Faq() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);

  const faqs = [
    { q: t("faq.questions.q1.q"), a: t("faq.questions.q1.a") },
    { q: t("faq.questions.q2.q"), a: t("faq.questions.q2.a") },
    { q: t("faq.questions.q3.q"), a: t("faq.questions.q3.a") },
    { q: t("faq.questions.q4.q"), a: t("faq.questions.q4.a") },
    { q: t("faq.questions.q5.q"), a: t("faq.questions.q5.a") },
  ];

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          {t("faq.title")}
        </h1>
        <p className="mt-2 text-slate-500">
          {t("faq.description")}
        </p>

        <div className="mt-8 space-y-3">
          {faqs.map((item, i) => (
            <div
              key={i}
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