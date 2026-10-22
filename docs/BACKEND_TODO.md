# E-Avto Test — backend: qilinadigan ishlar

> Holat: 2026-10-20. Production — Railway (`vigilant-tenderness`), https://e-avto-test-production.up.railway.app.
> API to'liq ro'yxati: [API.md](API.md). Rollar va vazifalar: [ROLES.md](ROLES.md). Belgilar: 🔴 shoshilinch · 🟠 muhim · 🟡 kerak · 🟢 yaxshilash.

## 🔴 Shoshilinch (foydalanuvchiga hozir ta'sir qiladi)

| # | Vazifa | Nega | Qayerda |
|---|---|---|---|
| 2 | **Yuklangan rasmlar o'chib ketadi** | `STORAGE_DRIVER=local` → rasmlar konteyner ichida (`storage/private`), Railway har deployda tozalaydi. Admin CMS'da yuklagan rasm keyingi push'da yo'qoladi | Railway: app servisiga **Volume** (`/app/backend/storage`) ulash + `RAILWAY_RUN_UID=0` o'zgaruvchisi (volume root'niki, image esa `node` bilan ishlaydi), **yoki** `STORAGE_DRIVER=s3` (Cloudflare R2) |
| 3 | **Railway sinov muddati** | 30 kun yoki $5 tugagach servislar to'xtaydi | Railway → Hobby ($5/oy) ga o'tish, muddatdan oldin |
| 4 | **Ro'yxatdan o'tishda telefon tasdiqlanmaydi** | Begona odam boshqa birovning raqami bilan ro'yxatdan o'ta oladi | `POST /api/auth/register`: telefonni Telegram bot kodi bilan tasdiqlash (`telegram/start`→`verify` oqimi bor) yoki SMS |

## 🟠 Muhim

