import { useLocation } from "react-router-dom";
import { siteService } from "@/services/site.service";
import { useLoad } from "@/hooks/useLoad";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import SafeHtml from "@/components/common/SafeHtml";

interface Section {
  title: string;
  body: string;
}

const PRIVACY: Section[] = [
  {
    title: "Qanday ma'lumotlar yig'iladi",
    body: "Ism, email yoki Telegram identifikatori va ismi, telefon (ixtiyoriy), test natijalari, dars progressi. Parollar faqat xeshlangan holatda saqlanadi.",
  },
  {
    title: "Ma'lumotlardan foydalanish",
    body: "Ma'lumotlar hisobingizni yuritish, natijalar va reytingni ko'rsatish hamda xizmat sifatini oshirish uchun ishlatiladi. Ular uchinchi shaxslarga sotilmaydi.",
  },
  {
    title: "Saqlash va o'chirish",
    body: "Ma'lumotlar hisobingiz mavjud ekan saqlanadi. Hisobni o'chirish yoki ma'lumotlarni olish uchun biz bilan bog'laning.",
  },
  {
    title: "Telegram orqali kirish",
    body: "Telegram bilan kirishda bot faqat Telegram identifikatoringiz va ismingizni oladi hamda bir martalik kod yuboradi.",
  },
];

const TERMS: Section[] = [
  {
    title: "Xizmatdan foydalanish",
    body: "Platforma haydovchilik nazariyasiga tayyorlanish uchun mo'ljallangan. Testlar tayyorgarlik vositasi bo'lib, rasmiy imtihon natijasini kafolatlamaydi.",
  },
  {
    title: "Hisob xavfsizligi",
    body: "Hisob ma'lumotlarini maxfiy saqlash va ularni boshqalarga bermaslik sizning mas'uliyatingizda.",
  },
  {
    title: "Taqiqlanadigan harakatlar",
    body: "Testlarni avtomatlashtirish, tizimga ruxsatsiz kirishga urinish va kontentni ruxsatsiz tarqatish taqiqlanadi.",
  },
  {
    title: "O'zgartirishlar",
    body: "Shartlar yangilanishi mumkin; yangilangan nusxa shu sahifada e'lon qilinadi.",
  },
];

export default function Legal() {
  const isPrivacy = useLocation().pathname === "/privacy";
  const sections = isPrivacy ? PRIVACY : TERMS;
  // A published CMS page with slug "privacy" / "terms" replaces the built-in sample text.
  const slug = isPrivacy ? "privacy" : "terms";
  const { data: cms, loading } = useLoad(() => siteService.page(slug).catch(() => null), [slug]);
  useDocumentMeta(cms?.seoTitle || cms?.title, cms?.seoDescription);

  if (loading) return <div className="container-page max-w-3xl py-10" />;
  if (cms) {
    return (
      <div className="container-page max-w-3xl py-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{cms.title}</h1>
        <SafeHtml html={cms.content} className="mt-6 space-y-3 text-slate-700 dark:text-slate-300" />
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        {isPrivacy ? "Maxfiylik siyosati" : "Foydalanish shartlari"}
      </h1>
      <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
        Bu umumiy namuna matn. Ishga tushirishdan oldin uni o'z faoliyatingiz va amaldagi qonunchilikka mos holda
        huquqshunos bilan ko'rib chiqing.
      </p>
      <div className="mt-6 space-y-6">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{s.title}</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
