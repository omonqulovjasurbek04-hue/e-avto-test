import { Lesson } from "../types/lesson";

export const mockLessons: Lesson[] = [
  {
    id: "lesson-1",
    courseId: "course-b",
    title: "1-Mavzu: Umumiy qoidalar va asosiy tushunchalar",
    slug: "umumiy-qoidalar-va-tushunchalar",
    description: "O'zbekiston Respublikasi Yo'l Harakati Qoidalarining asosiy atamalari: haydovchi, yo'lovchi, piyoda, bosh yo'l, ruxsat etilgan maksimal vazn va boshqalar.",
    content: `
# 1-Mavzu: Umumiy Qoidalar

O'zbekiston Respublikasi hududida yo'l harakati qoidalarining yagona tartibi o'rnatilgan bo'lib, barcha transport vositalari haydovchilari va piyodalar uchun majburiydir.

### Asosiy Atamalar:
- **Bosh yo'l** — tuproqli yo'lga nisbatan qoplamali (asfalt, beton) yo'l yoki tegishli 2.1, 2.3.1-2.3.3 belgilari bilan belgilangan yo'l.
- **Yetarli ko'rinmaslik** — yomg'ir, qor, tuman kabi noqulay ob-havo sharoitida yo'lning 300 metrdan kam masofada ko'rinishi.
- **Kun qorong'i vaqti** — kechki g'ira-shira tugashidan to tonggi g'ira-shira boshlanishigacha bo'lgan vaqt oralig'i.
- **Majburiy to'xtash** — texnik nosozlik, yuk yoki haydovchi/yo'lovchi holati sababli harakatni to'xtatish.

### Haydovchining Majburiyatlari:
1. Tegishli toifadagi haydovchilik guvohnomasiga ega bo'lish;
2. Transport vositasi ro'yxatdan o'tganligi to'g'risidagi hujjat va sug'urta polisini olib yurish;
3. Harakatlanish oldidan transport vositasining texnik sozligini tekshirish.
    `,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // External video player link
    durationMinutes: 35,
    order: 1,
    isPublished: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-10T00:00:00.000Z",
    course: {
      id: "course-b",
      title: "B Toifa — Yengil avtomobillar nazariyasi",
      slug: "b-toifa-yengil-avtomobillar",
    },
    questionCount: 15,
  },
  {
    id: "lesson-2",
    courseId: "course-b",
    title: "2-Mavzu: Ogohlantiruvchi va Imtiyoz belgilari",
    slug: "ogohlantiruvchi-va-imtiyoz-belgilari",
    description: "Yo'ldagi xavfli burilishlar, temir yo'l kesishmalari, chorrahalarda harakatlanish imtiyozi belgilari va ularning o'rnatilish masofalari.",
    content: `
# 2-Mavzu: Ogohlantiruvchi va Imtiyoz belgilari

### 1. Ogohlantiruvchi belgilar:
Uchburchak shaklda bo'lib, qizil hoshiyali va oq fonda tasvirlanadi.
- Aholi punktlarida xavfli joydan **50-100 metr** oldin;
- Aholi punktlaridan tashqarida xavfli joydan **150-300 metr** oldin o'rnatiladi.

### 2. Imtiyoz belgilari:
Chorrahalarda, yo'lning qatnov qismlari kesishmasida hamda yo'lning tor qismlarida harakatlanish navbatini belgilaydi:
- **2.1 Bosh yo'l**
- **2.4 Yo'l bering**
- **2.5 To'xtamasdan harakatlanish taqiqlangan** (STOP)
    `,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    durationMinutes: 40,
    order: 2,
    isPublished: true,
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-12T00:00:00.000Z",
    course: {
      id: "course-b",
      title: "B Toifa — Yengil avtomobillar nazariyasi",
      slug: "b-toifa-yengil-avtomobillar",
    },
    questionCount: 20,
  },
  {
    id: "lesson-3",
    courseId: "course-b",
    title: "3-Mavzu: Taquvchi va Buyuruvchi yo'l belgilari",
    slug: "taqiqlovchi-va-buyuruvchi-belgilar",
    description: "Tezlikni cheklovchi belgilar, kirish va to'xtashni taqiqlovchi belgilar hamda majburiy harakat yo'nalishlari.",
    content: `
# 3-Mavzu: Taqiqlovchi va Buyuruvchi belgilar

### Taqiqlovchi belgilar:
Yo'l harakatiga muayyan cheklovlar kiritadi yoki ularni bekor qiladi (Aylana shaklda, qizil hoshiyali).
- **3.1 Kirish taqiqlangan ("G'isht")**
- **3.2 Harakatlanish taqiqlangan**
- **3.24 Yuqori tezlik cheklangan**
- **3.27 To'xtash taqiqlangan**

### Buyuruvchi belgilar:
Faqat ko'rsatilgan yo'nalishlarda harakatlanishga ruxsat beradi (Aylana shaklda, ko'k fonda oq strelkalar).
    `,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    durationMinutes: 45,
    order: 3,
    isPublished: true,
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    course: {
      id: "course-b",
      title: "B Toifa — Yengil avtomobillar nazariyasi",
      slug: "b-toifa-yengil-avtomobillar",
    },
    questionCount: 18,
  },
  {
    id: "lesson-4",
    courseId: "course-b",
    title: "4-Mavzu: Svetofor va Tartibga soluvchining ishoralari",
    slug: "svetofor-va-tartibga-soluvchi",
    description: "Svetoforning asosiy va qo'shimcha seksiyalari, miltillovchi signallar hamda YPX inspektori ishoralarining ustunligi.",
    content: `
# 4-Mavzu: Svetofor va Tartibga Soluvchi

Tartibga soluvchining (YPX inspektori) ishoralari va ko'rsatmalari svetofor signallari, yo'l belgilari va chiziqlari talablariga zid kelgan hollarda ham **HAYDOVCHILAR FAQAT TARTIBGA SOLUVCHIGA BO'YSUNISHLARI SHART**.

### Tartibga soluvchi ishoralari:
1. **Qo'llari yon tomonga uzatilgan yoki tushirilgan:**
   - Ko'krak va orqa tomonidan: barcha transport va piyodalar to'xtaydi.
   - O'ng va chap yon tomonidan: tramvay to'g'riga, relssiz transport to'g'riga va o'ngga, piyodalar yo'lni kesib o'tishiga ruxsat.
2. **O'ng qo'li oldinga cho'zilgan:**
   - Ko'krak tomonidan: barcha transport faqat o'ngga;
   - Chap tomonidan: barcha yo'nalishlarda harakatlanish mumkin;
   - O'ng va orqa tomonidan: harakat taqiqlanadi.
    `,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    durationMinutes: 50,
    order: 4,
    isPublished: true,
    createdAt: "2025-01-04T00:00:00.000Z",
    updatedAt: "2025-01-16T00:00:00.000Z",
    course: {
      id: "course-b",
      title: "B Toifa — Yengil avtomobillar nazariyasi",
      slug: "b-toifa-yengil-avtomobillar",
    },
    questionCount: 22,
  },
  {
    id: "lesson-5",
    courseId: "course-b",
    title: "5-Mavzu: Chorrahalarda harakatlanish (Tartibga solingan va solinmagan)",
    slug: "chorrahalarda-harakatlanish",
    description: "Tartibga solingan va solinmagan chorrahalarni kesib o'tish qoidalari, o'ngdan kelayotgan transport vositasiga yo'l berish qoidasi.",
    content: `
# 5-Mavzu: Chorrahalar

Chorrahalar 2 asosiy turga bo'linadi:
1. **Tartibga solingan** (Svetofor yoki Tartibga soluvchi ishlayotgan bo'lsa)
2. **Tartibga solinmagan** (Svetofor ishlamayotgan, sariq miltillayotgan yoki belgilar bo'yicha)

### Teng ahamiyatli yo'llar chorrahasi ("O'ng qo'l qoidasi"):
Teng ahamiyatli yo'llar chorrahasida haydovchi **o'ng tomondan yaqinlashib kelayotgan** transport vositalariga yo'l berishi shart.
Chapga burilayotgan yoki qayrilib olayotgan haydovchi to'g'riga harakatlanayotgan va o'ngga burilayotgan qarama-qarshi transport vositasiga yo'l beradi.
    `,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    durationMinutes: 55,
    order: 5,
    isPublished: true,
    createdAt: "2025-01-05T00:00:00.000Z",
    updatedAt: "2025-01-18T00:00:00.000Z",
    course: {
      id: "course-b",
      title: "B Toifa — Yengil avtomobillar nazariyasi",
      slug: "b-toifa-yengil-avtomobillar",
    },
    questionCount: 25,
  },
];
