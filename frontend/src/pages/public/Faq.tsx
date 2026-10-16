import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { siteService } from "@/services/site.service";
import { useLoad } from "@/hooks/useLoad";
import SafeHtml from "@/components/common/SafeHtml";

export default function Faq() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);
  const { data: cms } = useLoad(() => siteService.faq(), [i18n.language]);

  // Questions managed in the admin panel win; the built-in set is only a fallback while the CMS list is empty.
  const builtIn = [1, 2, 3, 4, 5].map((n) => ({ id: `b${n}`, q: t(`faq.questions.q${n}.q`), a: t(`faq.questions.q${n}.a`), html: false }));
  const faqs = cms && cms.length > 0 ? cms.map((f) => ({ id: f.id, q: f.question, a: f.answer, html: true })) : builtIn;

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("faq.title")}</h1>
        <p className="mt-2 text-slate-500">{t("faq.description")}</p>

        <div className="mt-8 space-y-3">
          {faqs.map((item, i) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-800 dark:text-slate-100"
              >
                {item.q}
                <ChevronDown className={`h-5 w-5 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm text-slate-500">
                  {item.html ? <SafeHtml html={item.a} className="space-y-2" /> : <p>{item.a}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
