import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Lesson texts for the A, B and C courses (and their three categories). Course titles, descriptions and
 * order live in catalog.ts — run this first, then catalog.ts.
 * Idempotent and non-destructive (unlike prisma/seed.ts it deletes nothing): run it again after edits.
 *   npx tsx prisma/content/courses.ts
 * The texts are general driving theory written for the platform. Before going live, an instructor must
 * check them against the current YHQ (road traffic rules) text.
 */
const prisma = new PrismaClient();

const categories = [
  { slug: "mototsikl", order: 1, name: "Mototsikl va mopedlar", description: "A toifa: ikki g'ildirakli transport", translations: { uz_cyrl: { name: "Мотоцикл ва мопедлар", description: "A тоифа: икки ғилдиракли транспорт" }, ru: { name: "Мотоциклы и мопеды", description: "Категория A: двухколёсный транспорт" } } },
  { slug: "yengil-avtomobil", order: 2, name: "Yengil avtomobillar", description: "B toifa: yengil avtomobillar", translations: { uz_cyrl: { name: "Енгил автомобиллар", description: "B тоифа: енгил автомобиллар" }, ru: { name: "Легковые автомобили", description: "Категория B: легковые автомобили" } } },
  { slug: "yuk-avtomobil", order: 3, name: "Yuk avtomobillari", description: "C toifa: yuk avtomobillari", translations: { uz_cyrl: { name: "Юк автомобиллари", description: "C тоифа: юк автомобиллари" }, ru: { name: "Грузовые автомобили", description: "Категория C: грузовые автомобили" } } },
];

type LessonDef = { title: string; description: string; minutes: number; content: string };
type CourseDef = { match: string; category: string; order: number; title: string; description: string; level: string; lessons: LessonDef[] };

const p = (...parts: string[]) => parts.map((s) => `<p>${s}</p>`).join("\n");
const ul = (...items: string[]) => `<ul>${items.map((s) => `<li>${s}</li>`).join("")}</ul>`;