| # | Vazifa | Tafsilot |
|---|---|---|
| 5 | Onlayn to'lov (Payme / Click) | `PAYMENT_PROVIDER` bo'sh → `POST /api/orders` 503. `src/lib/payments/` ga provayder, webhook imzosi (`POST /api/payments/webhook/:provider`), sinov rejimi. *Deploy oxirida qilinadi deb kelishilgan* |
| 6 | Parolni tiklash | `POST /api/auth/forgot-password` email bilan ishlaydi, SMTP yo'q va email olib tashlangan → amalda ishlamaydi. Telegram bot orqali tiklash (`/reset` → kod → yangi parol) |
| 7 | Baza zaxirasi | 2026-10-22 tekshiruvi: Railway'da **backup yo'q** — yaratish va jadval faqat **Pro** tarifda (Hobby'da emas). Hozircha qo'lda: `railway ssh … pg_dump` (2026-10-21 da olingan va lokal PG18 ga restore qilib sinalgan). Kerak: kunlik avtomatik dump (GitHub Actions + `railway ssh` yoki tashqi cron) tashqi saqlashga + oylik restore sinovi |
| 8 | Telegram bot deploy paytida "Conflict" | Har deployda eski va yangi konteyner bir necha soniya birga polling qiladi. Yechim: Railway'da webhook rejimi (`TELEGRAM_WEBHOOK_SECRET` + `TELEGRAM_WEBHOOK_BASE`) — kod tayyor |
| 9 | Dars kontenti | Matn faqat B, A, C kurslarida; qolgan 12 kursda faqat reja (outline). Video yo'q. Kontent `prisma/content/courses.ts` yoki admin panel orqali |
| 10 | Xodimlar uchun 2FA majburiy | `ADMIN`/`SUPERADMIN` 2FA'siz kira oladi. Kirishda 2FA yoqilmagan bo'lsa sozlashga majburlash |
| 11 | Sayt sozlamalari | `site-settings` da telefon `+998 00 000 00 00` (soxta), markazlar (`branches`) bo'sh — admin paneldan to'ldirish |

## 🟡 Kerak

| # | Vazifa | Tafsilot |
|---|---|---|
| 12 | Monitoring | `SENTRY_DSN` bo'sh — xatolar faqat Railway logida. Sentry/GlitchTip ulash; `METRICS_TOKEN` (Prometheus) |
| 13 | Takror endpointlar | `/api/profile` = `/api/users/me`, `/api/statistics` = `/api/users/me/statistics` — bittasini qoldirib, ikkinchisini "deprecated" qilish |
| 14 | Admin ro'yxatlarida filtr | `GET /api/admin/questions` faqat `page/limit/search` — `courseId`, `lessonId` filtrlari kerak (savollar ko'payganda) |
| 15 | Email funksiyalari | SMTP yo'q: `verify-email`, `forgot-password`, email bildirishnomalar ishlamaydi. Yoki SMTP ulash, yoki kod va UI'dan olib tashlash |
| 16 | Eslatma ishlari uyquda | Bildirishnoma/Telegram eslatmalari 5 daqiqalik ichki taymer bilan ishlaydi — bir nechta instans bo'lsa takrorlanishi mumkin (hozir 1 ta). Ko'paytirishda Redis lock yoki Railway Cron |
| 17 | Lokal Telegram bot | Lokal `.env` dagi `TELEGRAM_BOT_TOKEN` yaroqsiz (Unauthorized). Prod tokenini **ishlatmaslik** (ikki joyda polling prod'dagi Telegram kirishni buzadi) — @BotFather'da alohida test bot ochish |
| 18 | E2E testlar CI'da yo'q | Playwright (`e2e/`) faqat lokal (msedge). CI'ga chromium bilan qo'shish |

## 🟢 Yaxshilash

| # | Vazifa | Tafsilot |
|---|---|---|
| 20 | Audit jurnali | `GET /api/admin/audit` xom kodlar qaytaradi (`settings.update`) — frontendda tarjima yoki backendda `label` |
| 21 | Javob keshi | `GET /api/courses`, `/packages`, `/site-settings` — qisqa `Cache-Control` / ETag (trafik va kredit tejaydi) |
| 22 | API hujjati avtomatik | Zod sxemalaridan OpenAPI (`zod-to-openapi`) generatsiya qilib, `/api/docs` da Swagger |
| 23 | Rasm hajmi | Unsplash rasmlari `w=800` — kartalar uchun `w=600&q=70` va `srcset` |

## ✅ Bajarilgan (bu bosqichda)

- 2026-10-22: GitHub Actions: `checkout`/`setup-node` v7 (Node 24), Docker va appleboy action'lari yangilandi, hammasi commit SHA bilan pin qilingan; runner `ubuntu-24.04` ga qotirilgan (`ubuntu-latest` 26 ga o'tmoqda)

- 2026-10-21: Railway image'da yuklash papkasi (`storage/private`) `node` foydalanuvchisiga tegishli qilindi — oldin `/app/backend` root'niki bo'lgani uchun rasm/video yuklash `EACCES` bilan yiqilishi kerak edi; CI endi papkaga yozishni tekshiradi
- 2026-10-21: Node 20 (2026-04 da qo'llab-quvvatlash tugagan) → Node 22 LTS: barcha Dockerfile'lar, CI, `engines`
- 2026-10-21: Lokal muhit: PostgreSQL 18 (port 5433, prod bilan bir xil versiya), prod nusxasi `railway ssh` + `pg_dump` bilan; rollar uchun sinov akkauntlari `npm run seed:roles`

- Railway: sayt + API bitta servisda, Postgres, EU West, `main`ga push → CI → avtomatik deploy, `npm run release` (migratsiya + bootstrap)
- JWT kaliti bazada (`JWT_SECRET_FROM_DB`), birinchi admin telefon orqali (`BOOTSTRAP_ADMIN_PHONE`)
- Telegram: kod bilan kirish, xodimlar menyusi (`/admin`), aloqa xabarlari botga, davomat eslatmalari
- O'qish vaqti (`/api/me/study-time`), guruh jadvali (`/api/me/groups`), kurs rasmlari bootstrap'da
- Test savollari: A, B, C kurslari darslari bo'yicha 80 ta savol (`prisma/content/questions.ts`, bootstrap yuklaydi) — qolgan 12 kurs uchun savollar hali yo'q
- CI: lint, tiplar, migratsiya drift, 300+ test, bootstrap va Railway image tekshiruvlari
