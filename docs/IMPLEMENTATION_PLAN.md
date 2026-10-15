# E-Avto — amalga oshirish rejasi

Manba: `docs/archive/E-Avto_Toliq_Instuksiya_Promptlar_Ketma-ketlik.md` (Prompt 01–18).
Ishlash qoidasi: bosqichma-bosqich, har bosqichdan keyin typecheck + test, rost holat hisoboti.

## Qarorlar

| Qaror | Tanlov | Sabab |
|---|---|---|
| Stack | Mavjud React + Express + Prisma + PostgreSQL saqlanadi | Hujjatning o‘zi "sababsiz qayta yozma" deydi; Next.js ga o‘tish ishlayotgan kodni yo‘qotadi |
| Student roli | `Role.USER` = spec dagi `student` | Mavjud akkaunt va tokenlar buzilmasligi uchun |
| Rol/ruxsat | Kodda statik matritsa (`backend/src/lib/permissions.ts`), `Role` enum | Rol/Permission jadvallari UI orqali tahrirlanganda eskalatsiya xavfi; matritsa tekshirish va test qilish oson. `Role/Permission/UserRole` jadvallari ataylab yaratilmadi |
| Pul | `Int`, minor birlik (tiyin) | Floating-point taqiqlangan |
| To‘lov | `PaymentProvider` interface + mock | Payme/Click credential yo‘q; real integratsiya "tayyor" deb aytilmaydi |
| Dars (content) va dars (jadval) | `Lesson` = kontent, `ScheduleSlot` = jadvaldagi uchrashuv | Nom to‘qnashuvi |
| Test | Mavjud `Test` = urinish (attempt) | `TestConfig` (vaqt, o‘tish bali, urinishlar) 12-bosqichda qo‘shiladi |
| Javob variantlari | `Question.options` JSON (`AnswerOption` jadvali yo‘q) | Mavjud ishlaydigan model |

## Bosqichlar holati

Belgilar: `[x]` bajarilgan va tekshirilgan, `[~]` qisman, `[ ]` bajarilmagan.

