import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Test questions for the A, B and C courses: five per lesson, built only on what the lesson texts in
 * courses.ts teach (no exact fines, ages or numbers the lessons do not give). Run after courses.ts:
 *   npx tsx prisma/content/questions.ts
 * Idempotent and non-destructive: a question is matched by its text within its lesson and updated;
 * nothing is deleted, questions added in the admin panel are untouched. The production bootstrap runs
 * this once, on a database without questions.
 * Before going live, an instructor must check every question against the current YHQ text.
 */
const prisma = new PrismaClient();

type Difficulty = "EASY" | "MEDIUM" | "HARD";
/** [question, four options, index of the correct option, explanation, difficulty] */
type Q = [text: string, options: [string, string, string, string], correct: 0 | 1 | 2 | 3, explanation: string, difficulty?: Difficulty];
interface LessonQuestions {
  /** Course title prefix, as in courses.ts. */
  course: string;
  /** Lesson title, exactly as in courses.ts. */
  lesson: string;
  questions: Q[];
}

export const questionBank: LessonQuestions[] = [
  // ───────────── B toifa ─────────────
  {
    course: "B Toifa",
    lesson: "Umumiy qoidalar va haydovchining majburiyatlari",
    questions: [
      ["Haydovchi o'zi bilan qaysi hujjatni albatta olib yurishi kerak?", ["Tegishli toifadagi haydovchilik guvohnomasini", "Faqat pasportini", "Avtomobil sotib olingan chekni", "Avtosalon kafolat kitobchasini"], 0, "Haydovchi tegishli toifadagi guvohnoma, ro'yxatdan o'tkazish hujjati va majburiy sug'urta polisini olib yuradi."],
      ["Yo'lda tormoz tizimi ishdan chiqdi. Haydovchi nima qilishi kerak?", ["Ehtiyotkorlik bilan manzilgacha davom etadi", "Harakatni to'xtatadi: tormoz nosoz bo'lsa harakat taqiqlanadi", "Avariya signalini yoqib, tezlikni oshiradi", "Faqat kunduzi harakatlanadi"], 1, "Tormoz yoki rul nosoz bo'lsa, harakatni davom ettirish taqiqlanadi."],
      ["Harakat vaqtida qaysi holat haydovchiga taqiqlanadi?", ["Ko'zgularni sozlash", "Telefonni qo'lda ushlab gaplashish", "Yaqin chiroqni yoqish", "Radio tinglash"], 1, "Harakat vaqtida telefonni qo'lda ushlab gaplashish taqiqlanadi."],
      ["Xavfsizlik kamarini kim taqishi shart?", ["Faqat haydovchi", "Faqat old o'rindiqdagi yo'lovchi", "Haydovchi va yo'lovchilar", "Faqat shahar tashqarisida hamma"], 2, "Haydovchi va yo'lovchilar xavfsizlik kamarini taqishi shart."],
      ["Safardan oldin qaysi tekshiruv majburiy deb o'rgatildi?", ["Dvigatel moyining markasi", "Tormoz, rul, yoritish asboblari va shinalar holati", "Salondagi gilamchalar tozaligi", "Bakda to'liq yoqilg'i borligi"], 1, "Safardan oldin tormoz va rul sozligi, yoritish asboblari, shinalar, oyna tozalagichlar va ko'zgular tekshiriladi."],
      ["Transport vositasini boshqarishni kimga topshirish taqiqlanadi?", ["Tegishli guvohnomasi bor oila a'zosiga", "Guvohnomasi yo'q shaxsga", "Ishonchnomasi bor haydovchiga", "Tajribali instruktorga"], 1, "Boshqarishni haydovchilik guvohnomasi yo'q shaxsga topshirish taqiqlanadi.", "MEDIUM"],
    ],
  },
  {
    course: "B Toifa",
    lesson: "Yo'l belgilari va chiziqlari (1.1 - 7.22)",
    questions: [
      ["Qizil hoshiyali uchburchak shaklidagi belgilar odatda qaysi guruhga kiradi?", ["Ogohlantiruvchi belgilar", "Buyuruvchi belgilar", "Servis belgilari", "Axborot-ko'rsatkich belgilari"], 0, "Ogohlantiruvchi belgilar (1-guruh) odatda qizil hoshiyali uchburchak bo'ladi va oldinda xavfli joy borligini bildiradi."],
      ["Ko'k doira shaklidagi belgi nimani bildiradi?", ["Harakatni taqiqlaydi", "Majburiy yo'nalish yoki harakat turini ko'rsatadi", "Servis xizmati joyini ko'rsatadi", "Xavfli joydan ogohlantiradi"], 1, "Buyuruvchi belgilar (4-guruh) ko'k doira shaklida bo'lib, majburiy yo'nalish yoki harakat turini ko'rsatadi."],
      ["\"Bosh yo'l\" va \"Yo'l bering\" belgilari qaysi guruhga kiradi?", ["Taqiqlovchi", "Imtiyoz belgilari", "Qo'shimcha axborot", "Servis"], 1, "Imtiyoz belgilari (2-guruh) chorrahalar va tor joylardan o'tish navbatini belgilaydi."],
      ["Yaxlit yo'l chizig'ini kesib o'tish mumkinmi?", ["Ha, quvib o'tishda", "Ha, agar qarama-qarshi bo'lak bo'sh bo'lsa", "Yo'q, yaxlit chiziqni kesib o'tish taqiqlanadi", "Faqat tunda mumkin"], 2, "Yaxlit chiziqni kesib o'tish taqiqlanadi; uzuq chiziqni xavfsiz bo'lganda kesib o'tish mumkin."],
      ["Sariq fonli vaqtinchalik belgi doimiy belgiga zid bo'lsa, qaysi biriga amal qilinadi?", ["Doimiy belgiga", "Vaqtinchalik (sariq fonli) belgiga", "Yo'l chizig'iga", "Haydovchi o'zi tanlaydi"], 1, "Vaqtinchalik belgilar va tartibga soluvchining ishoralari doimiy belgilar va chiziqlardan ustun turadi.", "MEDIUM"],
      ["Masofa, vaqt yoki transport turini aniqlashtiruvchi lavhalar qaysi guruh?", ["Qo'shimcha axborot (7-guruh)", "Ogohlantiruvchi (1-guruh)", "Imtiyoz (2-guruh)", "Taqiqlovchi (3-guruh)"], 0, "Qo'shimcha axborot lavhalari asosiy belgi ta'sirini aniqlashtiradi: masofa, vaqt, transport turi."],
    ],
  },
  {
    course: "B Toifa",
    lesson: "Chorrahalarda harakatlanish va svetofor signallari",
    questions: [
      ["Sariq signal yondi, lekin keskin tormozlamasdan to'xtab bo'lmaydi. Nima qilish kerak?", ["Keskin tormozlash shart", "Harakatni davom ettirishga ruxsat beriladi", "Orqaga qaytish kerak", "Chap bo'lakka o'tish kerak"], 1, "Sariq signalda harakat taqiqlanadi, lekin keskin tormozlamasdan to'xtab bo'lmasa, harakatni davom ettirishga ruxsat beriladi.", "MEDIUM"],
      ["Teng ahamiyatli yo'llar kesishgan chorrahada qaysi qoida amal qiladi?", ["Chap qo'l qoidasi", "O'ng qo'l qoidasi: o'ngdan kelayotganga yo'l beriladi", "Kim tezroq kelsa, o'sha o'tadi", "Kattaroq transport o'tadi"], 1, "Teng ahamiyatli yo'llarda o'ng tomondan kelayotgan transportga yo'l beriladi."],
      ["Qo'shimcha seksiyadagi yashil strelka nimani bildiradi?", ["Barcha yo'nalishlarga ruxsat", "Faqat o'sha yo'nalishga ruxsat; boshqa yo'nalishdan kelayotganlarga yo'l berish kerak", "To'xtash majburiy", "Faqat jamoat transportiga ruxsat"], 1, "Qo'shimcha seksiyadagi yashil strelka faqat o'sha yo'nalishga ruxsat beradi, bunda boshqa yo'nalishlardan kelayotganlarga yo'l beriladi."],
      ["Chorrahada chapga burilishda kimga yo'l berish kerak?", ["Hech kimga", "Qarama-qarshi yo'nalishdan to'g'riga yoki o'ngga harakatlanayotganlarga", "Faqat orqadan kelayotganlarga", "Faqat yuk mashinalariga"], 1, "Chapga burilish yoki qayrilishda qarama-qarshi yo'nalishdan to'g'riga yoki o'ngga harakatlanayotganlarga yo'l beriladi."],
      ["Yashil signal yonib turibdi, lekin chorraha ortida tirbandlik bor. Nima qilish kerak?", ["Chorrahaga chiqib kutish", "Chorrahaga chiqmaslik, chunki unda to'xtab qolib boshqalarga xalaqit berish mumkin", "Tovush signali berib o'tish", "Qarama-qarshi bo'lakdan aylanib o'tish"], 1, "Chorrahada to'xtab qolib boshqalar harakatiga xalaqit berishingiz mumkin bo'lsa, ruxsat beruvchi signalda ham chorrahaga chiqmang.", "MEDIUM"],
      ["Tartibga soluvchining ishorasi svetofor signaliga zid bo'lsa, qaysi biriga amal qilinadi?", ["Svetoforga", "Tartibga soluvchining ishorasiga", "Yo'l belgisiga", "Yo'l chizig'iga"], 1, "Tartibga soluvchining ishoralari svetofor signallari va belgilardan ustun turadi."],
    ],
  },
  {
    course: "B Toifa",
    lesson: "Quvib o'tish, oraliq masofa va manevrlar",
    questions: [
      ["Burilish ko'rsatkichini yoqish haydovchiga imtiyoz beradimi?", ["Ha, ko'rsatkich yoqilsa boshqalar yo'l beradi", "Yo'q, ko'rsatkich imtiyoz bermaydi, manevr xavfsizligiga ishonch hosil qilish kerak", "Faqat shaharda beradi", "Faqat bosh yo'lda beradi"], 1, "Ko'rsatkich sizga imtiyoz bermaydi: manevr boshqalarga xalaqit bermasligiga ishonch hosil qiling."],
      ["Quvib o'tishni boshlashdan oldin nimaga ishonch hosil qilish kerak?", ["Qarama-qarshi bo'lak yetarli masofada bo'sh ekaniga", "Faqat oldingi mashina sekin ketayotganiga", "Yo'lda belgilar yo'qligiga", "Musiqani o'chirganingizga"], 0, "Qarama-qarshi bo'lak bo'sh, orqadagi transport quvib o'tishni boshlamagan, oldingisi chapga burilish ishorasini bermagan bo'lishi kerak."],
      ["Sizni quvib o'tishayotganda nima qilish kerak?", ["Tezlikni oshirish", "Tezlikni oshirmaslik va xalaqit bermaslik", "Chap bo'lakka o'tish", "Keskin tormozlash"], 1, "Sizni quvib o'tishayotganda tezlikni oshirmang va xalaqit bermang."],
      ["Quyidagi joylardan qayerda quvib o'tish odatda taqiqlanadi?", ["To'g'ri, ko'rinishi yaxshi yo'lda", "Piyodalar o'tish joyida va temir yo'l kesishmasida", "Ko'p bo'lakli avtomagistralda", "Uzuq chiziqli yo'lda"], 1, "Quvib o'tish chorrahalarda, piyodalar o'tish joylarida, temir yo'l kesishmalarida, ko'priklarda va ko'rinish cheklangan joylarda taqiqlanadi."],
      ["Quruq yo'lda oraliq masofani tanlashning amaliy qoidasi qanday?", ["Kamida 2 soniya qoidasi", "Kamida 0,5 soniya", "Bir mashina uzunligi", "Masofa muhim emas"], 0, "Oldingi mashina belgidan o'tgandan keyin siz shu joyga kamida 2 soniyada yetib kelishingiz kerak."],
      ["Nam, qorli yoki tungi yo'lda oraliq vaqtni qanday o'zgartirish kerak?", ["Kamaytirish", "O'zgartirmaslik", "Ikki-uch barobar oshirish", "Faqat qorda oshirish"], 2, "Nam, qorli yoki tungi yo'lda oraliq vaqtni ikki-uch barobar oshiring.", "MEDIUM"],
    ],
  },
  {
    course: "B Toifa",
    lesson: "Favqulodda holatlar va birinchi yordam",
    questions: [
      ["Yo'l-transport hodisasi sodir bo'lsa, haydovchi birinchi navbatda nima qiladi?", ["Hodisa joyidan ketadi", "To'xtaydi, avariya signalizatsiyasini yoqadi va avariya to'xtash belgisini o'rnatadi", "Mashinani darhol yo'l chetiga suradi", "Faqat sug'urta kompaniyasiga qo'ng'iroq qiladi"], 1, "Darhol to'xtang, avariya yorug'lik signalizatsiyasini yoqing va avariya to'xtash belgisini o'rnating."],
      ["Tez yordam qaysi raqam orqali chaqiriladi?", ["101", "102", "103", "104"], 2, "Jabrlanuvchilarga birinchi yordam ko'rsatib, tez yordam chaqiriladi (103)."],
      ["Birinchi yordam ko'rsatishda eng birinchi qadam qaysi?", ["Jabrlanuvchini darhol mashinadan sudrab chiqarish", "O'zingiz va jabrlanuvchi uchun xavf yo'qligiga ishonch hosil qilish", "Suv ichirish", "Rasmga olish"], 1, "Avval o'zingiz va jabrlanuvchi uchun xavf (harakat, yong'in) yo'qligiga ishonch hosil qiling."],
      ["Umurtqa pog'onasi shikastlanganiga shubha bo'lsa nima qilinadi?", ["Jabrlanuvchini o'tqazib qo'yish", "Zarurat bo'lmasa joyidan siljitmaslik va boshini qimirlatmaslik", "Darhol yurgizishga urinish", "Boshini orqaga egish"], 1, "Umurtqa pog'onasi shikastlanganiga shubha bo'lsa, jabrlanuvchini zarurat bo'lmasa siljitmang va boshini qimirlatmang.", "MEDIUM"],
      ["Avtomobilda nima bo'lishi shart?", ["Soz holatdagi aptechka va o't o'chirgich", "Zaxira akkumulyator", "Ikkita zaxira g'ildirak", "Tortish arqoni va kompressor"], 0, "Avtomobilda soz holatdagi aptechka va o't o'chirgich bo'lishi shart; yaroqlilik muddatini tekshirib turing."],
      ["Jabrlanuvchi nafas olmasa nima qilish kerak?", ["Kutish", "Tez yordamga qo'ng'iroq qilib, yurak-o'pka reanimatsiyasini boshlash", "Yuziga suv sepish", "Uni o'tqazib qo'yish"], 1, "Nafas olmasa — tez yordamga qo'ng'iroq qiling va yurak-o'pka reanimatsiyasini boshlang.", "MEDIUM"],
    ],
  },

  // ───────────── A toifa ─────────────
  {
    course: "A Toifa",
    lesson: "Mototransport turlari va A toifa",
    questions: [
      ["A toifali guvohnoma qaysi transportni boshqarish huquqini beradi?", ["Yuk avtomobillarini", "Mototsikllarni", "Avtobuslarni", "Tramvaylarni"], 1, "A toifali guvohnoma mototsikllarni boshqarish huquqini beradi."],
      ["Mototsikl haydovchisiga YHQning umumiy talablari tegishlimi?", ["Yo'q, unga alohida qoidalar amal qiladi", "Ha, svetofor, belgilar, tezlik va navbat talablari to'liq tegishli", "Faqat shahar tashqarisida", "Faqat tezlik cheklovlari"], 1, "Mototsikl haydovchisiga ham avtomobil haydovchisi kabi YHQning barcha umumiy talablari to'liq tegishli."],
      ["Nima uchun mototsiklni boshqa haydovchilar ko'pincha kech payqaydi?", ["U juda shovqinli", "U kichik bo'lgani uchun", "U doim tez yuradi", "Uning farasi yo'q"], 1, "Mototsikl kichik bo'lgani uchun boshqa haydovchilar uni kech payqaydi."],
      ["Mototsikl muvozanatiga yo'l qoplamasining qaysi holati kuchli ta'sir qiladi?", ["Yangi asfalt", "Qum, moy, nam chiziqlar va quduq qopqoqlari", "Quruq beton", "Keng bo'laklar"], 1, "Muvozanat yo'l qoplamasiga — qum, moy, nam chiziqlar, quduq qopqoqlariga juda sezgir."],
      ["Mototsiklchi uchun asosiy xavf nima bilan bog'liq?", ["Uni kuzov himoya qilmaydi", "Mototsikl og'ir", "Yoqilg'i ko'p sarflanadi", "Ko'zgulari yo'q"], 0, "Haydovchini kuzov himoya qilmaydi — kichik to'qnashuv ham og'ir jarohatga olib kelishi mumkin."],
    ],
  },
  {
    course: "A Toifa",
    lesson: "Himoya ekipirovkasi va safarga tayyorgarlik",
    questions: [
      ["Mototsiklda kim mototsikl shlemida bo'lishi shart?", ["Faqat haydovchi", "Faqat yo'lovchi", "Haydovchi ham, yo'lovchi ham", "Faqat shahar tashqarisida haydovchi"], 2, "Haydovchi va yo'lovchi tasmasi mahkam bog'langan mototsikl shlemida bo'lishi shart."],
      ["Shlem kuchli zarbaga uchradi. Nima tavsiya etiladi?", ["Uni yelimlab ishlatish", "Uni almashtirish", "Faqat oynasini almashtirish", "Hech narsa qilmaslik"], 1, "Kuchli zarbadan keyin shlemni almashtirish tavsiya etiladi."],
      ["Yorqin yoki yorug'lik qaytaruvchi elementli kiyim nima uchun kerak?", ["Chiroyli ko'rinish uchun", "Sizni boshqalarga ko'rinadigan qiladi", "Issiqni saqlaydi", "Shamolni to'sadi"], 1, "Yorqin yoki yorug'lik qaytaruvchi kiyim sizni ko'rinadigan qiladi."],
      ["Harakatdan oldingi tekshiruvga nima kiradi?", ["Shinalar, tormozlar, yoritish, zanjir va ko'zgular", "Faqat yoqilg'i miqdori", "Faqat shlem rangi", "Faqat tovush signali"], 0, "Shinalar bosimi va protektori, ikkala tormoz, yoritish va signal, zanjir tarangligi va ko'zgular tekshiriladi."],
      ["Texnik holatga shubha bo'lsa mototsiklchi nima qiladi?", ["Sekin yuradi", "Yo'lga chiqmaydi", "Faqat kunduzi yuradi", "Yo'lovchisiz yuradi"], 1, "Kichik nosozlik ham muvozanat va tormozlashga kuchli ta'sir qiladi. Shubha bo'lsa — yo'lga chiqmang."],
    ],
  },
  {
    course: "A Toifa",
    lesson: "Yo'lda joylashuv va ko'rinib turish",
    questions: [
      ["Mototsiklchi uchun asosiy qoida qaysi?", ["Hamma sizni ko'radi deb hisoblash", "Sizni ko'rishlariga ishonmaslik — o'zingiz ko'rinadigan bo'lish", "Faqat tunda ehtiyot bo'lish", "Doim eng chap bo'lakda yurish"], 1, "Sizni ko'rishlariga ishonmang — o'zingiz ko'rinadigan bo'ling."],
      ["Bo'lakda qanday joylashish kerak?", ["Oldingi avtomobil haydovchisi sizni ko'zgusida ko'radigan joyda", "Oldingi avtomobilga juda yaqin", "Yuk mashinasining yon tomonida", "Bo'laklar chegarasida"], 0, "Oldingi avtomobil haydovchisi sizni ko'zgusida ko'radigan qilib joylashing."],
      ["Mototsiklchilar uchun eng xavfli joy qayer deb o'rgatildi?", ["To'g'ri avtomagistral", "Chorrahalar", "Yoqilg'i quyish shoxobchasi", "To'xtash joyi"], 1, "Chapga burilayotgan avtomobil mototsiklning tezligi va masofasini ko'pincha noto'g'ri baholaydi — chorrahalar eng xavfli."],
      ["Yuk mashinasi yoki avtobusning yon tomonida uzoq qolish nima uchun xavfli?", ["U yerda shamol ko'p", "U yer haydovchining o'lik zonasi", "U yerda yo'l torroq", "Hech qanday xavf yo'q"], 1, "Yuk mashinalari va avtobuslarning yon tomoni o'lik zona — u yerda uzoq qolmang.", "MEDIUM"],
      ["Avtomobillar qatori orasidan o'tib ketish haqida nima deyilgan?", ["Bu eng tez va xavfsiz usul", "Xavfli va YHQ talablariga zid bo'lishi mumkin — belgilangan bo'lakda harakatlaning", "Faqat tirbandlikda ruxsat", "Faqat shlem bilan ruxsat"], 1, "Qatorlar orasidan o'tish xavfli (eshik ochilishi, bo'lak almashtirish) — belgilangan bo'lakda harakatlaning.", "MEDIUM"],
    ],
  },
  {
    course: "A Toifa",
    lesson: "Tormozlash va burilish texnikasi",
    questions: [
      ["Mototsiklning to'xtash kuchining katta qismini qaysi tormoz beradi?", ["Orqa tormoz", "Oldingi tormoz", "Dvigatel", "Ikkalasi teng"], 1, "To'xtash kuchining katta qismini oldingi tormoz beradi; samarali tormozlash uchun ikkalasini birga bosing."],
      ["Tezlikni qachon pasaytirish kerak?", ["Burilish ichida", "Burilishga kirishdan oldin, to'g'ri chiziqda", "Burilishdan chiqqandan keyin", "Hech qachon"], 1, "Tezlikni burilishga kirguncha to'g'ri chiziqda kamaytiring, burilish ichida keskin tormozlamang."],
      ["ABS haqida qaysi gap to'g'ri?", ["ABS to'xtash masofasini ikki barobar qisqartiradi", "ABS g'ildirak bloklanishining oldini oladi, ammo to'xtash masofasini qisqartirmaydi", "ABS bo'lsa masofa saqlash shart emas", "ABS faqat quruq yo'lda ishlaydi"], 1, "ABS g'ildirak bloklanishining oldini oladi, ammo to'xtash masofasini qisqartirmaydi.", "MEDIUM"],
      ["Burilishda qayerga qarash kerak?", ["Old g'ildirakka", "Borayotgan yo'nalishga, burilish chiqishiga", "Ko'zguga", "Asboblar paneliga"], 1, "Burilish chiqishiga qarang — mototsikl nigoh tomonga boradi."],
      ["Uzun tushish qiyaligida qanday tormozlash tavsiya etiladi?", ["Faqat oldingi tormoz bilan", "Dvigatel bilan tormozlash", "Neytral uzatmada tushish", "Tormozlamaslik"], 1, "Tushish qiyaligida dvigatel bilan tormozlashdan foydalaning, tormozlarni qizdirib yubormang.", "MEDIUM"],
    ],
  },
  {
    course: "A Toifa",
    lesson: "Yo'lovchi va yuk tashish",
    questions: [
      ["Mototsiklda yo'lovchi qayerda tashiladi?", ["Yoqilg'i baki ustida", "Buning uchun mo'ljallangan, oyoq tayanchlari bo'lgan o'rindiqda", "Haydovchining oldida", "Bagaj qutisida"], 1, "Yo'lovchi faqat mo'ljallangan o'rindiqda, oyoq tayanchlari bo'lgan mototsiklda tashiladi."],
      ["Yo'lovchi bilan harakatlanganda nima o'zgaradi?", ["Tormozlash masofasi qisqaradi", "Tormozlash masofasi uzayadi va mototsikl og'irroq boshqariladi", "Hech narsa o'zgarmaydi", "Tezlikni oshirish kerak"], 1, "Yo'lovchi bilan tormozlash masofasi uzayadi va mototsikl og'irroq boshqariladi — tezlikni moslang."],
      ["Burilishda yo'lovchi o'zini qanday tutishi kerak?", ["Qarama-qarshi tomonga egilishi", "Haydovchi bilan birga qiyalanishi", "Oyoqlarini yerga tushirishi", "O'rnidan turishi"], 1, "Yo'lovchi burilishda haydovchi bilan birga qiyalanadi va oyoqlarini tayanchdan olmaydi."],
      ["Yukni qanday joylashtirish muvozanatni saqlaydi?", ["Baland va orqaga", "Pastroq va markazga yaqin", "Faqat bir tomonga", "Rulga osib"], 1, "Og'irlikni pastroq va markazga yaqin joylashtiring — muvozanat saqlanadi."],
      ["Yuk mototsiklda nimaga xalaqit bermasligi kerak?", ["Haydovchiga, ko'rinishga va yoritish asboblariga", "Faqat yo'lovchiga", "Faqat ko'zgularga", "Hech narsaga e'tibor berilmaydi"], 0, "Yuk haydovchiga xalaqit bermasin, ko'rinishni yopmasin va yoritish asboblarini to'smasin."],
    ],
  },

  // ───────────── C toifa ─────────────
  {
    course: "C Toifa",
    lesson: "C toifa va yuk avtomobilining xususiyatlari",
    questions: [
      ["C toifali guvohnoma qanday yuk avtomobillarini boshqarish huquqini beradi?", ["Ruxsat etilgan to'la massasi 3 500 kg dan ortiq", "Faqat 3 500 kg gacha", "Faqat tirkamali", "Faqat yo'lovchi tashuvchi"], 0, "C toifa ruxsat etilgan to'la massasi 3 500 kg dan ortiq yuk avtomobillarini boshqarish huquqini beradi."],
      ["Og'ir avtomobilning to'xtash masofasi haqida qaysi gap to'g'ri?", ["Yengil avtomobilnikidan qisqa", "Ancha uzun, ayniqsa yuklangan holatda", "Yuk ta'sir qilmaydi", "Faqat qishda uzun"], 1, "Massa va inersiya tufayli to'xtash masofasi ancha uzun, ayniqsa yuklangan holatda."],
      ["Yuk avtomobili burilganda orqa g'ildiraklar qanday harakatlanadi?", ["Old g'ildiraklar izidan aniq yuradi", "Burilish ichiga qarab \"kesib\" o'tadi", "Burilish tashqarisiga chiqadi", "Burilishda ko'tariladi"], 1, "Orqa g'ildiraklar burilish ichiga qarab kesib o'tadi.", "MEDIUM"],
      ["Yuk avtomobili haydovchisi qaysi taqiqlovchi belgilarga alohida e'tibor beradi?", ["Balandlik, kenglik, massa va o'q yuklamasi cheklovlari", "Faqat tezlik cheklovi", "Faqat to'xtash taqiqi", "Servis belgilari"], 0, "Gabarit va massa cheklovlarini bildiruvchi belgilar aynan yuk avtomobillari uchun."],
      ["Kabina atrofidagi ko'rinish haqida nima to'g'ri?", ["Hamma tomon yaxshi ko'rinadi", "Katta o'lik zonalar mavjud", "Faqat orqa ko'rinmaydi", "Ko'zgular hamma joyni ko'rsatadi"], 1, "Kabina atrofida katta o'lik zonalar mavjud."],
    ],
  },
  {
    course: "C Toifa",
    lesson: "Gabarit, o'lik zonalar va burilish",
    questions: [
      ["Yuk avtomobilining o'lik zonalari qayerda?", ["Faqat orqada", "Kabina old qismi ostida, o'ng eshik yonida, orqada va tirkama yonlarida", "Faqat chap tomonda", "O'lik zona yo'q"], 1, "Kabina old qismi ostida, o'ng eshik yonida, orqada va tirkamaning yon tomonlarida o'lik zonalar bor."],
      ["Ko'zgularni qachon sozlash kerak?", ["Haftada bir marta", "Har safar harakatdan oldin", "Faqat yangi avtomobilda", "Faqat tunda"], 1, "Ko'zgularni har safar harakatdan oldin sozlang."],
      ["O'ngga burilishdan oldin nima qilinadi?", ["Faqat ko'rsatkich yoqiladi", "Ko'zgular qayta-qayta tekshiriladi", "Tezlik oshiriladi", "Tovush signali beriladi"], 1, "O'ngga burilish va bo'lak almashtirishdan oldin ko'zgularni qayta-qayta tekshiring."],
      ["Tor joyda burilish qanday bajariladi?", ["Burilishni kengroq boshlash, lekin qarama-qarshi bo'lakka chiqmaslik", "Bordyurga yaqin, keskin burilish", "Qarama-qarshi bo'lakdan aylanib", "Orqaga yurib"], 0, "Burilishni kengroq boshlang, lekin qarama-qarshi bo'lakka chiqmang va boshqalarni ogohlantiring.", "MEDIUM"],
      ["Orqaga yurishda ko'rinish yetarli bo'lmasa nima qilinadi?", ["Tez yuriladi", "Yordamchi yoki kamera yordamidan foydalaniladi", "Faqat tovush signali beriladi", "Ko'zlar yumiladi"], 1, "Ko'rinish yetarli bo'lmasa, orqaga yurishda yordamchi yoki kamera yordamidan foydalaning."],
    ],
  },
  {
    course: "C Toifa",
    lesson: "Tormozlash, masofa va qiyaliklar",
    questions: [
      ["To'xtash masofasi qaysi ikki qismdan iborat?", ["Reaksiya vaqtidagi yo'l va tormozlash yo'li", "Tezlik va massa", "Ko'zgu va ko'rsatkich", "Faqat tormozlash yo'li"], 0, "Haydovchi xavfni payqab tormozni bosguncha bosib o'tilgan yo'l va tormozlash yo'li."],
      ["Yuk avtomobili uchun qanday oraliq masofa tavsiya etiladi?", ["Kamida 1 soniya", "Kamida 4 soniya, yomon ob-havoda undan ko'p", "Bir mashina uzunligi", "Masofa shart emas"], 1, "Yengil avtomobilga nisbatan kattaroq — kamida 4 soniya, yomon ob-havoda undan ko'p."],
      ["Uzun tushishda faqat ishchi tormozdan foydalanilsa nima bo'ladi?", ["Hech narsa", "Tormoz mexanizmlari qizib, samaradorligi keskin pasayadi", "Yoqilg'i tejaladi", "Shinalar soviydi"], 1, "Tormoz mexanizmlari qizib, samaradorligi keskin pasayadi.", "MEDIUM"],
      ["Uzun tushishdan oldin nima qilish kerak?", ["Neytralga o'tish", "Past uzatmaga o'tish va dvigatel yoki yordamchi tormozdan foydalanish", "Tezlikni oshirish", "Tormozni o'chirish"], 1, "Past uzatmaga o'ting va dvigatel bilan tormozlash yoki retarderdan foydalaning.", "MEDIUM"],
      ["Pnevmatik tormozli avtomobilda ogohlantiruvchi chiroq yonsa nima qilinadi?", ["Harakat boshlanadi", "Bosim me'yoriga yetguncha harakat boshlanmaydi", "Chiroq e'tiborsiz qoldiriladi", "Tezlik oshiriladi"], 1, "Tizimdagi bosim me'yoriga yetganini tekshiring; ogohlantiruvchi chiroq yonsa, harakatni boshlamang."],
    ],
  },
  {
    course: "C Toifa",
    lesson: "Yukni joylashtirish va mahkamlash",
    questions: [
      ["Og'ir yuk qayerga joylashtiriladi?", ["Yuqoriga va orqaga", "Pastga va kuzov markaziga, oldingi devorga yaqin", "Faqat bir tomonga", "Kabina tomiga"], 1, "Og'ir yukni pastga va kuzov markaziga, oldingi devorga yaqin joylashtiring."],
      ["Yuk nimani yopmasligi kerak?", ["Yoritish asboblari va davlat raqamini", "Faqat orqa oynani", "Faqat bagaj eshigini", "Hech narsani"], 0, "Yuk yoritish asboblari va davlat raqamini yopmasligi, ko'rinish va boshqaruvga xalaqit bermasligi kerak."],
      ["Mahkamlashni qachon qayta tekshirish kerak?", ["Hech qachon", "Harakatning dastlabki kilometrlaridan keyin", "Faqat manzilda", "Faqat yomg'irda"], 1, "Harakatning dastlabki kilometrlaridan keyin mahkamlashni qayta tekshiring."],
      ["Gabaritdan chiqib turgan yuk qanday belgilanadi?", ["Hech qanday belgi kerak emas", "Belgi yoki ogohlantiruvchi bayroqcha, qorong'ida chiroq yoki yorug'lik qaytargich bilan", "Faqat tovush signali bilan", "Faqat yuk egasi imzosi bilan"], 1, "Gabaritdan chiqqan yuk \"Yirik gabaritli yuk\" belgisi yoki bayroqcha, qorong'ida chiroq yoki yorug'lik qaytargich bilan belgilanadi.", "MEDIUM"],
      ["Sochiluvchan yuk (qum, shag'al) qanday tashiladi?", ["Ochiq holda", "Yo'lga to'kilmaydigan qilib yopilgan holda", "Faqat tunda", "Kuzovdan baland qilib"], 1, "Sochiluvchan yukni yo'lga to'kilmaydigan qilib yoping."],
    ],
  },
  {
    course: "C Toifa",
    lesson: "Charchoq, ish va dam olish rejimi",
    questions: [
      ["Quyidagilardan qaysi biri charchoq belgisi?", ["Oxirgi bir necha kilometrni eslay olmaslik", "Yaxshi kayfiyat", "Ochlik", "Musiqa tinglash istagi"], 0, "Oxirgi kilometrlarni eslay olmaslik, tez-tez esnash, bo'lakda tebranish — charchoq belgilari."],
      ["Uzoq safarda qanchalik tez-tez tanaffus qilish tavsiya etiladi?", ["Har 2 soatda", "Har 8 soatda", "Faqat manzilda", "Tanaffus shart emas"], 0, "Har 2 soatda qisqa tanaffus qiling, havoga chiqing, harakat qiling."],
      ["Charchoq belgilari paydo bo'lsa nima qilish kerak?", ["Kofe ichib davom etish", "Birinchi xavfsiz joyda to'xtab dam olish", "Tezlikni oshirib tezroq yetib borish", "Derazani ochib davom etish"], 1, "Charchoq belgilari paydo bo'lsa — birinchi xavfsiz joyda to'xtab dam oling."],
      ["Kofe yoki energetik ichimlik uyquni almashtiradimi?", ["Ha, to'liq almashtiradi", "Yo'q, uyquni almashtirmaydi", "Faqat energetik ichimlik almashtiradi", "Tunda almashtiradi"], 1, "Kofe yoki energetik ichimlik uyquni almashtirmaydi."],
      ["Haydovchining ish va dam olish vaqti nima bilan tartibga solinadi?", ["Faqat haydovchining o'zi bilan", "Qonunchilik va ish beruvchi qoidalari bilan", "Hech narsa bilan", "Faqat yo'l belgilari bilan"], 1, "Ish va dam olish vaqti qonunchilik va ish beruvchi qoidalari bilan tartibga solinadi."],
    ],
  },
];