const courses: CourseDef[] = [
  {
    match: "B Toifa",
    category: "yengil-avtomobil",
    order: 1,
    title: "B toifa — yengil avtomobillar",
    level: "Boshlang'ich",
    description: "Yengil avtomobil haydovchisi uchun asosiy nazariya: haydovchining majburiyatlari, yo'l belgilari, chorrahalar, quvib o'tish va favqulodda holatlar. Har bir mavzu bo'yicha test savollari bilan.",
    lessons: [
      {
        title: "Umumiy qoidalar va haydovchining majburiyatlari",
        description: "Haydovchi o'zi bilan nimani olib yurishi, safardan oldin nimani tekshirishi va yo'lda qanday javobgarlik borligi.",
        minutes: 7,
        content: [
          "<h2>Haydovchi kim va u nimaga javob beradi</h2>",
          p("Haydovchi — transport vositasini boshqarayotgan shaxs. U nafaqat o'zi, balki yo'lovchilari va boshqa yo'l harakati qatnashchilari xavfsizligi uchun ham javob beradi. Yo'l harakati qoidalari (YHQ) barcha qatnashchilar uchun majburiy."),
          "<h3>Haydovchi o'zi bilan olib yurishi kerak bo'lgan hujjatlar</h3>",
          ul("tegishli toifadagi haydovchilik guvohnomasi;", "transport vositasini ro'yxatdan o'tkazish hujjati;", "majburiy sug'urta polisi;", "qonunchilikda nazarda tutilgan boshqa hujjatlar (masalan, ishonchnoma yoki yo'l varaqasi)."),
          "<h3>Safardan oldin tekshiring</h3>",
          ul("tormoz tizimi va rul boshqaruvi soz;", "tashqi yoritish asboblari va burilish ko'rsatkichlari ishlaydi;", "shinalar yeyilmagan, bosimi me'yorida;", "oyna tozalagichlar va ko'zgular joyida."),
          p("Nosozlik yo'lda yuzaga kelsa, uni bartaraf etish yoki ehtiyot choralarini ko'rib, xavfsiz joyga borish kerak. Tormoz yoki rul nosoz bo'lsa, harakatni davom ettirish taqiqlanadi."),
          "<h3>Haydovchiga taqiqlanadi</h3>",
          ul("alkogol, giyohvandlik yoki boshqa mast holatda, shuningdek diqqatni susaytiruvchi dori ta'sirida haydash;", "charchagan yoki kasal holatda haydash;", "harakat vaqtida telefonni qo'lda ushlab gaplashish;", "transport vositasini boshqarishni guvohnomasi yo'q shaxsga topshirish."),
          p("Haydovchi va yo'lovchilar xavfsizlik kamarini taqishi shart. Bolalarni tashishda ularning yoshi va bo'yiga mos ushlab turuvchi qurilmalardan foydalaniladi."),
        ].join("\n"),
      },
      {
        title: "Yo'l belgilari va chiziqlari (1.1 - 7.22)",
        description: "Belgilarning sakkiz guruhi, ularning shakli va rangi, yo'l chiziqlari belgilar bilan qanday birga ishlaydi.",
        minutes: 8,
        content: [
          "<h2>Yo'l belgilarining guruhlari</h2>",
          p("Yo'l belgilari haydovchiga yo'l sharoiti, cheklovlar va tartib haqida oldindan xabar beradi. Ular shakli va rangi bo'yicha guruhlarga bo'linadi — belgini uzoqdan, matnini o'qimasdan ham taniy olish shu bilan ta'minlanadi."),
          ul(
            "<strong>Ogohlantiruvchi</strong> (1-guruh) — oldinda xavfli joy borligini bildiradi. Odatda qizil hoshiyali uchburchak.",
            "<strong>Imtiyoz belgilari</strong> (2-guruh) — chorrahalar va tor joylardan o'tish navbatini belgilaydi (\"Bosh yo'l\", \"Yo'l bering\", \"To'xtamasdan harakatlanish taqiqlanadi\").",
            "<strong>Taqiqlovchi</strong> (3-guruh) — harakatni cheklaydi yoki bekor qiladi. Asosan qizil hoshiyali doira.",
            "<strong>Buyuruvchi</strong> (4-guruh) — majburiy yo'nalish yoki harakat turini ko'rsatadi. Ko'k doira.",
            "<strong>Axborot-ko'rsatkich</strong> (5-guruh) — harakat tartibini o'rnatadi yoki bekor qiladi, joylar haqida ma'lumot beradi.",
            "<strong>Servis belgilari</strong> (6-guruh) — yoqilg'i quyish shoxobchasi, telefon, ovqatlanish joyi va boshqalar.",
            "<strong>Qo'shimcha axborot</strong> (7-guruh, lavhalar) — asosiy belgi ta'sirini aniqlashtiradi: masofa, vaqt, transport turi."
          ),
          "<h3>Yo'l chiziqlari</h3>",
          p("Yo'l chiziqlari (gorizontal belgilar) qatnov qismini bo'laklarga ajratadi, to'xtash chizig'i va piyodalar o'tish joyini ko'rsatadi. Yaxlit chiziqni kesib o'tish taqiqlanadi, uzuq chiziqni esa xavfsiz bo'lganda kesib o'tish mumkin."),
          p("Muhim: vaqtinchalik belgilar (sariq fonli) va tartibga soluvchining ishoralari doimiy belgilar va chiziqlardan ustun turadi."),
        ].join("\n"),
      },
      {
        title: "Chorrahalarda harakatlanish va svetofor signallari",
        description: "Svetofor signallarining ma'nosi, tartibga solingan va tartibga solinmagan chorrahalarda navbat.",
        minutes: 8,
        content: [
          "<h2>Svetofor signallari</h2>",
          ul("<strong>Yashil</strong> — harakatlanishga ruxsat. Miltillovchi yashil tez orada signal almashishini bildiradi.", "<strong>Sariq</strong> — harakat taqiqlanadi va signal almashishidan ogohlantiradi. Keskin tormozlamasdan to'xtab bo'lmasa, harakatni davom ettirishga ruxsat beriladi.", "<strong>Qizil</strong> (shu jumladan miltillovchi) — harakat taqiqlanadi.", "<strong>Miltillovchi sariq</strong> — chorraha tartibga solinmagan; imtiyoz belgilari va qoidalar bo'yicha harakatlaning."),
          p("Qo'shimcha seksiyadagi yashil strelka faqat o'sha yo'nalishga ruxsat beradi; bunda boshqa yo'nalishlardan kelayotganlarga yo'l berish kerak."),
          "<h2>Tartibga solinmagan chorrahalar</h2>",
          p("Teng ahamiyatli yo'llar kesishgan chorrahada <strong>o'ng qo'l qoidasi</strong> amal qiladi: o'ng tomondan kelayotgan transportga yo'l beriladi. Teng bo'lmagan yo'llarda ikkinchi darajali yo'ldagi haydovchi bosh yo'ldagilarga yo'l beradi."),
          p("Chapga burilish yoki qayrilishda qarama-qarshi yo'nalishdan to'g'riga yoki o'ngga harakatlanayotganlarga yo'l beriladi. Burilayotganda kesib o'tilayotgan yo'ldagi piyodalarga ham yo'l bering."),
          "<h3>Chorrahaga chiqmaslik kerak bo'lgan holat</h3>",
          p("Oldinda tirbandlik bo'lsa va chorrahada to'xtab qolib, boshqalar harakatiga xalaqit berishingiz mumkin bo'lsa, ruxsat beruvchi signal yonib turgan bo'lsa ham chorrahaga chiqmang."),
          p("Tartibga soluvchining ishoralari svetofor signallari va belgilardan ustun turadi."),
        ].join("\n"),
      },
      {
        title: "Quvib o'tish, oraliq masofa va manevrlar",
        description: "Quvib o'tishni qachon boshlash mumkin va qachon taqiqlanadi, xavfsiz oraliq masofa qanday tanlanadi.",
        minutes: 7,
        content: [
          "<h2>Manevrdan oldin</h2>",
          p("Har qanday manevrdan (bo'lak almashtirish, burilish, quvib o'tish) oldin ko'zgularga qarang, burilish ko'rsatkichini oldindan yoqing va manevr boshqalarga xalaqit bermasligiga ishonch hosil qiling. Ko'rsatkich sizga imtiyoz bermaydi."),
          "<h2>Quvib o'tish</h2>",
          p("Quvib o'tishni boshlashdan oldin quyidagilarga ishonch hosil qiling:"),
          ul("qarama-qarshi bo'lak quvib o'tish uchun yetarli masofada bo'sh;", "orqangizdan kelayotgan transport quvib o'tishni boshlamagan;", "oldingi transport chapga burilish yoki quvib o'tish ishorasini bermagan;", "quvib o'tgandan keyin quvilayotgan transportga xalaqit bermasdan o'z bo'lagingizga qayta olasiz."),
          p("Quvib o'tish odatda chorrahalarda, piyodalar o'tish joylarida, temir yo'l kesishmalarida, ko'priklarda va ko'rinish cheklangan joylarda (burilish, qiyalik cho'qqisi) taqiqlanadi. Aniq ro'yxat YHQ va yo'l belgilarida ko'rsatilgan."),
          p("Sizni quvib o'tishayotganda tezlikni oshirmang va xalaqit bermang."),
          "<h2>Oraliq masofa</h2>",
          p("Oldingi transport keskin tormozlasa, to'qnashmasdan to'xtay oladigan masofani saqlang. Amaliy usul — <strong>kamida 2 soniya qoidasi</strong>: oldingi mashina biror belgidan o'tgandan keyin siz shu joyga kamida 2 soniyada yetib kelishingiz kerak. Nam, qorli yoki tungi yo'lda bu vaqtni ikki-uch barobar oshiring."),
        ].join("\n"),
      },
      {
        title: "Favqulodda holatlar va birinchi yordam",
        description: "Yo'l-transport hodisasida haydovchining harakatlari, avariya belgisi va jabrlanuvchiga birinchi yordam.",
        minutes: 7,
        content: [
          "<h2>Yo'l-transport hodisasi sodir bo'lsa</h2>",
          ul("darhol to'xtang, avariya yorug'lik signalizatsiyasini yoqing va avariya to'xtash belgisini o'rnating;", "transport vositasini va hodisaga aloqador narsalarni joyidan qo'zg'atmang (jabrlanuvchiga yordam yoki boshqa transport o'tishi uchun zarur bo'lgan hollar bundan mustasno);", "jabrlanuvchilarga birinchi yordam ko'rsating va tez yordam chaqiring (103), hodisa haqida politsiyaga xabar bering (102) yoki yagona raqam 112 ga qo'ng'iroq qiling;", "guvohlarning ism-sharifi va telefonini yozib oling."),
          "<h3>Birinchi yordam: asosiy tartib</h3>",
          ul("<strong>Xavfsizlik:</strong> avval o'zingiz va jabrlanuvchi uchun xavf yo'qligiga ishonch hosil qiling (harakat, yong'in xavfi).", "<strong>Hushini tekshiring:</strong> baland ovozda murojaat qiling, yelkasiga yengil teging.", "<strong>Nafasni tekshiring:</strong> nafas olmasa — tez yordamga qo'ng'iroq qiling va yurak-o'pka reanimatsiyasini boshlang.", "<strong>Qon ketishini to'xtating:</strong> jarohatni bevosita bosib turing, kuchli qon ketishda bog'lam qo'ying.", "<strong>Kutish:</strong> jabrlanuvchini isitib, tez yordam kelguncha yonida bo'ling."),
          p("Umurtqa pog'onasi shikastlanganiga shubha bo'lsa, jabrlanuvchini zarurat bo'lmasa joyidan siljitmang va boshini qimirlatmang."),
          p("Avtomobilda soz holatdagi aptechka va o't o'chirgich bo'lishi shart. Ularning yaroqlilik muddatini vaqti-vaqti bilan tekshiring."),
        ].join("\n"),
      },
    ],
  },
  {
    match: "A Toifa",
    category: "mototsikl",
    order: 2,
    title: "A toifa — mototsikl va mopedlar",
    level: "Boshlang'ich",
    description: "Ikki g'ildirakli transport haydovchisi uchun: himoya ekipirovkasi, yo'lda ko'rinib turish, tormozlash va burilish texnikasi, yo'lovchi va yuk tashish.",
    lessons: [
      {
        title: "Mototransport turlari va A toifa",
        description: "Mototsikl, moped va skuterning farqi; qaysi transportga qaysi guvohnoma kerak.",
        minutes: 6,
        content: [
          "<h2>Ikki g'ildirakli transport turlari</h2>",
          p("Mototsikl — ikki (yon aravachali bo'lsa uch) g'ildirakli, dvigatelli transport vositasi. Moped va kichik skuterlar — dvigatel hajmi va maksimal tezligi cheklangan yengil mototransport. Ular uchun talab qilinadigan guvohnoma toifasi va haydovchi yoshi qonunchilikda belgilanadi."),
          p("A toifali guvohnoma mototsikllarni boshqarish huquqini beradi. Mototsikl haydovchisiga ham avtomobil haydovchisi kabi YHQning barcha umumiy talablari to'liq tegishli: svetofor, belgilar, tezlik, navbat."),
          "<h3>Nima uchun mototsikl alohida e'tibor talab qiladi</h3>",
          ul("haydovchini kuzov himoya qilmaydi — kichik to'qnashuv ham og'ir jarohatga olib kelishi mumkin;", "mototsikl kichik bo'lgani uchun boshqa haydovchilar uni kech payqaydi;", "muvozanat yo'l qoplamasiga (qum, moy, nam chiziqlar, quduq qopqoqlari) juda sezgir;", "tormozlash va burilish texnikasi avtomobildan farq qiladi."),
          p("Keyingi darslarda shu xavflarni qanday kamaytirish o'rganiladi."),
        ].join("\n"),
      },
      {
        title: "Himoya ekipirovkasi va safarga tayyorgarlik",
        description: "Shlem va himoya kiyimi, harakatdan oldingi qisqa texnik tekshiruv.",
        minutes: 6,
        content: [
          "<h2>Shlem — majburiy</h2>",
          p("Mototsikl yoki mopedda harakatlanayotganda haydovchi va yo'lovchi tasmasi mahkam bog'langan mototsikl shlemida bo'lishi shart. Shlem boshga mos o'lchamda, sertifikatlangan va shikastlanmagan bo'lsin; kuchli zarbadan keyin shlemni almashtirish tavsiya etiladi."),
          "<h3>Himoya kiyimi</h3>",
          ul("qo'lqop — yiqilganda kaftni va boshqaruvni saqlaydi;", "zich kurtka va shim (imkon bo'lsa himoya qo'shimchalari bilan);", "to'pig'ini yopadigan mustahkam poyabzal;", "yorqin yoki yorug'lik qaytaruvchi elementli kiyim — sizni ko'rinadigan qiladi."),
          "<h2>Harakatdan oldingi tekshiruv</h2>",
          ul("<strong>Shinalar:</strong> bosim va protektor holati;", "<strong>Tormozlar:</strong> oldingi va orqa tormoz ishlashi, dastak va pedal yurishi;", "<strong>Yoritish:</strong> fara, stop-signal, burilish ko'rsatkichlari, tovush signali;", "<strong>Zanjir yoki tasma:</strong> taranglik va moylanganlik;", "<strong>Ko'zgular:</strong> to'g'ri sozlangan va toza."),
          p("Kichik nosozlik ham mototsiklda muvozanat va tormozlash masofasiga kuchli ta'sir qiladi. Shubha bo'lsa — yo'lga chiqmang."),
        ].join("\n"),
      },
      {
        title: "Yo'lda joylashuv va ko'rinib turish",
        description: "Bo'lakda qayerda harakatlanish, o'lik zonalardan qochish, chorrahalardagi xavf.",
        minutes: 7,
        content: [
          "<h2>Ko'rinib turing</h2>",
          p("Mototsiklchilar ishtirokidagi hodisalarning ko'p qismi boshqa haydovchi mototsiklni \"ko'rmagani\" sababli sodir bo'ladi. Shuning uchun asosiy qoida: <strong>sizni ko'rishlariga ishonmang — o'zingiz ko'rinadigan bo'ling</strong>."),
          ul("bo'lakda shunday joylashingki, oldingi avtomobil haydovchisi sizni ko'zgusida ko'rsin;", "yuk mashinalari va avtobuslarning yon tomonida — o'lik zonasida uzoq qolmang;", "fara yoqilgan holda harakatlaning;", "manevrni oldindan, aniq ko'rsatkich bilan bildiring."),
          "<h2>Chorrahalar — eng xavfli joy</h2>",
          p("Chapga burilayotgan avtomobil qarama-qarshi kelayotgan mototsiklning tezligi va masofasini ko'pincha noto'g'ri baholaydi. Chorrahaga yaqinlashganda tezlikni pasaytiring, tormozga tayyor turing va boshqa haydovchining ko'ziga qarashga harakat qiling."),
          "<h3>Avtomobillar orasidan o'tish</h3>",
          p("Qatorlar orasidan (bo'laklar chegarasi bo'ylab) o'tib ketish xavfli: eshik ochilishi, kutilmagan bo'lak almashtirish. Bunday harakat YHQ talablariga zid bo'lishi mumkin — har doim belgilangan bo'lakda harakatlaning."),
          p("Yo'l qoplamasini kuzating: qum, shag'al, moy dog'lari, nam yo'l chiziqlari va temir qopqoqlar ustida keskin tormozlash va burilishdan saqlaning."),
        ].join("\n"),
      },
      {
        title: "Tormozlash va burilish texnikasi",
        description: "Oldingi va orqa tormozdan to'g'ri foydalanish, burilishda tezlik va qiyalik.",
        minutes: 7,
        content: [
          "<h2>Tormozlash</h2>",
          p("Mototsiklning to'xtash kuchining katta qismini <strong>oldingi tormoz</strong> beradi. Samarali tormozlash uchun ikkala tormozni birga, ravon kuch bilan bosing. Keskin bosish, ayniqsa nam yo'lda, g'ildirakni bloklab, yiqilishga olib kelishi mumkin."),
          ul("tormozlashni mototsikl tik turgan holatda bajaring;", "burilish ichida keskin tormozlamang — tezlikni burilishga kirishdan oldin pasaytiring;", "ABS bo'lsa ham masofani saqlang: ABS g'ildirak bloklanishini oldini oladi, ammo to'xtash masofasini qisqartirmaydi."),
          "<h2>Burilish</h2>",
          ul("<strong>Oldin sekinlang:</strong> tezlikni burilishga kirguncha to'g'ri chiziqda kamaytiring;", "<strong>Qarang:</strong> borayotgan yo'nalishingizga, burilish chiqishiga qarang — mototsikl nigoh tomonga boradi;", "<strong>Ravon gaz:</strong> burilish davomida gazni bir tekis, chiqishda asta-sekin oshiring."),
          p("Tushish qiyaligida dvigatel bilan tormozlashdan foydalaning, tormozlarni qizdirib yubormang."),
        ].join("\n"),
      },
      {
        title: "Yo'lovchi va yuk tashish",
        description: "Yo'lovchini xavfsiz tashish shartlari, yuk joylashtirish va muvozanat.",
        minutes: 5,
        content: [
          "<h2>Yo'lovchi tashish</h2>",
          p("Yo'lovchi faqat buning uchun mo'ljallangan o'rindiqda, oyoq tayanchlari bo'lgan mototsiklda tashiladi va u ham mototsikl shlemida bo'lishi shart. Mototsiklda bolalarni tashish yoshga oid cheklovlar YHQda belgilangan — ularni albatta tekshiring."),
          ul("yo'lovchiga harakatdan oldin qanday o'tirishni tushuntiring: haydovchini ushlab turish, burilishda haydovchi bilan birga qiyalanish, oyoqlarni tayanchdan olmaslik;", "yo'lovchi bilan tormozlash masofasi uzayadi va mototsikl og'irroq boshqariladi — tezlikni moslang."),
          "<h2>Yuk tashish</h2>",
          ul("yukni maxsus bagaj qutisi yoki tayanchga mahkam bog'lang;", "yuk haydovchiga xalaqit bermasin, ko'rinishni yopmasin va yoritish asboblarini to'smasin;", "og'irlikni pastroq va markazga yaqin joylashtiring — muvozanat saqlanadi;", "ishlab chiqaruvchi belgilagan maksimal yuklamadan oshirmang."),
        ].join("\n"),
      },
    ],
  },
  {
    match: "C Toifa",
    category: "yuk-avtomobil",
    order: 3,
    title: "C toifa — yuk avtomobillari",
    level: "O'rta",
    description: "Ruxsat etilgan to'la massasi 3 500 kg dan ortiq yuk avtomobillari haydovchisi uchun: gabarit va o'lik zonalar, og'ir avtomobilni tormozlash, yukni joylashtirish va mahkamlash, ish va dam olish rejimi.",
    lessons: [
      {
        title: "C toifa va yuk avtomobilining xususiyatlari",
        description: "C toifa qaysi transportni o'z ichiga oladi va og'ir avtomobil yengil avtomobildan nimasi bilan farq qiladi.",
        minutes: 6,
        content: [
          "<h2>C toifa</h2>",
          p("C toifali guvohnoma ruxsat etilgan to'la massasi 3 500 kg dan ortiq yuk avtomobillarini boshqarish huquqini beradi (tirkama bilan boshqarish uchun qo'shimcha toifa talab qilinishi mumkin). Haydovchiga YHQning umumiy talablari bilan birga yuk tashishga oid maxsus talablar ham tegishli."),
          "<h3>Og'ir avtomobilni boshqarishdagi farqlar</h3>",
          ul("<strong>Massa va inersiya:</strong> to'xtash masofasi ancha uzun, ayniqsa yuklangan holatda;", "<strong>Gabarit:</strong> balandlik, kenglik va uzunlik ko'priklar, tunnellar va tor ko'chalarda cheklov bo'lishi mumkin;", "<strong>Burilish radiusi:</strong> orqa g'ildiraklar burilish ichiga qarab \"kesib\" o'tadi;", "<strong>Ko'rinish:</strong> kabina atrofida katta o'lik zonalar mavjud."),
          p("Gabarit va massa cheklovlarini bildiruvchi taqiqlovchi belgilarga (balandlik, kenglik, massa, o'q yuklamasi cheklovi) alohida e'tibor bering — ular aynan yuk avtomobillari uchun."),
        ].join("\n"),
      },
      {
        title: "Gabarit, o'lik zonalar va burilish",
        description: "Kabinadan ko'rinmaydigan joylar, ko'zgularni sozlash, tor joylarda burilish.",
        minutes: 7,
        content: [
          "<h2>O'lik zonalar</h2>",
          p("Yuk avtomobili atrofida haydovchi ko'zgularda ham ko'ra olmaydigan joylar bor: kabinaning old qismi ostida, o'ng eshik yonida, orqada va tirkamaning yon tomonlarida. Velosipedchi, piyoda yoki yengil avtomobil u yerda butunlay ko'rinmay qolishi mumkin."),
          ul("ko'zgularni har safar harakatdan oldin sozlang (asosiy, keng burchakli, old va bordyur ko'zgulari);", "o'ngga burilish va bo'lak almashtirishdan oldin ko'zgularni qayta-qayta tekshiring;", "ko'rinish yetarli bo'lmasa, orqaga yurishda yordamchi yoki kamera yordamidan foydalaning."),
          "<h2>Burilish</h2>",
          p("Burilishda orqa g'ildiraklar old g'ildiraklarga nisbatan qisqaroq yo'l bilan yuradi — bordyur, ustun yoki burilish ichida turgan transportga tegib ketish xavfi bor. Shuning uchun burilishni kengroq boshlang, lekin qarama-qarshi bo'lakka chiqmang va boshqa qatnashchilarni ogohlantiring."),
          p("Tor joydan o'tishdan oldin balandlik va kenglik belgisini tekshiring; avtomobilingizning aniq gabaritlarini (yuk bilan birga) bilib qo'ying."),
        ].join("\n"),
      },
      {
        title: "Tormozlash, masofa va qiyaliklar",
        description: "Og'ir avtomobilning to'xtash masofasi, oraliq masofa, tushishda dvigatel bilan tormozlash.",
        minutes: 7,
        content: [
          "<h2>To'xtash masofasi</h2>",
          p("To'xtash masofasi ikki qismdan iborat: haydovchi xavfni payqab, tormozni bosguncha bosib o'tilgan yo'l (reaksiya vaqti) va tormozlash yo'li. Massa ortgan sari tormozlash yo'li uzayadi; nam yoki sirpanchiq yo'lda u yana bir necha barobar oshadi."),
          ul("yengil avtomobilga nisbatan kattaroq oraliq masofa saqlang (kamida 4 soniya, yomon ob-havoda undan ko'p);", "tirbandlikda oldingi transport bilan oraliqni tashlab qo'ying — kimdir oldingizga kirsa ham masofa qoladi;", "tezlikni oldindan pasaytiring: og'ir avtomobilni keskin to'xtatish yukning siljishiga olib kelishi mumkin."),
          "<h2>Uzun tushishlar</h2>",
          p("Uzoq tushishda faqat ishchi tormozdan foydalanilsa, tormoz mexanizmlari qizib, samaradorligi keskin pasayadi. Tushishdan oldin past uzatmaga o'ting va dvigatel bilan tormozlash yoki yordamchi tormoz tizimidan (retarder) foydalaning."),
          p("Pnevmatik tormozli avtomobilda harakatdan oldin tizimdagi bosim me'yoriga yetganini tekshiring; ogohlantiruvchi chiroq yonsa, harakatni boshlamang."),
        ].join("\n"),
      },
      {
        title: "Yukni joylashtirish va mahkamlash",
        description: "Yuk og'irlik markazi, o'q yuklamasi, mahkamlash usullari va gabaritdan chiqqan yuk.",
        minutes: 7,
        content: [
          "<h2>Yukni to'g'ri joylashtiring</h2>",
          p("Yuk haydovchining ko'rinishini cheklamasligi, boshqaruvga xalaqit bermasligi, transport vositasining barqarorligini buzmasligi, yoritish asboblari va davlat raqamini yopmasligi kerak."),
          ul("og'ir yukni pastga va kuzov markaziga, oldingi devorga yaqin joylashtiring;", "o'qlar bo'yicha yuklamani teng taqsimlang, ruxsat etilgan to'la massa va o'q yuklamasidan oshirmang;", "yukni tasma, zanjir, to'siq yoki tayanchlar bilan mahkamlang — tormozlash va burilishda yuk siljimasligi kerak;", "harakatning dastlabki kilometrlaridan keyin mahkamlashni qayta tekshiring."),
          "<h2>Gabaritdan chiqqan yuk</h2>",
          p("Transport vositasi gabaritidan old yoki orqa tomonga chiqib turgan yuk alohida belgilanadi (\"Yirik gabaritli yuk\" belgisi yoki ogohlantiruvchi bayroqcha, qorong'ida — yoritish chirog'i yoki yorug'lik qaytargich). Gabarit yoki massa cheklovlaridan oshgan yuk faqat maxsus ruxsatnoma bilan tashiladi."),
          p("Sochiluvchan yukni (qum, shag'al) yo'lga to'kilmaydigan qilib yoping."),
        ].join("\n"),
      },
      {
        title: "Charchoq, ish va dam olish rejimi",
        description: "Uzoq safarlarda charchoq belgilari va xavfsiz dam olish tartibi.",
        minutes: 5,
        content: [
          "<h2>Charchoq — yashirin xavf</h2>",
          p("Uzoq vaqt rul ortida o'tirish diqqat va reaksiyani sezilmasdan pasaytiradi. Og'ir avtomobilda bir soniyalik e'tiborsizlik ham katta oqibatga olib keladi."),
          "<h3>Charchoq belgilari</h3>",
          ul("tez-tez esnash, ko'zlarning og'irlashishi;", "oxirgi bir necha kilometrni eslay olmaslik;", "bo'lak ichida tebranib qolish, belgilarni o'tkazib yuborish;", "tezlikni beixtiyor o'zgartirish."),
          "<h2>Nima qilish kerak</h2>",
          ul("safar rejasini dam olish to'xtashlari bilan tuzing;", "har 2 soatda qisqa tanaffus qiling, havoga chiqing, harakat qiling;", "charchoq belgilari paydo bo'lsa — birinchi xavfsiz joyda to'xtab dam oling;", "kofe yoki energetik ichimlik uyquni almashtirmaydi."),
          p("Yuk tashuvchi tashkilotlarda haydovchining ish va dam olish vaqti qonunchilik va ish beruvchi qoidalari bilan tartibga solinadi — ularga rioya qiling."),
        ].join("\n"),
      },
    ],
  },
];