| # | Bosqich | Holat | Izoh |
|---:|---|---|---|
| 01 | Audit va reja | [x] | Shu hujjat |
| 02 | Poydevor, dizayn tizimi | [~] | UI kutubxona, layout; **uz / uz-kirill / ru** — o‘quvchi va ochiq sahifalar (narxlar, buyurtmalar, jadval, davomat, bildirishnomalar, yangiliklar, yopiq dars) to‘liq tarjima qilingan, sana va pul tilga qarab formatlanadi; kalitlar bir xilligi E2E’da tekshiriladi. **Kirill va rus matnlari birinchi variant — ona tilida so‘zlashuvchi ko‘rib chiqishi kerak.** Admin va o‘qituvchi sahifalari faqat o‘zbekcha. ESLint, production build qo‘riqchisi, telefon (375px) maketi testlari. Dark mode yangi sahifalarda ekran tasvirlari orqali ko‘zdan kechirildi (yaxshi); eski sahifalar alohida tekshirilmagan |
| 03 | Database | [x] | 40+ model, 8 migratsiya (`init` … `audit_created_index`), hammasi haqiqiy PostgreSQL’da qo‘llangan va testlangan; pul `Int` (tiyin); unique/indekslar; katta hajmda tekshirilgan (`PERFORMANCE.md`). Prisma service qatlami har sohada bor |
| 04 | Auth va rollar | [~] | 6 rol, ruxsat matritsasi (server + UI), eskalatsiyadan himoya, hisob blokirovkasi, audit, birinchi superadmin skripti, teacher/finance/moderator kabinetlari va endpointlari. Yo‘q: email/telefon tasdiqlash, 2FA, refresh token |
| 05 | Ochiq sayt va CMS | [~] | Yangiliklar, CMS sahifalar (`/p/:slug`; `about`, `privacy`, `terms` o‘rnatilgan matnni almashtiradi), FAQ, sayt nomi/kontaktlar/bosh sahifa matni, aloqa formasi (honeypot), haqiqiy statistika, `sitemap.xml`/`robots.txt`. Draft ko‘rinmaydi, XSS server va brauzerda tozalanadi — E2E bilan tekshirilgan. Yo‘q: CMS matnlari ko‘p tilli emas (bitta tilda), rasm yuklash, `sitemap.xml` ni frontend hostidan proksi qilish (deploy qadami), kurs tafsiloti CMS’siz |
| 06 | Kurs, paket, narx, chegirma | [x] | Narx hisoblash (`lib/pricing.ts`, serverda; mijoz summa yubormaydi), paketlar, narx tarixi, chegirma, promo-kod (poygadan himoyalangan), admin UI (paketlar, narxlar, chegirmalar, promo-kodlar), audit; ochiq `GET /api/packages`, `POST /api/quote`. Haqiqiy bazada va brauzerda tekshirilgan. Narxlar `namuna` belgisi bilan — haqiqiylarini egasi kiritadi. Kurs `slug`/arxiv API yo‘q |
| 07 | Buyurtma va to‘lov | [~] | `PaymentProvider` interface + **mock** provider; imzo, idempotent webhook, summa tekshiruvi, tranzaksiyada enrollment; **buyurtma muddati** (har 5 daqiqada, to‘lov bilan poygada to‘lov yutadi; muddatdan keyin kelgan haqiqiy PAID ham hurmat qilinadi); **refund** (qisman/to‘liq, qulf bilan oshib ketmaydi, provayder qaytarmasa PENDING → qo‘lda tasdiq/rad, to‘liq qaytarilsa kirish bekor, hammasi auditda); checkout/buyurtmalar/refund UI. Barchasi haqiqiy DB va brauzerda tekshirilgan. **Real Payme/Click ulanmagan**, admin qo‘lda status o‘zgartirishi yo‘q |
| 08 | O‘quvchi kabineti | [x] | Buyurtmalar (holat kuzatiladi), to‘lov holati, jadval, davomat, bildirishnomalar + sozlamalar, narxlar/checkout, yopiq dars (`ENFORCE_ENROLLMENT`: video, matn va test kursga kirishsiz berilmaydi). Brauzerda tekshirilgan, uz/uz-kirill/ru |
| 09 | O‘qituvchi, guruh, jadval | [x] | Admin: guruh, a’zolik (sig‘im qulfi), jadval + haftalik takrorlash, o‘qituvchi/xona to‘qnashuvi; o‘qituvchi kabineti (faqat o‘z guruhi, begona guruh 404); jadval o‘zgarganda a’zolarga xabar. DB testlari, E2E (desktop + telefon). Admin/o‘qituvchi sahifalari faqat o‘zbekcha |
| 10 | Davomat | [~] | Belgilash (faqat a’zolar), tahrir uchun sabab, yakunlangandan keyin faqat admin, audit old/new, o‘quvchiga xabar, hisobot, CSV. UI bor, E2E o‘tgan. **Foiz formulasi vaqtinchalik** (`lib/attendance.ts`) — egasi tasdiqlashi kerak |
| 11 | Private media | [~] | Ikki bosqichli kirish (autentifikatsiyali `access` → 5 daqiqalik imzolangan URL → Range stream, har safar ruxsat qayta tekshiriladi), `no-store`, haqiqiy fayl turi baytlardan, hajm limiti, path-traversal himoyasi, kirish jurnali. **Admin sahifasi** (yuklash progressi bilan, yuklash o‘chiq bo‘lsa sababini aytadi, arxivlash), o‘quvchi pleyeri imzolangan havolani yangilab turadi (pozitsiyani saqlab), yopiq dars belgisi. Yuklash standartda **o‘chiq** (`MEDIA_UPLOAD_ENABLED=false`). Haqiqiy brauzerda tekshirilgan. Antivirus, watermark, S3/R2 yo‘q; haqiqiy dekodlanadigan video bilan pleyer sinalmagan |
| 12 | Testlar | [~] | Serverda baholash, vaqt, urinishlar, idempotentlik; kurs bo‘yicha qoidalar (savol soni, vaqt, o‘tish bali, urinishlar); qoralama savollar; JSON import (hammasi-yoki-hech narsa)/eksport; tahrir tarixi (audit); kursga kirish tekshiruvi. Brauzerda to‘liq oqim tekshirilgan (javob kaliti sahifada yo‘q). Kategoriya o‘rnida Course; alohida kategoriya modeli yo‘q |
| 13 | Admin panel | [~] | Dashboard, kurs, dars, savol, foydalanuvchi (barcha rollar bilan), katalog, buyurtma/tushum/refund, guruh/jadval, imtihon, CMS, **audit jurnali**. Menyu va sahifalar rolga qarab (FINANCE → buyurtmalar, MODERATOR → kontent), server har bir so‘rovni qayta tekshiradi. Yo‘q: media boshqaruvi, bildirishnoma shablonlari, integratsiya holati sahifasi |
| 14 | Bildirishnomalar | [~] | Sayt ichida + email: to‘lov, darsga kelmadi, jadval (yangi/bekor/o‘zgarish), test natijasi (faqat sayt ichida), admin e’loni (hammaga/guruhga/kursga). Foydalanuvchi sozlamalari (sayt/email/davomat) haqiqatan saqlanadi; takroriy xabar yo‘q (`dedupeKey`); email holati halol (`PENDING/SENT/FAILED/SKIPPED` — SMTP yo‘q bo‘lsa hech qachon “yuborildi” demaydi), 3 martagacha qayta urinish, sarlavhada qator uzilishi yo‘q. O‘qilmaganlar belgisi. SMTP **real serverda sinalmagan** (testlarda soxta). Yo‘q: SMS/messenjer, shablon boshqaruvi, push |
| 15 | Hisobotlar, audit | [~] | `AuditLog` (faqat o‘qish API+UI, filtrlar, oldin/keyin), tushum/refund hisoboti, davomat hisoboti+CSV. Yo‘q: o‘qituvchi yuklamasi, test natijalari hisoboti, katta ma’lumot uchun fon eksporti |
| 16 | Xavfsizlik auditi | [~] | Ichki audit o‘tkazildi (`docs/SECURITY.md`): 5 ta muammo topilib tuzatildi (zaif bog‘liqliklar, `javascript:` URL, hisob blokirovkasi, 413, loglarda token); route inventari, IDOR, poyga holatlari, headerlar avtomatik tekshiriladi. Ochiq Critical/High yo‘q; Medium qoldiqlar (localStorage JWT, xotiradagi rate limit, real to‘lov imzosi, antivirus). Mustaqil audit yo‘q |
| 17 | Qabul testlari, E2E | [~] | 190 backend test (haqiqiy DB) + 42 E2E (Edge, desktop + telefon): xarid → webhook → kirish, refund, test topshirish, rolga qarab admin, davomat, CMS/XSS, media, bildirishnomalar, tillar. Katta hajmda tezlik o‘lchangan (`PERFORMANCE.md`). Yo‘q: uzoq muddatli yuklama testi, mustaqil test, real provayderlar bilan sinov. `TESTING.md` |
| 18 | Deploy | [~] | `docs/DEPLOYMENT.md`; production env qo‘riqchilari (https CLIENT_URL, kuchli sirlar, mock to‘lov taqiqi) testlangan; kompilyatsiya qilingan server production rejimida smoke test (13/13, `npm run smoke`); frontend build https API’siz to‘xtaydi; liveness/readiness health; birinchi superadmin skripti (backdoor’siz); Dockerfile’lar, compose, nginx (CSP/HSTS), backup/restore skriptlari yozilgan. **Docker va pg_dump yo‘qligi uchun deploy/ fayllari va backup/restore sinalmagan.** Real hosting, domen, monitoring, xato kuzatuvchisi yo‘q |

## Ketma-ketlik va keyingi qadam

04 → 06 → 07 → 08 → 09 → 10 → 05 → 11 → 12 → 13 → 14/15 → 16 → 17 → 18.
Har bosqichga o‘tish sharti: oldingi bosqichning permission/ownership testlari o‘tishi.

**Holat:** hamma jadval/migratsiya haqiqiy PostgreSQL’da, testlar haqiqiy bazada va brauzerda. Qolgan ishlar asosan loyiha egasidan kerak: real to‘lov (server yuklash bosqichida), SMTP, domen/hosting, haqiqiy narx va kontent, tarjimalarni ko‘rib chiqish, biznes qarorlari. `TASKS.md` ga qarang.

## Loyiha egasi hal qilishi kerak (taxmin qilinmaydi)

Haqiqiy narx va valyuta; to‘lov provayderi (Payme/Click) va merchant ma’lumotlari; refund siyosati;
davomat foizi formulasi va kim tahrirlay oladi; test vaqti/urinishlar/o‘tish bali; video hosting;
email/SMS provayder; domen va hosting; brend; maxfiylik va ma’lumot saqlash muddati.
Vaqtinchalik standart: timezone `Asia/Tashkent`, valyuta `UZS`, narxlar `isSample=true`.