async function main() {
  let created = 0;
  let updated = 0;
  for (const block of questionBank) {
    const course = await prisma.course.findFirst({ where: { title: { startsWith: block.course, mode: "insensitive" } } });
    if (!course) {
      console.warn(`Course "${block.course}" not found, skipped`);
      continue;
    }
    const lesson = await prisma.lesson.findFirst({ where: { courseId: course.id, title: block.lesson } });
    if (!lesson) {
      console.warn(`Lesson "${block.lesson}" not found in ${course.title}, skipped`);
      continue;
    }
    let order = 1;
    for (const [text, sourceOptions, sourceCorrect, explanation, difficulty = "EASY"] of block.questions) {
      // Rotate the options by the question's position, so the right answer is not always in the same slot
      // (tests shuffle them again for every attempt; this is for every other view of the question).
      const shift = order % 4;
      const options = sourceOptions.map((_, i) => sourceOptions[(i + shift) % 4]);
      const correctIndex = (sourceCorrect - shift + 4) % 4;
      const data = { courseId: course.id, lessonId: lesson.id, options, correctIndex, explanation, difficulty, order, isPublished: true };
      const existing = await prisma.question.findFirst({ where: { lessonId: lesson.id, text } });
      if (existing) {
        await prisma.question.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.question.create({ data: { ...data, text } });
        created += 1;
      }
      order += 1;
    }
  }
  console.log(`Questions: ${created} created, ${updated} updated`);
}

if (require.main === module)
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