async function main() {
  const catIds: Record<string, string> = {};
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, order: c.order, translations: c.translations, isActive: true },
      create: { slug: c.slug, name: c.name, description: c.description, order: c.order, translations: c.translations },
    });
    catIds[c.slug] = row.id;
  }

  for (const def of courses) {
    const course = await prisma.course.findFirst({ where: { title: { startsWith: def.match, mode: "insensitive" } } });
    if (!course) {
      console.warn(`Course "${def.match}" not found, skipped`);
      continue;
    }
    // Title, description, order and level are owned by catalog.ts; this script only fills the lesson texts.
    await prisma.course.update({ where: { id: course.id }, data: { categoryId: catIds[def.category] } });

    let order = 1;
    for (const l of def.lessons) {
      const existing = await prisma.lesson.findFirst({ where: { courseId: course.id, title: l.title } });
      // Text lessons: the old placeholder clip (an unrelated cartoon) is removed; real videos are added from the admin panel.
      const data = { description: l.description, content: l.content, duration: l.minutes * 60, order, isPublished: true, videoUrl: null };
      if (existing) await prisma.lesson.update({ where: { id: existing.id }, data });
      else await prisma.lesson.create({ data: { ...data, courseId: course.id, title: l.title } });
      order += 1;
    }
    console.log(`${def.title}: ${def.lessons.length} lessons`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
