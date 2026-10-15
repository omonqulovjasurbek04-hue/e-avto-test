# E-AVTO TEST — vazifalar holati

Batafsil bosqichma-bosqich holat: **`IMPLEMENTATION_PLAN.md`** (har bosqichda nima bor va nima yo‘q).
Test natijalari va qanday ishga tushirish: **`TESTING.md`**. Xavfsizlik: **`SECURITY.md`**. Deploy: **`DEPLOYMENT.md`**.

Belgilar: `[x]` bajarilgan va tekshirilgan, `[~]` qisman, `[ ]` bajarilmagan.

## Tayyor va tekshirilgan (haqiqiy PostgreSQL + haqiqiy brauzer)
[x] Auth, rollar (6 ta), ruxsat matritsasi, rol eskalatsiyasidan himoya, hisob blokirovkasi, audit jurnali
[x] Kurslar, darslar, testlar (serverda baholash, vaqt, urinishlar, o‘tish bali, import/eksport)
[x] Katalog: paket, narx, chegirma, promo-kod (poygadan himoyalangan)
[x] Buyurtma, to‘lov oqimi (imzolangan callback, idempotent), buyurtma muddati, refund — **mock provayder bilan**
[x] Kursga kirish nazorati (video, matn, test) — `ENFORCE_ENROLLMENT`
[x] Guruh, jadval (to‘qnashuv tekshiruvi), davomat (tahrir tarixi, hisobot, CSV)
[x] CMS: sahifalar, yangiliklar, FAQ, sayt sozlamalari, aloqa formasi; XSS himoyasi
[x] Bildirishnomalar: sayt ichida + email, sozlamalar, e’lonlar
[x] Private media (imzolangan URL, Range) + admin sahifasi
[x] Rolga qarab admin panel, o‘qituvchi kabineti, o‘quvchi kabineti
[x] Test topshirish oqimi (brauzerda: boshlash → javob → natija → tahlil; javob kaliti sahifada yo‘q)
[x] ESLint, production build qo‘riqchisi, production smoke test, telefon maketi testlari

## Qisman
[~] Ko‘p tillilik: o‘quvchi/ochiq sahifalar uz/uz-kirill/ru (kirill va rus matnlarini ona tilida so‘zlashuvchi tekshirsin); admin va o‘qituvchi sahifalari faqat o‘zbekcha. Dark mode yangi sahifalarda tekshirilgan
[~] Deploy: `deploy/` fayllari (Docker, nginx, backup) yozilgan, lekin **sinalmagan** (Docker/pg_dump yo‘q)
[~] Email: real SMTP serverda sinalmagan

## Bajarilmagan
[ ] Real to‘lov provayderi (Payme / Click) — merchant ma’lumotlari kerak
[ ] SMS / messenjer, refresh token, 2FA, email tasdiqlash
[ ] Rate limit uchun umumiy store (Redis)
[ ] Antivirus (fayl yuklash), watermark, S3/R2
[ ] Xato kuzatuvchisi (Sentry), monitoring, backup tiklashni sinash
[ ] Mustaqil xavfsizlik auditi
[ ] Kontent: seeddagi savollar soni kam; YHQ savollarining to‘g‘riligini mutaxassis tasdiqlashi kerak
[ ] Kategoriya/mavzu modeli (hozir kurs kategoriya vazifasini bajaradi)

## Server yuklash vaqtida eslatiladi
[ ] **Real to‘lov (Payme / Click)** — loyiha egasi qarori bilan oxirgi bosqichga qoldirilgan; yuklash paytida avval shu qilinadi (`DEPLOYMENT.md`, 11-bo‘lim)

## Loyiha egasi hal qilishi kerak
Haqiqiy narx va valyuta; to‘lov provayderi va merchant ma’lumotlari; refund siyosati; davomat foizi formulasi (hozir vaqtinchalik,
`backend/src/lib/attendance.ts`); test vaqti/urinishlar/o‘tish bali; video joylashuvi (tashqi CDN yoki o‘z serveri);
email/SMS provayder; domen va hosting; brend; maxfiylik siyosati va ma’lumotni saqlash muddati.
