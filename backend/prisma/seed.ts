import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_VIDEO = "https://www.w3schools.com/html/mov_bbb.mp4";

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user123", 10);

  await prisma.user.upsert({
    where: { email: "admin@eavto.uz" },
    update: { role: "ADMIN" },
    create: {
      name: "Admin",
      email: "admin@eavto.uz",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "user@eavto.uz" },
    update: {},
    create: {
      name: "Demo User",
      email: "user@eavto.uz",
      passwordHash: userHash,
      role: "USER",
    },
  });

  await prisma.question.deleteMany({});
  await prisma.video.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.course.deleteMany({});

  const course1 = await prisma.course.create({
    data: {
      title: "Yo'l belgilari",
      description:
        "Yo'l belgilari haqida to'liq ma'lumot. Majburiy, taqiqlash, ogohlantirish va ko'rsatma belgilari.",
      thumbnail: null,
      level: "Boshlang'ich",
      order: 1,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      title: "Yo'l qoidalari",
      description:
        "Umumiy yo'l harakati qoidalari, ustunlik, tezlik chegaralari va to'xtash qoidalari.",
      thumbnail: null,
      level: "O'rta",
      order: 2,
    },
  });

  const lesson1 = await prisma.lesson.create({
    data: {
      courseId: course1.id,
      title: "Majburiy belgilar",
      description: "Harakatlanish yo'nalishini ko'rsatuvchi majburiy belgilar.",
      videoUrl: SAMPLE_VIDEO,
      thumbnail: null,
      duration: 300,
      order: 1,
    },
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      courseId: course1.id,
      title: "Taqiqlash belgilari",
      description: "Harakatni taqiqlovchi asosiy belgilar.",
      videoUrl: SAMPLE_VIDEO,
      thumbnail: null,
      duration: 280,
      order: 2,
    },
  });

  const lesson3 = await prisma.lesson.create({
    data: {
      courseId: course2.id,
      title: "Ustunlik qoidalari",
      description: "Chiqish va kesishmalardagi ustunlik qoidalari.",
      videoUrl: SAMPLE_VIDEO,
      thumbnail: null,
      duration: 320,
      order: 1,
    },
  });

  await prisma.video.create({
    data: {
      lessonId: lesson1.id,
      url: SAMPLE_VIDEO,
      title: "Majburiy belgilar videosi",
      duration: 300,
    },
  });

  const questions: {
    courseId: string;
    lessonId?: string;
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    order: number;
  }[] = [
    {
      courseId: course1.id,
      lessonId: lesson1.id,
      text: "Ushbu belgi nimani anglatadi?",
      options: [
        "To'xtash taqiqlangan",
        "Stoyanka taqiqlangan",
        "Tinish joyi",
        "Avtoturargoh",
      ],
      correctIndex: 1,
      explanation: "Bu belgi faqat to'xtash (stoyanka) taqiqlanganligini bildiradi.",
      order: 1,
    },
    {
      courseId: course1.id,
      lessonId: lesson1.id,
      text: "Majburiy belgilar qanday shaklda bo'ladi?",
      options: [
        "Uchburchak",
        "Doira",
        "Kvadrat yoki dumaloq ko'k fonli",
        "Rom",
      ],
      correctIndex: 2,
      explanation: "Majburiy belgilar ko'k fonda doira shaklida bo'ladi.",
      order: 2,
    },
    {
      courseId: course1.id,
      lessonId: lesson2.id,
      text: "Qizil doira bilan berilgan belgi odatda nima?",
      options: ["Majburiy", "Taqiqlash", "Ogohlantirish", "Ko'rsatma"],
      correctIndex: 1,
      explanation: "Qizil doira ko'pincha taqiqlash belgisidir.",
      order: 3,
    },
    {
      courseId: course1.id,
      lessonId: lesson2.id,
      text: "Tezlik chegarasini ko'rsatuvchi belgi qanday?",
      options: ["Taqiqlash", "Majburiy", "Ogohlantirish", "Axborot"],
      correctIndex: 0,
      explanation: "Tezlik chegarasi taqiqlash belgisi hisoblanadi.",
      order: 4,
    },
    {
      courseId: course1.id,
      text: "Ogohlantirish belgilari qanday shaklda?",
      options: [
        "Uchburchak, qizil chegarali",
        "Doira, ko'k",
        "Kvadrat, yashil",
        "Rom, sariq",
      ],
      correctIndex: 0,
      explanation: "Ogohlantirish belgilari qizil chegarali uchburchak shaklida.",
      order: 5,
    },
    {
      courseId: course1.id,
      text: "Sariq rangli belgilar odatda nima uchun ishlatiladi?",
      options: [
        "Doimiy belgilar",
        "Vaqtinchalik belgilar",
        "Majburiy",
        "Ko'rsatma",
      ],
      correctIndex: 1,
      explanation: "Sariq fondagi belgilar vaqtinchalik belgilardir.",
      order: 6,
    },
    {
      courseId: course1.id,
      text: "Piyodalar o'tish joyi belgisi qanday shaklda?",
      options: ["Ko'k doira", "Qizil uchburchak", "Sariq kvadrat", "Yashil rom"],
      correctIndex: 1,
      explanation: "Piyodalar o'tish joyi ogohlantirish belgisidir (uchburchak).",
      order: 7,
    },
    {
      courseId: course1.id,
      text: "Qaysi belgi harakatni to'liq taqiqlaydi?",
      options: [
        "To'xtash taqiqlangan",
        "Harakatlanish taqiqlangan",
        "Stoyanka taqiqlangan",
        "Tezlik chegarasi",
      ],
      correctIndex: 1,
      explanation: "'Harakatlanish taqiqlangan' belgisi barcha harakatni taqiqlaydi.",
      order: 8,
    },
    {
      courseId: course1.id,
      text: "Ko'rsatma belgilari qanday rangda?",
      options: ["Qizil", "Sariq", "Ko'k yoki yashil", "Qora"],
      correctIndex: 2,
      explanation: "Ko'rsatma (axborot) belgilari ko'k yoki yashil rangda bo'ladi.",
      order: 9,
    },
    {
      courseId: course1.id,
      text: "Aylanma harakat belgisi nimani bildiradi?",
      options: ["Taqiqlash", "Ogohlantirish", "Majburiy aylanma", "Axborot"],
      correctIndex: 2,
      explanation: "Aylanma harakat majburiy belgidir.",
      order: 10,
    },
    {
      courseId: course1.id,
      text: "Bolalar belgisi qaysi turga kiradi?",
      options: ["Majburiy", "Ogohlantirish", "Taqiqlash", "Ko'rsatma"],
      correctIndex: 1,
      explanation: "Bolalar belgisi ogohlantirish belgisidir.",
      order: 11,
    },
    {
      courseId: course1.id,
      text: "To'xtash belgisi qanday ko'rinishda bo'ladi?",
      options: [
        "Ko'k doira",
        "Sariq uchburchak",
        "Qizil chegarali doira ichida ikki chiziq",
        "Yashil kvadrat",
      ],
      correctIndex: 2,
      explanation: "To'xtash taqiqlangan belgisi qizil doira ichida xoch chiziqlari bilan.",
      order: 12,
    },
    {
      courseId: course2.id,
      lessonId: lesson3.id,
      text: "Chiqishda ustunlik qanday belgilanadi?",
      options: [
        "Yo'nalish belgilari",
        "Svetafor",
        "Ustunlik belgisi yoki yo'nalish qoidasi",
        "Tasodifiy",
      ],
      correctIndex: 2,
      explanation: "Ustunlik belgisi yoki asosiy yo'l qoidasi bo'yicha aniqlanadi.",
      order: 1,
    },
    {
      courseId: course2.id,
      lessonId: lesson3.id,
      text: "Asosiy yo'ldan chiqayotgan haydovchi ustunlikka ega?",
      options: ["Ha", "Yo'q", "Faqat tunda", "Har doim"],
      correctIndex: 0,
      explanation: "Asosiy yo'ldan (ustunlikka ega) chiqayotgan haydovchi ustunlikda.",
      order: 2,
    },
    {
      courseId: course2.id,
      text: "Shahar ichida maksimal tezlik qancha?",
      options: ["90 km/soat", "110 km/soat", "60 km/soat", "120 km/soat"],
      correctIndex: 2,
      explanation: "Shahar ichida maksimal tezlik 60 km/soat.",
      order: 3,
    },
    {
      courseId: course2.id,
      text: "Avtomagistralda maksimal tezlik qancha?",
      options: ["60 km/soat", "90 km/soat", "110 km/soat", "130 km/soat"],
      correctIndex: 2,
      explanation: "O'zbekistonda avtomagistralda 110 km/soat (ba'zi holat 130).",
      order: 4,
    },
    {
      courseId: course2.id,
      text: "Xavfsizlik kamaridan foydalanish?",
      options: [
        "Faqat tungi vaqtda",
        "Majburiy",
        "Faqat shahar tashqarisida",
        "Ixtiyoriy",
      ],
      correctIndex: 1,
      explanation: "Xavfsizlik kamaridan foydalanish majburiy.",
      order: 5,
    },
    {
      courseId: course2.id,
      text: "Alkogol ichib haydash?",
      options: [
        "Ruxsat etilgan",
        "Kam miqdorda ruxsat",
        "Qat'iyan taqiqlangan",
        "Faqat tajribali haydovchilarga",
      ],
      correctIndex: 2,
      explanation: "Alkogol ichib haydash qat'iyan taqiqlangan.",
      order: 6,
    },
    {
      courseId: course2.id,
      text: "Piyodalar o'tish joyida kim ustunlikka ega?",
      options: ["Haydovchi", "Piyoda", "Hech kim", "Svetafor bo'lsa haydovchi"],
      correctIndex: 1,
      explanation: "Belgilangan o'tish joyida piyodalar ustunlikka ega.",
      order: 7,
    },
    {
      courseId: course2.id,
      text: "Qizil svetafor nima bildiradi?",
      options: [
        "Harakatlanish mumkin",
        "Tayyorgarlik ko'ring",
        "To'xtash",
        "Ehtiyotkorlik bilan o'tish",
      ],
      correctIndex: 2,
      explanation: "Qizil svetafor to'xtashni bildiradi.",
      order: 8,
    },
    {
      courseId: course2.id,
      text: "Sariq svetafor nimani bildiradi?",
      options: [
        "To'xtash",
        "Harakatlanish",
        "Tayyorgarlik / signal o'zgarishi",
        "Xavf yo'q",
      ],
      correctIndex: 2,
      explanation: "Sariq svetafor signal o'zgarishini bildiradi.",
      order: 9,
    },
    {
      courseId: course2.id,
      text: "Yuk avtomobili haydovchisi dam olish uchun qancha vaqtda to'xtashi kerak?",
      options: ["Har 2 soatda", "Har 4 soatda", "Har 6 soatda", "Kerak bo'lganda"],
      correctIndex: 1,
      explanation: "Uzoq yo'lda har 4 soatda dam olish tavsiya etiladi (qoidalarga ko'ra).",
      order: 10,
    },
    {
      courseId: course2.id,
      text: "Telefon bilan gapirib haydash?",
      options: [
        "Ruxsat etilgan",
        "Faqat hands-free bilan",
        "Qat'iyan taqiqlangan",
        "Faqat tezlik pastda",
      ],
      correctIndex: 1,
      explanation: "Faol haydovchilikda qo'lda telefondan foydalanish taqiqlangan, hands-free ruxsat.",
      order: 11,
    },
    {
      courseId: course2.id,
      text: "Avariya to'xtash signali qanday beriladi?",
      options: [
        "Signal berish",
        "Tezlashish",
        "Avariya to'xtash belgisi va kamar",
        "Tormozlash",
      ],
      correctIndex: 2,
      explanation: "Avariya holatida maxsus belgi qo'yiladi va xavfsiz joyga to'xtatiladi.",
      order: 12,
    },
  ];

  for (const q of questions) {
    await prisma.question.create({ data: q });
  }

  console.log("Seed completed successfully.");
  console.log("Admin: admin@eavto.uz / admin123");
  console.log("User:  user@eavto.uz / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
