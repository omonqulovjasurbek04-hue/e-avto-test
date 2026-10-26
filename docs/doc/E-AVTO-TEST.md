# E-Avto Test — loyihaning yagona hujjati

> Yangilangan: 2026-10-19. Bu fayl eski `docs/` papkasidagi 26 ta hujjatning (README, PROJECT, ARCHITECTURE, api, database,
> installation, TESTING, SECURITY, DEPLOYMENT, PERFORMANCE, telegram, TASKS, IMPLEMENTATION_PLAN, RULES, AGENTS va arxiv)
> o‘rnini bosadi. Ma’lumotlar haqiqiy koddan olingan; eski hujjatlar git tarixida (`815712e`) qoladi.

## Mundarija
1. [Loyiha haqida](#1-loyiha-haqida)
2. [Texnologiyalar](#2-texnologiyalar)
3. [Arxitektura va papkalar](#3-arxitektura-va-papkalar)
4. [Rollar va ruxsatlar](#4-rollar-va-ruxsatlar)
5. [Sahifalar (frontend)](#5-sahifalar-frontend)
6. [API (backend)](#6-api-backend)
7. [Ma’lumotlar bazasi](#7-malumotlar-bazasi)
8. [Lokal ishga tushirish](#8-lokal-ishga-tushirish)
9. [Muhit o‘zgaruvchilari](#9-muhit-ozgaruvchilari)
10. [Telegram orqali kirish](#10-telegram-orqali-kirish)
11. [Testlash](#11-testlash)
12. [Xavfsizlik](#12-xavfsizlik)
13. [Samaradorlik va optimallashtirish](#13-samaradorlik-va-optimallashtirish)
14. [Productionga chiqarish](#14-productionga-chiqarish)
15. [Holat: tayyor / qisman / qilinmagan](#15-holat-tayyor--qisman--qilinmagan)
16. [Ishlash qoidalari (dasturchi va AI agentlar uchun)](#16-ishlash-qoidalari-dasturchi-va-ai-agentlar-uchun)

---

## 1. Loyiha haqida

**E-Avto Test** — haydovchilik nazariyasi va yo‘l harakati qoidalarini (YHQ) onlayn o‘rganish platformasi va avtomaktab
boshqaruv tizimi.

- **O‘quvchi:** kurs sotib oladi → video dars → test (taymer, serverda baholash) → natija va xatolar tahlili → progress, reyting.
- **O‘qituvchi:** o‘z guruhlari, dars jadvali, davomat belgilash.
- **Admin / moderator / moliya:** kontent, savollar banki, katalog va narxlar, buyurtma va refund, guruhlar, CMS, hisobotlar, audit.
- Interfeys 3 tilda: **o‘zbek (lotin)**, **o‘zbek (kirill)**, **rus**; yorug‘ va qorong‘i mavzu; mobil moslashuv.

Asosiy oqim: `Bosh sahifa → Kurslar → Xarid → Dars → Video → Test → Natija → Xatolar tahlili → Qayta test`.

---

## 2. Texnologiyalar

| Qism | Texnologiya |
|---|---|
| Frontend | React 18.3, TypeScript 5.7, Vite 5.4, Tailwind CSS 3.4, React Router 6.28, Zustand 5, Axios, React Hook Form + Zod, i18next, Framer Motion, Recharts, Sonner, Lucide, DOMPurify |
| Backend | Node.js 20+, Express 4.19, TypeScript 5.5, Prisma 5.18, Zod, JWT, bcryptjs, Helmet, CORS, express-rate-limit, Morgan, Nodemailer, AWS S3 SDK, Sentry |
| Baza | PostgreSQL 16+ (UTF8 bo‘lishi shart) |
| Ixtiyoriy servislar | Redis (rate limit), ClamAV (antivirus), S3/R2/MinIO (fayllar), SMTP, Telegram bot, Sentry/GlitchTip, Prometheus |
| Testlar | Vitest (backend, haqiqiy PostgreSQL), Playwright (E2E, Edge/Chromium), ESLint |
| Deploy | Docker Compose, nginx, `backup.sh` / `restore.sh` |

---

## 3. Arxitektura va papkalar

```
Brauzer (React SPA) ──REST/JSON──> Express API ──Prisma──> PostgreSQL
                                     ├─ Redis (rate limit, ixtiyoriy)
                                     ├─ ClamAV (yuklangan fayllar skaneri, ixtiyoriy)
                                     ├─ Fayllar: lokal disk yoki S3/R2
                                     └─ Telegram Bot API, SMTP
```

Backend qatlamlari: `routes → middleware (auth, ruxsat, rate limit) → validators (Zod) → controllers → services → Prisma`.
Biznes qoidalari faqat **services** qatlamida.

```
e-avto-test/
├── frontend/                 # React SPA
│   ├── public/               # logo, video (hero.mp4, login.mp4), posterlar
│   ├── scripts/              # i18n-cyrl.mjs (lotin → kirill), lint-summary.mjs
│   └── src/
│       ├── components/       # ui/ (Button, Card, Modal…), common/, home/, course/, lesson/, test/, video/, settings/
│       ├── config/ constants/ hooks/ store/ (Zustand) types/ utils/
│       ├── data/             # mock ma’lumotlar (faqat VITE_USE_MOCK=true)
│       ├── i18n/ locales/    # uz.json (asosiy), uz_cyrl.json, ru.json (talab bo‘yicha yuklanadi)
│       ├── layouts/          # Main, Auth, Student, Teacher, Admin
│       ├── pages/            # public/, auth/, student/, teacher/, admin/, errors/
│       ├── routes/           # AppRoutes (lazy), Guest/Protected/Admin route guardlar
│       └── services/         # Axios API qatlami
├── backend/
│   ├── prisma/               # schema.prisma, migrations/ (16 ta), seed.ts, content/ (kontent skriptlari)
│   ├── scripts/              # prod-smoke.mjs, perf-check.mjs, perf-seed.sql
│   ├── src/
│   │   ├── config/ controllers/ middleware/ routes/ services/ validators/ utils/
│   │   ├── lib/              # permissions, pricing, payments/, media/, totp, schedule, attendance, redis…
│   │   └── scripts/          # createSuperadmin.ts
│   └── tests/                # Vitest (36 fayl)
├── e2e/                      # Playwright (15 spec)
├── deploy/                   # Dockerfile.api/web, docker-compose.prod.yml, nginx, backup/restore, .env.production.example
├── doc/                      # shu hujjat
└── docker-compose.yml        # lokal PostgreSQL
```

---

## 4. Rollar va ruxsatlar

Rollar (`Role` enum): `USER` (o‘quvchi), `TEACHER`, `MODERATOR`, `FINANCE`, `MANAGER`, `ADMIN`, `SUPERADMIN`.
Ruxsatlar kodda statik matritsa (`backend/src/lib/permissions.ts`) va **har so‘rovda serverda** tekshiriladi
(`requirePermission` / `requireAnyPermission`). Menyuni yashirish himoya hisoblanmaydi.

| Rol | Ruxsatlar |
|---|---|
| USER | — (faqat o‘z ma’lumotlari) |
| TEACHER | `teaching:access`, `attendance:mark` |
| MODERATOR | `admin:access`, `content:manage`, `tests:manage` |
| FINANCE | `admin:access`, `orders:read`, `payments:manage`, `reports:read` |
| MANAGER | `admin:access`, `users:read`, `groups:manage`, `schedule:manage`, `orders:read` (qabulxona) |
| ADMIN | kontent, foydalanuvchi, katalog, guruh/jadval, davomat, media, hisobot, audit, sozlamalar |
| SUPERADMIN | ADMIN + `roles:manage`, `payments:manage` |

Qoidalar: ADMIN/SUPERADMIN rolini faqat SUPERADMIN beradi; hech kim o‘zida yo‘q ruxsatni bera olmaydi; o‘z rolini o‘zgartirib bo‘lmaydi.

---

## 5. Sahifalar (frontend)

Barcha sahifalar `React.lazy` bilan alohida bo‘laklarga ajratilgan.

| Guruh | Yo‘llar |
|---|---|
| Ochiq | `/`, `/courses`, `/courses/:courseId`, `/about`, `/contact`, `/faq`, `/leaderboard`, `/news`, `/news/:slug`, `/p/:slug` (CMS sahifa), `/privacy`, `/terms` |
| Kirish | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| O‘quvchi | `/dashboard`, `/my-courses`, `/my-courses/:courseId`, `/lessons`, `/lessons/:lessonId`, `/lessons/:lessonId/video`, `/tests`, `/tests/:testId`, `/tests/:testId/result`, `/tests/:testId/review`, `/my-rating`, `/profile`, `/settings`, `/pricing`, `/orders`, `/notifications` |
| O‘qituvchi | `/teacher`, `/teacher/groups/:groupId` |
| Admin | `/admin`, `/admin/courses`, `/admin/categories`, `/admin/lessons`, `/admin/questions`, `/admin/catalog`, `/admin/orders`, `/admin/groups`, `/admin/exam`, `/admin/cms`, `/admin/users`, `/admin/media`, `/admin/audit`, `/admin/reports`, `/admin/system` |
| Xato | `/403`, `/500`, `*` (404) |

> 2026-10-19: o‘quvchi jadvali va davomati alohida sahifadan Dashboard’dagi `UpcomingSchedule` blokiga ko‘chirilmoqda (ish jarayonida).

Dizayn: brand ko‘k (`#2563eb`), accent sariq (`#f59e0b`); Tailwind `darkMode: "class"`; Inter va Plus Jakarta Sans shriftlari.

---

## 6. API (backend)

Bazaviy manzil: `http://localhost:5000/api`. Javob formati doim bir xil:

```json
{ "success": true, "data": { } }
{ "success": false, "message": "Xatolik", "errors": [] }
```

Autentifikatsiya: `Authorization: Bearer <access token>` (15 daqiqa, faqat xotirada) + `HttpOnly` refresh cookie (`/api/auth`).

| Bo‘lim | Endpointlar |
|---|---|
| Auth `/api/auth` | `POST register, login, 2fa/login, refresh, logout, logout-all, complete-registration, forgot-password, reset-password, verify-email, verify-email/resend, telegram/start, telegram/verify`; `GET me, 2fa`; `PUT password`; `POST 2fa/setup, 2fa/enable, 2fa/disable, 2fa/recovery-codes` |
| Profil | `GET/PUT /profile`, `GET/PUT /users/me`, `GET /users/me/statistics`, `GET /statistics`, `GET /leaderboard`, `PUT /users/me/leaderboard` |
| Kurs va dars | `GET /courses`, `/courses/:id`, `/courses/:id/lessons`, `/categories`, `/lessons`, `/lessons/:id` |
| Test | `POST /tests/start` (`mode`: `EXAM` / `MISTAKES` / `SAVED`), `/tests/:id/answer`, `/tests/:id/finish`; `GET /results`, `/results/:id` |
| Progress | `GET /progress`, `/progress/completed`, `/progress/:lessonId`; `PUT /progress/:lessonId` |
| Savdo | `GET /packages`, `POST /quote`, `POST/GET /orders`, `GET /orders/:id`, `POST /payments/webhook/:provider` |
| O‘quvchi | `GET /me/enrollments`, `/me/course-access`, `/me/notifications`, `/me/notification-preferences`, `/me/schedule`, `/me/attendance`, `/me/practice`; `PUT/DELETE /me/saved-questions/:questionId`; `POST /me/notifications/read-all`, `/me/notifications/:id/read`; `PUT /me/notification-preferences` |
| O‘qituvchi | `GET /groups`, `/groups/:id`, `/groups/:id/slots`, `/groups/:id/attendance-report`, `/teacher/schedule`, `/slots/:id/attendance`; `PATCH /slots/:id`; `PUT /slots/:id/attendance`; `POST /slots/:id/attendance/finalize` |
| Media | `POST /media/:kind/:id/access` → imzolangan URL; `GET /media/stream/:token` (Range); `GET /images/:name` (ochiq CMS rasmlari) |
| CMS (ochiq) | `GET /pages/:slug`, `/news`, `/news/:slug`, `/faq`, `/public-stats`, `/site-settings`; `POST /contact`; `/robots.txt`, `/sitemap.xml` |
| Admin `/api/admin` | `users` (+`/:id/role`, `/:id/status`, `/:id/two-factor`), `courses`, `lessons`, `questions`, `statistics` |
| Admin bo‘limlari | `/admin/catalog` (packages, prices, discounts, coupons), `/admin/categories`, `/admin/audit`, `/admin/finance` (orders, summary, refunds), `/admin/exam` (config, questions import/export), `/admin/media`, `/admin/cms` (pages, news, faq, site-settings, announcements, notification-templates, messages), `/admin/cms/images`, `/admin/groups` (members, slots), `/admin/reports` (leaderboard, tests, teachers), `/admin/system` |
| Tizim | `GET /api/health` (baza), `/api/health/live` (jarayon), `/api/metrics` (Prometheus, `METRICS_TOKEN` bilan) |

Test xavfsizligi: to‘g‘ri javoblar test davomida mijozga berilmaydi; variantlar har urinishda aralashtiriladi (`UserAnswer.optionOrder`);
ball, vaqt chegarasi va o‘tish holati serverda; takroriy `finish` ikkinchi natija yaratmaydi.

Test rejimlari (raqobatchi saytlar — avtoimtihon.uz, avto-exam.uz, pdd.auto.ru — tahlili asosida, 2026-10-19):
- `EXAM` — kurs qoidalari (`TestConfig`): savollar soni, vaqt, o‘tish bali, urinishlar, **ruxsat etilgan xatolar** (`maxMistakes`;
  rasmiy imtihon: 20 savoldan ≤ 2 xato, javobsiz savol ham xato). O‘tish = `score ≥ passScore` **va** xatolar ≤ `maxMistakes`.
- `MISTAKES` — "Xatolar ustida ishlash": o‘quvchi **oxirgi marta** xato javob bergan savollar; to‘g‘ri javob berilsa ro‘yxatdan chiqadi.
- `SAVED` — test tahlilida saqlangan savollar (`SavedQuestion`).
Mashq urinishlari (`MISTAKES`, `SAVED`) kurs qoidalari va urinish limitiga bo‘ysunmaydi, reyting, hisobot va umumiy statistikaga kirmaydi;
kursga kirish nazorati ular uchun ham amal qiladi.

---

## 7. Ma’lumotlar bazasi

PostgreSQL + Prisma (`backend/prisma/schema.prisma`), 49 ta model/enum, 16 ta migratsiya (faqat oldinga; "down" yo‘q).
**Pul hamma joyda `Int`, tiyinda** (1 so‘m = 100). Vaqtlar UTC, standart timezone `Asia/Tashkent`.

| Soha | Modellar |
|---|---|
| Foydalanuvchi | `User` (rol, `tokenVersion`, `failedLogins`, `lockedUntil`, `telegramId`), `StudentProfile`, `TeacherProfile` |
| Auth | `RefreshToken` (SHA-256, rotatsiya oilasi), `EmailVerification`, `PasswordReset`, `TelegramLogin` |
| O‘quv kontenti | `Category`, `Course` (+`CourseSection`), `Lesson`, `Video`, `Question` (variantlar JSON), `TestConfig` |
| Test | `Test` (= bitta urinish, `mode`, `maxMistakes`), `UserAnswer`, `SavedQuestion`, `Progress`, `LessonProgress` |
| Katalog | `CoursePackage`, `Price` (narx tarixi), `Discount`, `Coupon`, `CouponRedemption` |
| Savdo | `Order`, `OrderItem` (narx nusxasi), `Payment`, `PaymentEvent` (idempotent callback), `Refund`, `Enrollment` |
| O‘qitish | `TeacherGroup`, `GroupMembership`, `ScheduleSlot`, `AttendanceSession`, `AttendanceRecord` |
| Media | `VideoAsset`, `FileAsset`, `MediaAccessLog` (faqat ichki `storageKey`) |
| Xabarlar | `Notification` (`dedupeKey`, `emailStatus`), `NotificationPreference`, `NotificationTemplate` (tur × til) |
| CMS | `Page`, `NewsArticle`, `FaqItem`, `SiteSetting`, `ContactMessage` |
| Audit | `AuditLog` (faqat qo‘shiladi; parol/token/karta kalitlari olib tashlanadi) |

Buyruqlar:
```bash
npm run prisma:migrate       # dev: yangi migratsiya (-- --name <nom>)
npm run prisma:deploy        # test/production: mavjud migratsiyalarni qo‘llash
npm run prisma:seed          # demo ma’lumot — faqat lokal baza (production va masofaviy bazada rad etadi)
```

---

## 8. Lokal ishga tushirish

**Talablar:** Node.js 20+, npm, PostgreSQL 16+ (Docker, lokal o‘rnatma yoki `~/eavto-pg` dagi `embedded-postgres`).

```bash
# 1. Baza
docker compose up -d                    # yoki: cd ~/eavto-pg && node start.mjs  (5432, e_avto_test + e_avto_test_ci)

# 2. Backend  → http://localhost:5000/api/health
cd backend
npm install
cp .env.example .env                    # DATABASE_URL, JWT_SECRET
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed                     # ixtiyoriy demo
npm run dev

# 3. Frontend → http://localhost:5173
cd ../frontend
npm install
cp .env.example .env                    # VITE_API_URL=http://localhost:5000/api
npm run dev
```

Demo hisoblar (faqat seed): `admin@eavto.uz / admin123`, `user@eavto.uz / user123`
(`SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` bilan almashtiriladi). Backendsiz demo: `VITE_USE_MOCK=true`.

> **Diqqat:** kompyuterda boshqa loyihaning global `DATABASE_URL` i bo‘lishi mumkin. Dev serverda `backend/.env` ustun,
> lekin `prisma` va `vitest` buyruqlariga qiymatni inline bering: `DATABASE_URL="postgresql://…" npx prisma migrate deploy`.
> PowerShell’da: `$env:DATABASE_URL="…"; npx prisma migrate deploy`.

| Skript | Backend | Frontend |
|---|---|---|
| `dev` | `tsx watch` | Vite |
| `build` | `tsc` → `dist/` | `tsc --noEmit && vite build` |
| `typecheck`, `lint` | ✓ | ✓ |
| `test` | Vitest | — |
| boshqa | `start`, `smoke`, `create-superadmin`, `prisma:*` | `preview` |

---

## 9. Muhit o‘zgaruvchilari

To‘liq ro‘yxat `backend/.env.example` da (test `config.test.ts` uni kod bilan solishtiradi).

| O‘zgaruvchi | Ma’nosi |
|---|---|
| `DATABASE_URL`, `PORT` (5000), `NODE_ENV` | Asosiy |
| `JWT_SECRET` | Productionda ≥ 32 belgi, aks holda server ishga tushmaydi |
| `CLIENT_URL` | CORS originlari (vergul bilan; productionda faqat https) |
| `ACCESS_TOKEN_TTL` (15m), `REFRESH_TOKEN_TTL_DAYS` (30), `REFRESH_COOKIE_SAMESITE` (strict), `REFRESH_COOKIE_SECURE` | Sessiya |
| `TOTP_ENCRYPTION_KEY` | 2FA sirlarini shifrlash (bo‘sh = `JWT_SECRET` dan) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | Telegram kirishi |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | Email (bo‘sh = yuborilmaydi, dev’da havola konsolga) |
| `PAYMENT_PROVIDER` (bo‘sh / `mock`), `PAYMENT_MOCK_SECRET`, `ORDER_TTL_MINUTES` | To‘lov (`mock` productionda taqiqlangan) |
| `ENFORCE_ENROLLMENT` (true) | Darslar va testlar faqat sotib olingan kurs bilan |
| `MEDIA_UPLOAD_ENABLED` (false), `MEDIA_DIR`, `MEDIA_SIGNING_SECRET`, `MEDIA_URL_TTL_SECONDS`, `MAX_VIDEO_MB`, `MAX_FILE_MB`, `MAX_IMAGE_MB` | Private media |
| `STORAGE_DRIVER` (local / s3), `S3_*` | Fayl ombori |
| `CLAMAV_HOST/PORT/TIMEOUT_MS` | Antivirus (bo‘sh = skanerlanmaydi) |
| `REDIS_URL` | Rate limit hisoblagichlari (bo‘sh = jarayon xotirasi) |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | Xato kuzatuvi |
| `METRICS_TOKEN` | `/api/metrics` (≥ 24 belgi) |
| `LEADERBOARD_CACHE_SECONDS` (60), `PUBLIC_API_ORIGIN` | Kesh, CMS rasm havolalari |

Frontend: `VITE_API_URL`, `VITE_USE_MOCK`, `VITE_TELEGRAM_URL`. Production build https bo‘lmagan API yoki `VITE_USE_MOCK=true`
bilan **to‘xtaydi** (lokal sinov uchun `VITE_ALLOW_LOCAL_BUILD=true`).

---

## 10. Telegram orqali kirish

1. Saytda "Telegram orqali kirish" → `POST /api/auth/telegram/start` → `https://t.me/<bot>?start=<sessionId>` (sessiya 10 daqiqa).
2. Botda **Start** → bot 6 xonali kod yuboradi (5 daqiqa, bir martalik).
3. Kod saytga kiritiladi → `POST /api/auth/telegram/verify`.

Kod bazada xesh holida; 5 ta xato urinishdan keyin sessiya yopiladi; hisob doim `USER` rolida yaratiladi.
Sozlash: @BotFather → token → `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`. Standart rejim **long polling** (faqat bitta backend nusxasi).
Bir nechta nusxa bo‘lsa webhook: `TELEGRAM_WEBHOOK_SECRET` + `setWebhook?url=https://<API>/api/telegram/webhook/<secret>`.
Bot dars eslatmalarini ham yuboradi (`notification_telegram_reminders` migratsiyasi).

**Admin menyusi (botda).** Xodim botga `/admin` yuboradi → saytdagi admin hisobining telefon raqami → parol
(xabar darhol o‘chiriladi) → 2FA yoqilgan bo‘lsa autentifikator kodi. Alohida bot paroli yo‘q: saytdagi hisob,
uning bloklanishi (8 xato) va 2FA ishlatiladi; bitta chatdan 5 xato → 15 daqiqa blok. Sessiya 30 kun
(`telegram_admin_sessions`); parol almashsa, "hamma joydan chiqish", hisob bloklansa yoki rol `admin:access`ni
yo‘qotsa — darhol tugaydi. `/logout` yoki "🚪 Chiqish".
Menyu rolga qarab: 👥 O‘quvchilar va 🔎 Qidirish (`users:read`: soni, Telegram ulanganlar, kurslar, testlar,
qoldirilgan darslar), 🏆 Reyting va 📊 Statistika (`reports:read`), ✉️ Xabarlar (`content:manage`).
Saytdagi "Bog‘lanish" formasidan kelgan xabar `content:manage` huquqli, botga kirgan xodimlarga darhol yuboriladi
("✅ O‘qildi" tugmasi holatni READ qiladi, audit yoziladi). Bot o‘quvchilarga dars yoki test tarqatmaydi.

---

## 11. Testlash

| Qatlam | Joy | Buyruq |
|---|---|---|
| Backend unit + integratsiya (haqiqiy PostgreSQL) | `backend/tests` (36 fayl) | `DATABASE_URL=$U TEST_DATABASE_URL=$U npx vitest run` |
| E2E (Edge/Chromium, desktop + telefon) | `e2e/tests` (15 spec) | `cd e2e && npx playwright test` |
| Production smoke | `backend/scripts/prod-smoke.mjs` | `npm run build && SMOKE_DATABASE_URL=<scratch> npm run smoke` |
| Lint / typecheck | backend, frontend | `npm run lint`, `npm run typecheck` |
| Samaradorlik | `backend/scripts/perf-*` | 13-bo‘lim |

`$U` — alohida test bazasi (`e_avto_test_ci`), dev bazadan **boshqa**. `TEST_DATABASE_URL` berilmasa DB testlari
o‘tkazib yuboriladi (yashil, lekin hech narsa tekshirilmagan). E2E o‘zi backend (5055) va frontend (5173) ni ishga tushiradi,
`e_avto_test_e2e` bazasidan foydalanadi; ikki E2E bir vaqtda ishlamasin.

Baza **UTF8** bo‘lishi shart (Windows o‘rnatuvchisi `WIN1252` yaratishi mumkin → kirill/rus matni saqlanmaydi):
`CREATE DATABASE e_avto_test_ci ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0;`

Haqiqiy servislar bilan **sinalmagan**: Redis, ClamAV, S3/R2, Sentry, SMTP, Payme/Click (testlarda soxta serverlar).
Qoplanmagan: frontend komponent testlari, uzoq yuklama testi, vizual regressiya.

---

## 12. Xavfsizlik

Oxirgi ichki audit 2026-10-15/16; mustaqil pentest o‘tkazilmagan. Ochiq **Critical/High yo‘q**.

**Joriy himoyalar:**
- 15 daqiqalik access token (xotirada) + rotatsiyalanuvchi `HttpOnly; Secure; SameSite=Strict` refresh cookie; qayta ishlatilsa butun oila bekor.
- CSRF: `SameSite=Strict` + majburiy `X-Requested-With`.
- 8 ta xato paroldan keyin 15 daqiqa blokirovka (bazada); bcrypt; noma’lum email uchun ham bir xil vaqt.
- ADMIN/SUPERADMIN/FINANCE uchun ixtiyoriy TOTP 2FA (shifrlangan sir, replay himoyasi, 8 zaxira kod).
- Email tasdiqlash (24 soat, xesh); parol tiklash tokeni bir martalik (tranzaksiyada).
- Zod validatsiya; URL’lar faqat `http(s)` (`javascript:` XSS yopilgan); CMS HTML server va brauzerda tozalanadi.
- Route inventari testi: yangi route `authMiddleware`siz qo‘shilsa test yiqiladi; IDOR testlari.
- To‘lov: imzo tekshiruvi, summa/valyuta mosligi, idempotent webhook, promo-kod poygasidan himoya.
- Fayllar: tur baytlardan aniqlanadi, hajm oqimda cheklanadi, path traversal yo‘q, ixtiyoriy ClamAV (fail-closed).
- Helmet headerlari, CORS ro‘yxati, stack trace yashirilgan, loglarda token/sirlar yashiriladi.

**Ochiq xavflar:** real to‘lov provayderi imzo sxemasi tekshirilmagan (Medium); API boshqa saytda bo‘lsa `SameSite=none` kerak (Medium);
2FA majburiy emas; ro‘yxatdan o‘tishda email mavjudligi oshkor (`409`); frontend hostida qat’iy CSP qo‘yish kerak:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' https: blob:; connect-src 'self' https://<api-domen>; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Private media: yuklash standartda o‘chiq. Yoqilsa — 5 daqiqalik imzolangan URL, Range stream, har safar ruxsat qayta tekshiriladi,
harakatlanuvchi watermark (DRM emas). Tashqi CDN `videoUrl` imzolanmaydi.

---

## 13. Samaradorlik va optimallashtirish

### Backend o‘lchovi (sintetik katta hajm)
20 000 o‘quvchi, 30 000 buyurtma, 20 000 test (+100 000 javob), 100 000 bildirishnoma va audit yozuvi bilan:
deyarli barcha endpointlar **p50 15–17 ms, p95 17–33 ms**. Tuzatilganlar: `audit_logs(createdAt DESC)` indeksi (66 → 16 ms),
ochiq reyting va statistika uchun 60 soniyalik kesh (20 parallel p95: 357 → 8 ms).
Qayta o‘lchash: scratch baza → `perf-seed.sql` → `PERF_DB=<url> node scripts/perf-check.mjs`.

### 2026-10-19 tozalash va optimallashtirish
Usul: `knip` tahlili, so‘ng har bir nomzod `git grep` bilan qo‘lda tasdiqlandi (OPTIMIZATION_SKILL: avval o‘lcha).

**O‘chirilgan ishlatilmagan fayllar (frontend, 13 ta):** `constants/categories.ts`, `data/index.ts`, `data/mockTopics.ts`,
`services/index.ts`, `types/api.ts`, `types/index.ts`, `types/test.ts`, `utils/calculateProgress.ts`, `utils/formatDate.ts`,
`components/home/HeroCarVideo.tsx`, `HeroPositionedVideo.tsx`, `HeroVideoBackground.tsx`, `public/car.png` (2.1 MB).

**O‘chirilgan o‘lik kod:**
- Frontend: `CircularProgress`, `CardFooter`, `LoadingScreen`, `APP_NAME`, `DEFAULT_TEST_DURATION`, `EXAM_20/50/100_DURATION`; `date-fns` paketi.
- Backend: `authController.updateProfile` (ishlatilmaydigan nusxa — route `userController` dan foydalanadi), `adminMiddleware`,
  `isTemplateKey`, `setDriverForTests`, `resetStatsCache`, `LOCALIZED_SETTING_KEYS`.

**Til fayllari talab bo‘yicha yuklanadi:** ilgari uchala til (uz, uz_cyrl, ru) asosiy JS bo‘lagida edi. Endi `uz` bundle’da,
qolgan ikkitasi tanlanganda yuklanadi (`frontend/src/i18n/index.ts`: `setLanguage`, `i18nReady`; ilova til yuklangach chiziladi).

| O‘lchov | Oldin | Keyin |
|---|---:|---:|
| Asosiy JS bo‘lagi (raw) | 700.8 KB | 572.9 KB |
| Asosiy JS bo‘lagi (gzip) | 220 KB | 184 KB (−16%) |

Saqlab qolinganlar (ataylab): mock ma’lumotlar (`VITE_USE_MOCK` rejimida dinamik import), `i18n-cyrl.mjs`, `lint-summary.mjs`,
`perf-check.mjs`, `prisma/content/*.ts` — qo‘lda ishlatiladigan dev vositalar.

### Keyingi tavsiyalar (ustuvorlik bo‘yicha)
1. **`public/video/hero.mp4` — 10.7 MB.** Bosh sahifaning eng og‘ir resursi. `ffmpeg -i hero.mp4 -c:v libx264 -crf 28 -preset slow -an -movflags +faststart`
   bilan 2–4 MB ga tushadi; mobil uchun 720p alohida variant. Sifatni ko‘z bilan tasdiqlash kerak. (`login.mp4` 3.4 MB — xuddi shunday.)
2. **Dashboard bo‘lagi 380 KB** — asosan Recharts (`WeeklyActivityChart`). Grafikni `React.lazy` bilan alohida yuklash o‘quvchi kabinetini tezlashtiradi.
3. Shriftlar: Inter’ning `latin-ext`, `greek`, `cyrillic-ext` variantlari ham yuklanadi; faqat `latin` + `cyrillic` subsetlarini import qilish mumkin.
4. Uzoq muddatli yuklama testi (k6/Artillery) o‘tkazilmagan.

---

## 14. Productionga chiqarish

> **Eslatma:** real to‘lov provayderi (Payme / Click) hali ulanmagan — faqat `mock`. Server yuklash bosqichida **birinchi navbatda**
> shu qilinadi: provayder tanlash, merchant ID/kalitlar, sandbox, `PaymentProvider` interfeysini amalga oshirish, sandbox testlari.

```
Brauzer ──https──> TLS proksi (Caddy/nginx/Cloudflare)
                     ├─ example.uz      → web (nginx, statik SPA + CSP/HSTS)  127.0.0.1:8080
                     └─ api.example.uz  → api (Express)                        127.0.0.1:5000
                                             ├─ db (PostgreSQL)  ├─ redis  ├─ clamav (--profile antivirus)
```

```bash
cp deploy/.env.production.example deploy/.env.production       # sirlarni to‘ldiring, commit qilmang
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production up -d --build
# birinchi superadmin (faqat superadmin yo‘q bo‘lsa ishlaydi):
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production run --rm \
  -e BOOTSTRAP_EMAIL=owner@example.uz -e BOOTSTRAP_PASSWORD='<12+ belgi>' api node dist/scripts/createSuperadmin.js
```

- Migratsiyalar faqat `prisma migrate deploy`; `migrate dev/reset`, `db push` productionda **hech qachon**. Expand → contract tartibi.
- Backup: `deploy/backup.sh` (oxirgi 14 ta), tiklash `CONFIRM_RESTORE=yes deploy/restore.sh`. Kunlik cron + har deploydan oldin; tiklashni sinang.
- Tekshiruv: `npm run smoke`, `/api/health`, `/api/health/live`, CSP/HSTS headerlari.
- Monitoring: uptime (ikkala health), Sentry, `/api/metrics`, disk, backup yoshi, `payment.rejected` audit yozuvlari.
- Rollback: kod — oldingi teg bilan qayta build; migratsiya muammosi — `api` ni to‘xtatish → backup’dan tiklash → eski kod.
- **Holat:** CI/CD tayyor (`.github/workflows/ci.yml`, `deploy.yml`): push → test → GHCR image → SSH deploy (backup, healthcheck, rollback). To‘liq qo‘llanma: `docs/DEPLOYMENT.md`. Image va skriptlar real serverda hali **sinalmagan**; hosting/domen ulanmagan.

Chiqishdan oldingi ro‘yxat: sirlar yangi va repoda emas · DNS + HTTPS · migratsiyalar + superadmin · smoke o‘tgan ·
backup avtomatik **va tiklash sinalgan** · monitoring · privacy/terms huquqshunos ko‘rigidan o‘tgan · haqiqiy narxlar · real to‘lov.

---

## 15. Holat: tayyor / qisman / qilinmagan

**Tayyor va sinalgan (haqiqiy PostgreSQL + brauzer):** auth (6 rol, blokirovka, refresh rotatsiya, email tasdiqlash, 2FA), kurs/dars/test
(serverda baholash, vaqt, urinishlar, xato limiti, xatolar ustida ishlash, saqlangan savollar, import/eksport), katalog (paket, narx, chegirma, promo-kod), buyurtma va refund (**mock** to‘lov bilan),
kursga kirish nazorati, guruh/jadval/davomat (CSV), CMS (3 til), bildirishnomalar (sayt + email + Telegram eslatma), private media + watermark,
hisobotlar, audit, tizim holati sahifasi, kategoriyalar, dark mode kontrast testi, 3 tilli interfeys.

**Qisman:** rus va kirill matnlarini ona tilida so‘zlashuvchi ko‘rib chiqishi kerak · Redis/Sentry/S3/ClamAV/SMTP faqat soxta serverlar bilan
sinalgan · deploy fayllari sinalmagan · davomat foizi formulasi vaqtinchalik (`backend/src/lib/attendance.ts`).

**Qilinmagan:** real Payme/Click · SMS va telefon tasdiqlash · serverda backup tiklash sinovi · mustaqil xavfsizlik auditi ·
YHQ savollarini mutaxassis tasdiqlashi (seed’da savollar kam).

**Loyiha egasi hal qiladi:** haqiqiy narx va valyuta, to‘lov provayderi, refund siyosati, davomat formulasi, test qoidalari,
video joylashuvi (CDN yoki o‘z server), email/SMS provayder, domen va hosting, brend, maxfiylik siyosati va ma’lumot saqlash muddati.

**Arxitektura qarorlari:** mavjud React + Express + Prisma saqlanadi (Next.js’ga o‘tish yo‘q) · `Role.USER` = o‘quvchi ·
ruxsatlar kodda statik matritsa (jadval emas, eskalatsiya xavfi uchun) · pul `Int` tiyinda · `Lesson` = kontent, `ScheduleSlot` = jadval ·
`Test` = urinish · javob variantlari JSON.

---

## 16. Ishlash qoidalari (dasturchi va AI agentlar uchun)

Ishni boshlashdan oldin `C:\Users\Admin\Documents\GitHub\AI-Prompt-and-Dars\Dasturchi` dagi tegishli skillni o‘qing
(`00_CORE/*`, `01_SKILLS/<soha>/*_SKILL.md`; loyiha konteksti: `03_PROJECTS/active/e-avto-test/PROJECT_CONTEXT.md`).

1. O‘zgartirishdan oldin mavjud kod, route, API va sxemani o‘rganing; ishlayotgan funksiyani sababsiz o‘chirmang.
2. Biznes qoidalari service qatlamida; controller faqat request/response.
3. Javob formati: `{ success, data }` / `{ success, message, errors }`.
4. Har qanday kiritma serverda Zod bilan tekshiriladi; frontend validatsiyasiga tayanilmaydi.
5. Test javoblari va ball faqat serverda; to‘g‘ri javob test davomida mijozga yuborilmaydi.
6. Video faylini Node serverga yuklamang (tashqi CDN URL yoki yopiq private media).
7. Sirlar faqat `.env` da; log, commit yoki API javobiga tushmaydi.
8. API kontrakti o‘zgarsa: backend endpoint + frontend types/service + shu hujjat birga yangilanadi.
9. Prisma sxemasi o‘zgarsa: migratsiya + `prisma generate`.
10. TypeScript strict, `any` dan qoching; komponentlar qayta ishlatiladigan; mobil va dark mode.
11. O‘zgarishdan keyin: `typecheck`, `lint`, tegishli testlar. Bajarilmagan sinovni bajarildi deb yozmang.
12. Boshqa jarayon ayni fayllarni o‘zgartirayotgan bo‘lsa, ustidan yozmang.
