import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_VIDEO = "https://www.w3schools.com/html/mov_bbb.mp4";

async function main() {
  // The seed wipes content tables, so it must never run against a production database.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the demo seed with NODE_ENV=production");
  }
  // NODE_ENV alone is not enough: a dev shell can still point DATABASE_URL at a real server. Only local databases are allowed.
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname.replace(/^\[|\]$/g, "");
    } catch {
      return "";
    }
  })();
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
  if (!LOCAL_HOSTS.includes(host) && process.env.SEED_ALLOW_NON_LOCAL_DB !== "true") {
    throw new Error(
      `Refusing to run the demo seed against non-local database host "${host || "?"}". ` +
        "It deletes courses, lessons, questions and test results. Set SEED_ALLOW_NON_LOCAL_DB=true only for a disposable database.",
    );
  }

  // Demo credentials are for local development only; override them via the environment.
  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "admin123", 10);
  const userHash = await bcrypt.hash(process.env.SEED_USER_PASSWORD || "user123", 10);

  await prisma.user.upsert({
    where: { email: "admin@eavto.uz" },
    update: { role: "ADMIN", phone: "+998900000001" },
    create: {
      name: "Admin",
      email: "admin@eavto.uz",
      phone: "+998900000001", // demo login: phone + password

      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "user@eavto.uz" },
    update: { phone: "+998900000002" },
    create: {
      name: "Demo User",
      email: "user@eavto.uz",
      phone: "+998900000002",
      passwordHash: userHash,
      role: "USER",
    },
  });

  await prisma.userAnswer.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.video.deleteMany({});
  await prisma.lessonProgress.deleteMany({});
  await prisma.progress.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.course.deleteMany({});

  const course1 = await prisma.course.create({
    data: {
      title: "B Toifa — Yengil Avtomobillar (YHQ 2026)",
      description:
        "B toifadagi transport vositalarini boshqarish huquqini beruvchi to'liq o'quv dasturi, barcha 150 ta mavzu va YHQ qoidalari.",
      thumbnail: "https://images.unsplash.com/photo-1722088386429-3c5a5afa77e5?w=800&auto=format&fit=crop&q=80",
      level: "Boshlang'ich",
      order: 1,
    },
  });

  await prisma.course.create({
    data: {
      title: "A Toifa — Mototsikl va Mopedlar",
      description:
        "Ikki g'ildirakli transport vositalarini xavfsiz boshqarish, manevrlar va maxsus qoidalar.",
      thumbnail: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80",
      level: "Boshlang'ich",
      order: 2,
    },
  });

  await prisma.course.create({
    data: {
      title: "C Toifa — Yuk Avtomobillari",
      description:
        "To'la vazni 3.5 tonnadan ortiq yuk avtomobillarini boshqarish, yuk tashish qoidalari va gabarit cheklovlari.",
      thumbnail: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop&q=80",
      level: "O'rta",
      order: 3,
    },
  });

  const lesson1 = await prisma.lesson.create({
    data: {
      courseId: course1.id,
      title: "Umumiy qoidalar va haydovchining majburiyatlari",
      description: "Asosiy tushunchalar, xavfsizlik kamari, hujjatlar va YTH holatlari.",
      videoUrl: SAMPLE_VIDEO,
      thumbnail: null,
      duration: 300,
      order: 1,
    },
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      courseId: course1.id,
      title: "Yo'l belgilari va chiziqlari (1.1 - 7.22)",
      description: "Ogohlantiruvchi, imtiyoz, taqiqlovchi, buyuruvchi va axborot belgilari.",
      videoUrl: SAMPLE_VIDEO,
      thumbnail: null,
      duration: 280,
      order: 2,
    },
  });

  const lesson3 = await prisma.lesson.create({
    data: {
      courseId: course1.id,
      title: "Chorrahalarda harakatlanish va svetofor signallari",
      description: "Tartibga solingan va solinmagan chorrahalar, o'ng qo'l qoidasi va imtiyozlar.",
      videoUrl: SAMPLE_VIDEO,
      thumbnail: null,
      duration: 320,
      order: 3,
    },
  });

  await prisma.video.create({
    data: {
      lessonId: lesson1.id,
      url: SAMPLE_VIDEO,
      title: "Umumiy qoidalar videosi",
      duration: 300,
    },
  });

  const questionsData = [
    {
      text: "2.1 'Bosh yo'l' yo'l belgisining ma'nosi nima?",
      options: ["Asosiy yo'l (Bosh yo'l)", "Yo'l bering", "To'xtash taqiqlanadi", "Bir tomonlama harakat"],
      correctIndex: 0,
      explanation: "2.1 'Bosh yo'l' belgisi tartibga solinmagan chorrahalardan birinchi bo'lib o'tish imtiyozini beradi.",
    },
    {
      text: "Aholi punktlarida ogohlantiruvchi belgilar xavfli joydan qanday masofada o'rnatiladi?",
      options: ["150 - 300 metr", "50 - 100 metr", "10 - 30 metr", "Darhol xavf oldida"],
      correctIndex: 1,
      explanation: "Ogohlantiruvchi belgilar aholi punktlarida 50-100 metr, aholi punktidan tashqarida 150-300 metr masofada o'rnatiladi.",
    },
    {
      text: "Yengil avtomobillarga aholi punktlarida ruxsat etilgan maksimal tezlik qancha?",
      options: ["70 km/soat", "60 km/soat", "80 km/soat", "50 km/soat"],
      correctIndex: 1,
      explanation: "O'zbekiston Respublikasida aholi punktlarida ruxsat etilgan maksimal tezlik 60 km/soatni tashkil etadi.",
    },
    {
      text: "Tartibga soluvchining (YPX inspektori) ishoralari va svetofor signallari o'rtasida ziddiyat bo'lsa, haydovchi nima qilishi kerak?",
      options: [
        "Faqat svetofor signallariga amal qilish kerak",
        "Faqat Tartibga soluvchining ishoralariga bo'ysunish shart",
        "Yo'l belgilari talabi bo'yicha harakatlanish kerak",
        "Ikkalasini kelishtirib harakatlanish kerak",
      ],
      correctIndex: 1,
      explanation: "Tartibga soluvchining ishoralari svetofor signallari va yo'l belgilariga nisbatan mutlaq ustuvor hisoblanadi.",
    },
    {
      text: "Teng ahamiyatli yo'llar chorrahasida kim birinchi bo'lib o'tadi?",
      options: [
        "To'g'riga ketayotgan transport vositasi",
        "O'ng tomondan kelayotgan transport vositasi",
        "Chap tomondan kelayotgan transport vositasi",
        "Katta tezlikda harakatlanayotgan transport",
      ],
      correctIndex: 1,
      explanation: "Teng ahamiyatli chorrahada 'O'ng qo'l' qoidasi bo'yicha o'ng tomondan kelayotgan transportga yo'l beriladi.",
    },
    {
      text: "Qaysi belgi transport vositalarining to'xtashini (hatto 1 daqiqaga ham) qat'iyan taqiqlaydi?",
      options: [
        "3.28 To'xtab turish taqiqlangan",
        "3.27 To'xtash taqiqlangan",
        "2.4 Yo'l bering",
        "3.2 Harakatlanish taqiqlangan",
      ],
      correctIndex: 1,
      explanation: "3.27 'To'xtash taqiqlangan' belgisi har qanday maqsadli to'xtashni taqiqlaydi.",
    },
    {
      text: "1.3 qo'shaloq yaxlit chiziqni bosib o'tish yoki ustidan qayrilib olish mumkinmi?",
      options: [
        "Ha, tezlik kam bo'lsa mumkin",
        "Faqat quvib o'tish paytida mumkin",
        "Yo'q, mutlaqo taqiqlanadi",
        "Faqat tunda mumkin",
      ],
      correctIndex: 2,
      explanation: "1.3 qo'shaloq yaxlit chiziqni bosib o'tish yoki ustidan qayrilib olish qat'iyan man etiladi.",
    },
    {
      text: "Piyodalar o'tish joyi oldida to'xtash kamida qancha masofada ruxsat etiladi?",
      options: ["10 metr", "5 metr", "15 metr", "20 metr"],
      correctIndex: 1,
      explanation: "Piyodalar o'tish joyidan kamida 5 metr oldinda to'xtashga ruxsat beriladi.",
    },
    {
      text: "Turar joy dahalarida (jiloy zona) ruxsat etilgan maksimal tezlik me'yori qancha?",
      options: ["30 km/soat", "20 km/soat", "40 km/soat", "15 km/soat"],
      correctIndex: 1,
      explanation: "Turar joy dahalarida va hovlilarda tezlik 20 km/soatdan oshmasligi shart.",
    },
    {
      text: "Aholi punktlaridan tashqarida favqulodda to'xtaganda avariya belgisi qancha masofaga o'rnatiladi?",
      options: ["15 metr", "30 metr", "50 metr", "100 metr"],
      correctIndex: 1,
      explanation: "Avariya to'xtash belgisi aholi punktidan tashqarida kamida 30 metr masofaga o'rnatiladi.",
    },
    {
      text: "Svetoforning asosiy qizil chirog'i bilan bir vaqtda yongan yashil qo'shimcha seksiyada burilayotgan haydovchi:",
      options: [
        "Boshqa yo'nalishdagi barcha transportlarga yo'l berishi shart",
        "Birinchi bo'lib imtiyoz bilan o'tadi",
        "Faqat piyodalarga yo'l beradi",
        "Faqat tramvayga yo'l beradi",
      ],
      correctIndex: 0,
      explanation: "Qo'shimcha seksiyada harakatlanayotgan haydovchi boshqa yo'nalishdagi barcha transportlarga yo'l berishi shart.",
    },
    {
      text: "Tartibga solinmagan chorrahalarda quvib o'tishga ruxsat etiladimi?",
      options: [
        "Mutlaqo taqiqlanadi",
        "Faqat asosiy (bosh) yo'ldan harakatlanayotganda ruxsat etiladi",
        "Tezlik 50 km/soatdan oshmasa ruxsat",
        "Har doim ruxsat etiladi",
      ],
      correctIndex: 1,
      explanation: "Tartibga solinmagan chorrahada faqat bosh yo'ldan ketayotganda quvib o'tishga ruxsat etiladi.",
    },
    {
      text: "O'ngga burilish manevrini bajarayotgan transport vositasi qaysi polosa tomon harakatlanishi kerak?",
      options: [
        "Istalgan bo'sh polosaga",
        "Imkon qadar qatnov qismining eng chetki o'ng tomoniga",
        "Faqat o'rta polosaga",
        "Chap polosaga",
      ],
      correctIndex: 1,
      explanation: "O'ngga burilishda haydovchi iloji boricha qatnov qismining chetki o'ng tomoniga yaqin burilishi shart.",
    },
    {
      text: "2.5 'STOP' belgisi oldida harakatlanish qanday amalga oshiriladi?",
      options: [
        "Tezlikni pasaytirib to'xtamasdan o'tish mumkin",
        "To'liq to'xtash shart, yo'l berib so'ng davom etiladi",
        "Faqat boshqa mashina bo'lsa to'xtaladi",
        "Faqat tunda to'xtash kerak",
      ],
      correctIndex: 1,
      explanation: "Stop-chiziq oldida to'liq to'xtab, yo'l berib keyin harakatlanish shart.",
    },
    {
      text: "12 yoshga to'lmagan bolalarni yengil avtomobilning old o'rindig'ida olib yurish mumkinmi?",
      options: [
        "Mutlaqo taqiqlanadi",
        "Faqat maxsus bolalar o'rindig'i (avtokreslo) bo'lganda ruxsat etiladi",
        "Kattalar quchog'ida olib yurish mumkin",
        "Cheklovsiz ruxsat beriladi",
      ],
      correctIndex: 1,
      explanation: "Old o'rindiqda faqat bolalarni ushlab turuvchi maxsus moslama (avtokreslo) bo'lgandagina ruxsat etiladi.",
    },
    {
      text: "Egiluvchan ulanmada (tros) shatakka olishda ulanmaning uzunligi qancha bo'lishi kerak?",
      options: ["2 - 4 metr", "4 - 6 metr", "6 - 8 metr", "3 - 5 metr"],
      correctIndex: 1,
      explanation: "Egiluvchan ulanma uzunligi 4 metrdan 6 metrgacha bo'lishi shart.",
    },
    {
      text: "Yo'l yaxmalak (muzlama) bo'lgan sharoitda egiluvchan ulanmada shatakka olishga ruxsat etiladimi?",
      options: [
        "Ha, tezlik 20 km/soat bo'lsa mumkin",
        "Yo'q, qat'iyan taqiqlanadi",
        "Faqat shahar ichida mumkin",
        "Faqat yuk mashinalariga mumkin",
      ],
      correctIndex: 1,
      explanation: "Yaxmalakda egiluvchan ulanmada shatakka olish qat'iyan taqiqlanadi.",
    },
    {
      text: "Arterial qon ketishida qon to'xtatuvchi jgut yoz vaqtida maksimal qancha muddatga qo'yiladi?",
      options: ["30 daqiqa", "1 soat", "2 soat", "15 daqiqa"],
      correctIndex: 1,
      explanation: "Jgut yozda ko'pi bilan 1 soat, qishda 30 daqiqa muddatga qo'yiladi.",
    },
    {
      text: "Yengil avtomobillar shinalari protektorining eng kam ruxsat etilgan qoldiq balandligi qancha?",
      options: ["1.0 mm", "1.6 mm", "2.0 mm", "0.8 mm"],
      correctIndex: 1,
      explanation: "Yengil avtomobillar uchun shina protektori balandligi kamida 1.6 mm bo'lishi talab qilinadi.",
    },
    {
      text: "Tunda uzoqni yorituvchi chiroqlarni qarama-qarshi kelayotgan transportga kamida qancha masofa qolganda yaqinga o'tkazish kerak?",
      options: ["100 metr", "150 metr", "200 metr", "300 metr"],
      correctIndex: 1,
      explanation: "Qarama-qarshi haydovchini ko'r qilmaslik uchun kamida 150 metr qolganda yaqin chiroqqa o'tkaziladi.",
    },
    {
      text: "Avtomagistrallarda yengil avtomobillar uchun ruxsat etilgan yuqori tezlik me'yori qancha?",
      options: ["100 km/soat", "110 km/soat", "120 km/soat", "130 km/soat"],
      correctIndex: 1,
      explanation: "Avtomagistrallarda yengil avtomobillarga maksimal 110 km/soat tezlik ruxsat etiladi.",
    },
    {
      text: "Barcha yo'llarda nosoz transport vositasini shatakka olib ketayotganda maksimal tezlik qancha?",
      options: ["40 km/soat", "50 km/soat", "60 km/soat", "70 km/soat"],
      correctIndex: 1,
      explanation: "Nosoz transportni shatakka olganda maksimal tezlik 50 km/soatdan oshmasligi kerak.",
    },
    {
      text: "1.26 'Vafli' (sariq to'rsimon) yo'l chizig'ining talabi nima?",
      options: [
        "Avtomobillar to'xtab turishi uchun mo'ljallangan joy",
        "Tirbandlikda to'xtab qolish ehtimoli bo'lsa chorrahaga kirish taqiqlanadi",
        "Faqat tez yordam mashinalari uchun joy",
        "Tezlikni oshirish mumkin bo'lgan zona",
      ],
      correctIndex: 1,
      explanation: "Tirbandlikda to'xtab qolish ehtimoli bo'lsa chorrahaga kirish taqiqlanadi.",
    },
    {
      text: "4.3 'Aylana harakatlanish' chorrahasiga kirayotganda kim imtiyozga ega?",
      options: [
        "Aylanaga kirib kelayotgan transport vositalari",
        "Aylanada harakatlanayotgan transport vositalari",
        "Katta o'lchamli yuk avtomobillari",
        "Chap tomondan kelayotgan barcha mashinalar",
      ],
      correctIndex: 1,
      explanation: "Aylanada harakatlanayotgan transport vositalari aylanaga kirib kelayotganlarga nisbatan ustunlikka ega.",
    },
    {
      text: "Temir yo'l kesishmasidan kamida qancha masofada to'xtab turish (5 daqiqadan ortiq) taqiqlanadi?",
      options: ["20 metr", "50 metr", "100 metr", "150 metr"],
      correctIndex: 1,
      explanation: "Temir yo'l kesishmalariga 50 metrdan yaqin masofada to'xtab turish taqiqlanadi.",
    },
    {
      text: "Tartibga soluvchi inspektor qo'llarini yonga uzatgan yoki tushirgan holatda ko'krak va orqa tomondagi transportga:",
      options: [
        "Faqat o'ngga burilishga ruxsat",
        "Barcha yo'nalishlarda harakatlanish taqiqlanadi",
        "Faqat to'g'riga harakatlanishga ruxsat",
        "Faqat qayrilib olishga ruxsat",
      ],
      correctIndex: 1,
      explanation: "Tartibga soluvchining ko'krak va orqa tomoni qizil chiroqqa teng bo'lib, harakatlanish taqiqlanadi.",
    },
    {
      text: "Tartibga soluvchining o'ng qo'li oldinga cho'zilgan holatda chap tomondan kelayotgan relssiz transportga:",
      options: [
        "Barcha yo'nalishlarda harakatlanishga ruxsat beriladi",
        "Faqat to'g'riga va o'ngga ruxsat",
        "Faqat chapga va qayrilib olishga ruxsat",
        "Harakatlanish taqiqlanadi",
      ],
      correctIndex: 0,
      explanation: "Inspektor o'ng qo'lini oldinga cho'zganda, chap tomondagi transport barcha yo'nalishlarda harakatlanishi mumkin.",
    },
    {
      text: "Hovlidan yoki yoqilg'i quyish shoxobchasidan yo'lga chiqayotgan haydovchi:",
      options: [
        "Boshqa barcha transport va piyodalarga yo'l berishi shart",
        "Faqat chapdan kelayotganlarga yo'l beradi",
        "Imtiyozga ega bo'ladi",
        "Faqat yuk mashinalariga yo'l beradi",
      ],
      correctIndex: 0,
      explanation: "Yondosh hududdan chiqayotgan haydovchi yo'ldagi barcha transport va piyodalarga yo'l berishi shart.",
    },
    {
      text: "Qaysi joylarda orqaga qayrilib olish (razvorot) qat'iyan taqiqlanadi?",
      options: [
        "Piyodalar o'tish joyida, ko'prik va tunnellarda",
        "Keng ko'chalarda",
        "Tartibga solingan chorrahalarda",
        "Bir tomonlama yo'l boshida",
      ],
      correctIndex: 0,
      explanation: "Piyodalar o'tish joylarida, tunnellarda, ko'priklarda va temir yo'l kesishmalarida qayrilib olish taqiqlanadi.",
    },
    {
      text: "O'zbekistonda ma'muriy yo'l jarimalari qaror chiqqan kundan boshlab necha kun ichida to'lansa 50% chegirma qo'llaniladi?",
      options: ["10 kun", "15 kun", "30 kun", "60 kun"],
      correctIndex: 1,
      explanation: "Jarima qarori topshirilgan kundan boshlab 15 kun ichida jarima miqdorining 50 foizi to'lansa yetarli hisoblanadi.",
    },
  ];

  for (let i = 0; i < questionsData.length; i++) {
    const q = questionsData[i];
    await prisma.question.create({
      data: {
        courseId: course1.id,
        lessonId: i < 10 ? lesson1.id : i < 20 ? lesson2.id : lesson3.id,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        order: i + 1,
      },
    });
  }

  console.log("Database seeded successfully with courses, lessons, and questions!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
