import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Full course catalogue (licence categories, practical and extra courses). Run after courses.ts:
 *   npx tsx prisma/content/catalog.ts
 * Idempotent, deletes nothing; courses are matched by slug. Lessons here are the programme outline
 * (title + one-line description); full lesson texts, prices (packages) and photos are added by the admin.
 * DE and B→C stay drafts (isPublished=false) until the school has the programme and permits.
 * Prices are project tariffs based on published prices of Uzbek driving schools (Turon, ELITA, Grand
 * Chag'aniyon, 2026) — not confirmed by a school, so they are stored with isSample=true ("namuna").
 */
const prisma = new PrismaClient();

const categories = [
  { slug: "avtobus", order: 4, name: "Avtobuslar", description: "D toifa: yo'lovchi tashish", translations: { uz_cyrl: { name: "Автобуслар", description: "D тоифа: йўловчи ташиш" }, ru: { name: "Автобусы", description: "Категория D: перевозка пассажиров" } } },
  { slug: "tirkamali", order: 5, name: "Tirkamali transport", description: "BE, CE, DE toifalari", translations: { uz_cyrl: { name: "Тиркамали транспорт", description: "BE, CE, DE тоифалари" }, ru: { name: "Транспорт с прицепом", description: "Категории BE, CE, DE" } } },
  { slug: "amaliyot", order: 6, name: "Amaliy mashg'ulotlar", description: "Avtodrom, shahar, parkovka, individual darslar", translations: { uz_cyrl: { name: "Амалий машғулотлар", description: "Автодром, шаҳар, парковка, индивидуал дарслар" }, ru: { name: "Практические занятия", description: "Автодром, город, парковка, индивидуальные занятия" } } },
  { slug: "nazariya", order: 7, name: "Nazariya va imtihon", description: "YHQ, avtomobil tuzilishi, imtihonga tayyorgarlik", translations: { uz_cyrl: { name: "Назария ва имтиҳон", description: "ЙҲҚ, автомобиль тузилиши, имтиҳонга тайёргарлик" }, ru: { name: "Теория и экзамен", description: "ПДД, устройство автомобиля, подготовка к экзамену" } } },
];

type Outline = [title: string, description: string];
interface CourseDef {
  slug: string;
  /** Existing course to adopt (title prefix), instead of creating a new one. */
  adopt?: string;
  title: string;
  category: string;
  level: string;
  order: number;
  published: boolean;
  description: string;
  outline?: Outline[];
  section: "MAIN" | "COMBINED" | "EXTRA";
  /** Unsplash photo id (free Unsplash licence, commercial use allowed); used only when the course has no picture yet. */
  photo?: string;
  /** Learning period shown on the card, e.g. "2–2,5 oy". */
  studyPeriod?: string;
  /** Packages with prices in so'm. Project tariffs from published market prices: stored as samples (isSample). */
  packages?: { name: string; description: string; days: number; price: number }[];
}

const catalog: CourseDef[] = [
  // ── Main licence categories (launch order from the catalogue plan) ──
  { slug: "b-toifa", adopt: "B toifa", photo: "1722088386429-3c5a5afa77e5", title: "B toifa — yengil avtomobil", category: "yengil-avtomobil", level: "Boshlang'ich", order: 1, published: true, section: "MAIN", studyPeriod: "2–2,5 oy", packages: [{ name: "Standart", description: "Nazariya, amaliyot va ichki sinov", days: 90, price: 5900000 }],
    description: "Birinchi marta haydovchilik guvohnomasini olishga tayyorlanayotganlar uchun: yo'l harakati qoidalari va belgilar, avtomobil boshqaruvi, mexanik yoki avtomatik uzatmalar qutisi, avtodrom va shahar amaliyoti, parkovka, nazariy va amaliy imtihonga tayyorgarlik." },
  { slug: "yhq-nazariya", photo: "1573846764373-39f57aaeda0a", title: "Yo'l harakati qoidalari — nazariy kurs", category: "nazariya", level: "Boshlang'ich", order: 11, published: true, section: "EXTRA", studyPeriod: "1–2 hafta", packages: [{ name: "Ekspress — 1 hafta", description: "Nazariy ekspress-kurs", days: 30, price: 700000 }, { name: "Ekspress — 2 hafta", description: "Nazariy ekspress-kurs", days: 45, price: 900000 }],
    description: "Yo'l belgilari, chorrahalar, ustunlik qoidalari, svetofor, to'xtash va to'xtab turish, xavfsiz masofa hamda imtihon savollari bo'yicha to'liq nazariy tayyorgarlik.",
    outline: [
      ["Yo'l belgilari va chiziqlari", "Belgilar guruhlari, ularning ma'nosi va yo'l chiziqlari bilan birga ishlashi."],
      ["Chorrahalar va ustunlik qoidalari", "Tartibga solingan va tartibga solinmagan chorrahalar, \"o'ng qo'l\" qoidasi."],
      ["Svetofor va tartibga soluvchi ishoralari", "Signallarning ma'nosi va ularning ustuvorlik tartibi."],
      ["To'xtash va to'xtab turish", "Qayerda to'xtash mumkin va qayerda taqiqlanadi."],
      ["Xavfsiz masofa va tezlik", "Oraliq masofani tanlash, tezlikni yo'l sharoitiga moslash."],
      ["Imtihon savollari tahlili", "Tipik savollar va ko'p uchraydigan xatolar."],
    ] },
  { slug: "avtodrom", photo: "1706946140241-5a2587ba9c77", title: "Avtodromda amaliy tayyorgarlik", category: "amaliyot", level: "Boshlang'ich", order: 12, published: true, section: "EXTRA", packages: [{ name: "Boshlang'ich paket", description: "Avtodromga tayyorgarlik", days: 60, price: 2000000 }],
    description: "Avtomobilni joyidan qo'zg'atish, to'xtash, orqaga yurish, parkovka, konuslar orasidan yurish va belgilangan maydonda manevr qilish.",
    outline: [
      ["Joyidan qo'zg'alish va to'xtash", "Ravon start, to'xtash chizig'ida aniq to'xtash."],
      ["Orqaga yurish", "Ko'zgulardan foydalanib to'g'ri chiziq va burilish bilan orqaga yurish."],
      ["Konuslar orasidan yurish (ilon izi)", "Past tezlikda rulni boshqarish va gabaritni his qilish."],
      ["Qiyalikda harakatni boshlash", "Orqaga sirpanmasdan qiyalikdan qo'zg'alish."],
      ["Avtodrom imtihon mashqlari", "Imtihondagi mashqlarni ketma-ket bajarish."],
    ] },
  { slug: "shahar-haydash", photo: "1579653384681-c3ba17c4a8c9", title: "Shahar ichida haydash", category: "amaliyot", level: "O'rta", order: 13, published: true, section: "EXTRA", studyPeriod: "5 mashg'ulot", packages: [{ name: "5 mashg'ulot", description: "Instruktor bilan shahar ko'chalarida haydash", days: 30, price: 280000 }],
    description: "Tirbandlikda harakatlanish, chorrahalardan o'tish, qatorni almashtirish, burilish, piyodalarga yo'l berish va xavfsiz to'xtash.",
    outline: [
      ["Tirbandlikda harakatlanish", "Masofa saqlash, ravon tezlanish va tormozlash."],
      ["Chorrahalardan o'tish", "Svetofor va belgilar bo'yicha to'g'ri harakat."],
      ["Qatorni almashtirish va burilish", "Ko'zgular, ko'rsatkich va o'lik zonani tekshirish."],
      ["Piyodalar va jamoat transporti", "Piyodalar o'tish joylari va bekatlar yonida xavfsiz harakat."],
      ["Xavfsiz to'xtash", "To'xtash joyini tanlash va to'xtashdan oldingi harakatlar."],
    ] },
  { slug: "imtihon-tayyorgarlik", photo: "1606326608690-4e0281b1e588", title: "Imtihonga tayyorgarlik", category: "nazariya", level: "O'rta", order: 14, published: true, section: "EXTRA", studyPeriod: "10 kun", packages: [{ name: "10 kunlik", description: "Nazariy imtihonga tayyorlov", days: 30, price: 450000 }],
    description: "Nazariy testlar, xatolar tahlili, amaliy mashqlar va sinov imtihoni. Asosiy kursdan alohida ham olish mumkin.",
    outline: [
      ["Nazariy testlar", "Mavzular bo'yicha test mashqlari va vaqt bilan ishlash."],
      ["Xatolar tahlili", "Noto'g'ri javoblar ustida ishlash va bo'shliqlarni yopish."],
      ["Amaliy mashqlar", "Imtihon mashqlarini instruktor bilan takrorlash."],
      ["Sinov imtihoni", "Haqiqiy imtihon sharoitiga yaqin sinov."],
    ] },
  { slug: "a1-toifa", photo: "1519750292352-c9fc17322ed7", title: "A1 toifa — moped va skuter", category: "mototsikl", level: "Boshlang'ich", order: 3, published: true, section: "MAIN", studyPeriod: "1 oy", packages: [{ name: "Standart", description: "Moped va skuter: nazariya va amaliyot", days: 45, price: 1200000 }],
    description: "Moped va skuter kabi A1 toifasiga kiradigan transport vositalari bo'yicha nazariy bilim va imtihonga tayyorgarlik. Nazariyani mustaqil o'rganib, belgilangan imtihonlarni topshirish mumkin — talablarni rasmiy manbada tekshiring.",
    outline: [
      ["Tegishli yo'l harakati qoidalari", "Moped va skuter haydovchisiga tegishli qoidalar."],
      ["Yo'l belgilari va xavfsizlik", "Himoya vositalari va yo'lda ko'rinib turish."],
      ["Transport vositasini boshqarish asoslari", "Muvozanat, tormozlash va burilish."],
      ["Nazariy imtihon mashqlari", "Test savollari bo'yicha mashq."],
    ] },
  { slug: "a-toifa", adopt: "A toifa", title: "A toifa — mototsikl", category: "mototsikl", level: "Boshlang'ich", order: 2, published: true, section: "MAIN", studyPeriod: "1–1,5 oy", packages: [{ name: "Standart", description: "Nazariya va amaliy mashg'ulotlar", days: 60, price: 1800000 }],
    description: "Mototsikl boshqarishni o'rganish uchun nazariy va amaliy tayyorgarlik: boshqaruv elementlari, muvozanat va past tezlikda boshqarish, burilish va tormozlash, yo'l belgilari va xavfsiz harakat, imtihonga tayyorgarlik." },
  { slug: "c-toifa", adopt: "C toifa", title: "C toifa — yuk avtomobili", category: "yuk-avtomobil", level: "O'rta", order: 4, published: true, section: "MAIN", studyPeriod: "2,5 oy", packages: [{ name: "Standart", description: "Yuk transportini boshqarishga tayyorgarlik", days: 90, price: 3400000 }],
    description: "Og'ir yuk avtomobillarini boshqarishga tayyorgarlik: yuk avtomobilining tuzilishi, o'lchamlari va burilish xususiyatlari, yukni xavfsiz tashish, tormoz tizimi va texnik ko'rik, amaliy boshqaruv va imtihon tayyorgarligi. Qabul talablari avtomaktab litsenziyasi va amaldagi qoidalarga bog'liq." },
  { slug: "d-toifa", photo: "1564694202883-46e7448c1b26", title: "D toifa — avtobus", category: "avtobus", level: "Murakkab", order: 5, published: true, section: "MAIN", studyPeriod: "2 oy", packages: [{ name: "Standart", description: "Nazariya va amaliy mashg'ulotlar", days: 90, price: 4100000 }],
    description: "Yo'lovchi tashishga mo'ljallangan avtobuslarni boshqarish uchun kurs. D toifasi uchun alohida talablar va avvalgi haydovchilik tajribasi talab qilinishi mumkin — qabuldan oldin rasmiy talablarni tekshiring.",
    outline: [
      ["Avtobusning boshqaruv tizimlari", "Asosiy boshqaruv elementlari va asboblar paneli."],
      ["Yo'lovchilar xavfsizligi", "Eshiklar, salon va yo'lovchilarga e'tibor."],
      ["Bekatlarda to'xtash va harakatni boshlash", "Bekatga ravon yaqinlashish va xavfsiz jo'nash."],
      ["Katta transport vositasini boshqarish", "Gabarit, o'lik zonalar va burilish radiusi."],
      ["Yo'l vaziyatlarini tahlil qilish", "Xavfni oldindan ko'rish va qaror qabul qilish."],
      ["Imtihonga tayyorgarlik", "Nazariy va amaliy imtihon mashqlari."],
    ] },

  // ── Extra courses ──
  { slug: "parkovka-manevr", photo: "1593280405106-e438ebe93f5b", title: "Parkovka va manevr kursi", category: "amaliyot", level: "O'rta", order: 15, published: true, section: "EXTRA", studyPeriod: "3 mashg'ulot", packages: [{ name: "3 mashg'ulot", description: "Parkovka va tor joyda manevr", days: 30, price: 200000 }],
    description: "Parallel parkovka, orqaga yurib joylashish, tor joydan chiqish va avtomobil o'lchamlarini his qilish.",
    outline: [
      ["Parallel parkovka", "Yo'l chetida ikki avtomobil orasiga joylashish."],
      ["Orqaga yurib joylashish", "To'xtash joyiga orqa bilan kirish."],
      ["Tor joydan chiqish", "Cheklangan joyda xavfsiz manevr."],
      ["Avtomobil o'lchamlarini his qilish", "Gabaritni ko'zgular va mo'ljallar orqali aniqlash."],
    ] },
  { slug: "individual-darslar", photo: "1515086828834-023d61380316", title: "Qo'shimcha individual haydash darslari", category: "amaliyot", level: "O'rta", order: 16, published: true, section: "EXTRA", studyPeriod: "3 mashg'ulot", packages: [{ name: "3 mashg'ulot", description: "Amaliy haydashga tayyorlov", days: 30, price: 170000 }],
    description: "Avval haydovchilikni o'rgangan, lekin ayrim ko'nikmalarini mustahkamlashni istaganlar uchun instruktor bilan individual mashg'ulotlar. Mavzu va vaqt o'quvchi bilan kelishiladi." },
  { slug: "avtomobil-tuzilishi", photo: "1487754180451-c456f719a1fc", title: "Avtomobil tuzilishi va texnik bilimlar", category: "nazariya", level: "Boshlang'ich", order: 17, published: true, section: "EXTRA", studyPeriod: "1–2 hafta", packages: [{ name: "Nazariy kurs", description: "Avtomobil tuzilishi va texnik xizmat", days: 30, price: 350000 }],
    description: "Asosiy boshqaruv elementlari, paneldagi ogohlantirish chiroqlari, shinalar, suyuqliklar, kundalik tekshiruv va yo'lda favqulodda vaziyatda xavfsiz harakat qilish.",
    outline: [
      ["Boshqaruv elementlari", "Rul, pedallar, uzatmalar qutisi va qo'shimcha boshqaruvlar."],
      ["Ogohlantirish chiroqlari", "Paneldagi belgilar va ular nimani bildiradi."],
      ["Shinalar va suyuqliklar", "Bosim, protektor, moy, sovutish va tormoz suyuqligi."],
      ["Kundalik tekshiruv", "Safardan oldin 5 daqiqalik ko'rik."],
      ["Yo'ldagi favqulodda vaziyatlar", "Nosozlikda xavfsiz to'xtash va yordam chaqirish."],
    ] },

  // ── Additional categories: drafts until the school has the programme and permits ──
  { slug: "be-toifa", photo: "1520101244246-293f77ffc39e", title: "BE toifa — tirkamali yengil avtomobil", category: "tirkamali", level: "O'rta", order: 7, published: true, section: "COMBINED", studyPeriod: "1 oy", packages: [{ name: "Standart", description: "Tirkama bilan boshqarish", days: 45, price: 1725000 }],
    description: "B toifadagi avtomobil bilan tegishli og'ir tirkamani boshqarish." },
  { slug: "ce-toifa", photo: "1788972013158-2e82e093b044", title: "CE toifa — tirkamali yuk avtomobili", category: "tirkamali", level: "Murakkab", order: 8, published: true, section: "COMBINED", studyPeriod: "1,5–2,5 oy", packages: [{ name: "Standart", description: "Yuk avtomobili va tirkama", days: 90, price: 3200000 }],
    description: "C toifadagi yuk avtomobili bilan tegishli tirkamani boshqarish." },
  { slug: "de-toifa", photo: "1756723701257-46513cd36fc1", title: "DE toifa — tirkamali yoki bo'g'imli avtobus", category: "tirkamali", level: "Murakkab", order: 9, published: false, section: "COMBINED",
    description: "D toifadagi transport vositasi bilan tegishli tirkama yoki bo'g'imli avtobusni boshqarish." },
  { slug: "bc-toifa", photo: "1591768793355-74d04bb6608f", title: "BC — birlashtirilgan dastur", category: "yuk-avtomobil", level: "O'rta", order: 6, published: true, section: "COMBINED", studyPeriod: "3–5,5 oy", packages: [{ name: "Standart", description: "B va C toifalari bitta dasturda", days: 180, price: 7000000 }],
    description: "B va C toifalari uchun birlashtirilgan o'quv dasturi." },
  { slug: "b-dan-c-ga", photo: "1586191552066-d52dd1e3af86", title: "B dan C ga qayta tayyorlash", category: "yuk-avtomobil", level: "O'rta", order: 10, published: false, section: "COMBINED",
    description: "B toifasidan C toifasiga o'tish uchun tayyorgarlik." },
];

async function main() {
  const catIds: Record<string, string> = Object.fromEntries((await prisma.category.findMany({ select: { slug: true, id: true } })).map((c) => [c.slug, c.id]));
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, order: c.order, translations: c.translations, isActive: true },
      create: { slug: c.slug, name: c.name, description: c.description, order: c.order, translations: c.translations },
    });
    catIds[c.slug] = row.id;
  }

  for (const def of catalog) {
    const categoryId = catIds[def.category];
    if (!categoryId) throw new Error(`Category ${def.category} missing (run courses.ts first)`);
    const data = { title: def.title, description: def.description, level: def.level, order: def.order, categoryId, section: def.section, studyPeriod: def.studyPeriod ?? null, isPublished: def.published };

    let course = await prisma.course.findUnique({ where: { slug: def.slug } });
    // First run on a seeded database: adopt the old seed course and give it the catalogue texts once.
    if (!course && def.adopt) {
      const seeded = await prisma.course.findFirst({ where: { title: { startsWith: def.adopt, mode: "insensitive" } } });
      if (seeded) await prisma.course.update({ where: { id: seeded.id }, data: { ...data, slug: def.slug } });
      course = seeded ? await prisma.course.findUnique({ where: { id: seeded.id } }) : null;
    }
    // Existing courses: only the catalogue structure is refreshed (section, order, category, publish state).
    // Texts, period and photo may have been edited in the admin panel and are kept.
    if (course) course = await prisma.course.update({ where: { id: course.id }, data: { order: def.order, categoryId, section: def.section, isPublished: def.published, slug: def.slug } });
    else course = await prisma.course.create({ data: { ...data, slug: def.slug } });

    if (def.photo && !course.thumbnail) {
      course = await prisma.course.update({ where: { id: course.id }, data: { thumbnail: `https://images.unsplash.com/photo-${def.photo}?w=800&auto=format&fit=crop&q=80` } });
    }

    let pkgOrder = 1;
    for (const pk of def.packages ?? []) {
      const amount = pk.price * 100; // minor units (tiyin)
      let pkg = await prisma.coursePackage.findFirst({ where: { courseId: course.id, name: pk.name }, include: { prices: true } });
      if (pkg) await prisma.coursePackage.update({ where: { id: pkg.id }, data: { description: pk.description, durationDays: pk.days, order: pkgOrder, isActive: true, archivedAt: null } });
      else pkg = await prisma.coursePackage.create({ data: { courseId: course.id, name: pk.name, description: pk.description, durationDays: pk.days, order: pkgOrder }, include: { prices: true } });
      // Only a package without a price gets the starting tariff: a price set later in the admin panel wins.
      const active = pkg.prices.filter((x) => x.isActive && !x.validTo);
      if (active.length === 0) await prisma.price.create({ data: { packageId: pkg.id, amount, currency: "UZS", isSample: true } });
      pkgOrder += 1;
    }

    let order = 1;
    for (const [title, description] of def.outline ?? []) {
      const existing = await prisma.lesson.findFirst({ where: { courseId: course.id, title } });
      if (existing) await prisma.lesson.update({ where: { id: existing.id }, data: { description, order } });
      else await prisma.lesson.create({ data: { courseId: course.id, title, description, order, isPublished: true } });
      order += 1;
    }
    console.log(`${course.isPublished ? "  " : "D "} ${String(def.order).padStart(2)}. ${def.title}${def.outline ? ` (${def.outline.length} dars)` : ""}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
