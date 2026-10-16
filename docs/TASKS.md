# E-AVTO TEST — vazifalar holati

Batafsil bosqichma-bosqich holat: **`IMPLEMENTATION_PLAN.md`** (har bosqichda nima bor va nima yo‘q).
Test natijalari va qanday ishga tushirish: **`TESTING.md`**. Xavfsizlik: **`SECURITY.md`**. Deploy: **`DEPLOYMENT.md`**.

Belgilar: `[x]` bajarilgan va tekshirilgan, `[~]` qisman, `[ ]` bajarilmagan.

## Tayyor va tekshirilgan (haqiqiy PostgreSQL + haqiqiy brauzer)
[x] Auth, rollar (6 ta), ruxsat matritsasi, rol eskalatsiyasidan himoya, hisob blokirovkasi, audit jurnali
[x] Auth kuchaytirildi: 15 daqiqalik access token (faqat xotirada) + httpOnly cookie’dagi rotatsiyalanuvchi refresh token (qayta ishlatilsa oila bekor), email tasdiqlash, ADMIN/SUPERADMIN/FINANCE uchun ixtiyoriy TOTP 2FA (zaxira kodlar, superadmin reset). Email yuborish real SMTP bilan sinalmagan
[x] Kurslar, darslar, testlar (serverda baholash, vaqt, urinishlar, o‘tish bali, import/eksport)
[x] Katalog: paket, narx, chegirma, promo-kod (poygadan himoyalangan)
[x] Buyurtma, to‘lov oqimi (imzolangan callback, idempotent), buyurtma muddati, refund — **mock provayder bilan**
[x] Kursga kirish nazorati (video, matn, test) — `ENFORCE_ENROLLMENT`
[x] Guruh, jadval (to‘qnashuv tekshiruvi), davomat (tahrir tarixi, hisobot, CSV)
[x] CMS: sahifalar, yangiliklar, FAQ, sayt sozlamalari, aloqa formasi; XSS himoyasi; matnlar uz / uz-kirill / ru (bo‘lmasa uz)
[x] Bildirishnomalar: sayt ichida + email, sozlamalar, e’lonlar; admin tahrirlaydigan shablonlar (tur × til) va foydalanuvchi xabar tili
[x] Private media (imzolangan URL, Range) + admin sahifasi
[x] Rolga qarab admin panel, o‘qituvchi kabineti, o‘quvchi kabineti
[x] Test topshirish oqimi (brauzerda: boshlash → javob → natija → tahlil; javob kaliti sahifada yo‘q)
[x] ESLint, production build qo‘riqchisi, production smoke test, telefon maketi testlari
[x] Hisobotlar: test natijalari (kurs bo‘yicha), o‘qituvchi yuklamasi (davomati yo‘q darslar bilan), CSV
[x] Tizim holati sahifasi: baza/migratsiya, to‘lov provayderi, SMTP, Telegram, media, antivirus, rate limit (Redis), monitoring, kirish nazorati — sirlarsiz
[x] Kurs kategoriyalari (model + migratsiya, admin sahifa, uz/uz-kirill/ru, ochiq filtr `?category=`)
[x] CMS rasm kutubxonasi (yuklash, yangilik muqovasi, matnga rasm qo‘shish; ochiq `/api/images/…`)
[x] Yopiq video ustida harakatlanuvchi watermark; haqiqiy dekodlanadigan WebM bilan E2E’da sinalgan
[x] Dark mode: barcha ochiq va o‘quvchi sahifalari avtomatik kontrast testidan o‘tadi (E2E `dark-mode.spec.ts`)

## Qisman
[x] Ko‘p tillilik: barcha sahifalar (ochiq, o‘quvchi, o‘qituvchi, admin) uz / uz-kirill / ru. Kirill matni lotin matndan `frontend/scripts/i18n-cyrl.mjs` bilan hosil qilinadi
[~] Rus matnlari va kirilldagi o‘zlashma so‘zlarni ona tilida so‘zlashuvchi ko‘rib chiqsin; CMS kontenti (sahifa/yangilik matni) hali bitta tilda
[~] Redis rate limit, Sentry, `/api/metrics`, S3/R2 drayveri, ClamAV — kod va testlar bor (soxta server/hisoblagich bilan), **haqiqiy servislar bilan sinalmagan**
[~] Deploy: `deploy/` fayllari (Docker, nginx, backup) yozilgan, lekin **sinalmagan** (Docker/pg_dump yo‘q)
[~] Email: real SMTP serverda sinalmagan

## Bajarilmagan
[ ] Real to‘lov provayderi (Payme / Click) — merchant ma’lumotlari kerak
[ ] SMS / messenjer, telefon tasdiqlash
[ ] Backup tiklashni sinash (serverda, pg_dump bilan)
[ ] Mustaqil xavfsizlik auditi
[ ] CMS va shablonlarning rus / kirill matnlarini ona tilida so‘zlashuvchi kiritishi yoki ko‘rib chiqishi kerak (hozir faqat o‘rnatilgan shablon matnlari tarjima qilingan)
[ ] Kontent: seeddagi savollar soni kam; YHQ savollarining to‘g‘riligini mutaxassis tasdiqlashi kerak

## Server yuklash vaqtida eslatiladi
[ ] **Real to‘lov (Payme / Click)** — loyiha egasi qarori bilan oxirgi bosqichga qoldirilgan; yuklash paytida avval shu qilinadi (`DEPLOYMENT.md`, 11-bo‘lim)

## Loyiha egasi hal qilishi kerak
Haqiqiy narx va valyuta; to‘lov provayderi va merchant ma’lumotlari; refund siyosati; davomat foizi formulasi (hozir vaqtinchalik,
`backend/src/lib/attendance.ts`); test vaqti/urinishlar/o‘tish bali; video joylashuvi (tashqi CDN yoki o‘z serveri);
email/SMS provayder; domen va hosting; brend; maxfiylik siyosati va ma’lumotni saqlash muddati.
