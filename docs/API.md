# E-Avto Test — Backend API ma'lumotnomasi

> Manba: `backend/src/routes/*.ts`, `backend/src/validators/*.ts` (2026-10-20 holati).
> Production: `https://e-avto-test-production.up.railway.app` — barcha yo'llar shu domen ostida (`/api/...`).

## 1. Umumiy qoidalar

### Javob formati

| Holat | Ko'rinishi |
|---|---|
| Muvaffaqiyat | `{ "success": true, "data": … }` (yaratishda HTTP `201`) |
| Sahifalangan ro'yxat | `{ "success": true, "data": [ … ], "pagination": { "page", "limit", "total" } }` |
| Xato | `{ "success": false, "message": "…", "errors": [ … ] }` |

Xato kodlari: `400` noto'g'ri so'rov · `401` kirilmagan / token eskirgan · `403` ruxsat yo'q · `404` topilmadi ·
`409` takror (masalan, telefon band) · `422` validatsiya (maydonlar `errors`da) · `429` juda ko'p so'rov · `503` xizmat sozlanmagan.

### Autentifikatsiya

- **Access token** (JWT, 15 daqiqa): `Authorization: Bearer <token>` sarlavhasida.
- **Refresh token**: httpOnly cookie (`SameSite=Strict`, `Secure`). `POST /api/auth/refresh` va `/logout` uchun
  `X-Requested-With: XMLHttpRequest` sarlavhasi **majburiy** (CSRF himoyasi).
- Parol o'zgarsa yoki "hamma joydan chiqish" bosilsa, eski tokenlar ishlamaydi (`tokenVersion`).
- 2FA yoqilgan xodim: `login` → `{ challengeToken }` → `POST /api/auth/2fa/login`.

### Belgilar (jadvallarda "Kim")

| Belgi | Ma'nosi |
|---|---|
| 🌐 | Ochiq — tokensiz |
| 🌐+ | Ochiq, token bo'lsa qo'shimcha ma'lumot (masalan, dars qulfi holati) |
| 🔑 | Kirgan har qanday foydalanuvchi |
| 🛡 `ruxsat` | Kirgan va rolida shu ruxsat bor (pastdagi jadval) |

### Rollar va ruxsatlar

| Ruxsat | USER | TEACHER | MODERATOR | FINANCE | MANAGER | ADMIN | SUPERADMIN |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `admin:access` | | | ✅ | ✅ | ✅ | ✅ | ✅ |
| `users:read` | | | | | ✅ | ✅ | ✅ |
| `users:manage` | | | | | | ✅ | ✅ |
| `roles:manage` | | | | | | | ✅ |
| `content:manage` | | | ✅ | | | ✅ | ✅ |
| `catalog:manage` | | | | | | ✅ | ✅ |
| `tests:manage` | | | ✅ | | | ✅ | ✅ |
| `orders:read` | | | | ✅ | ✅ | ✅ | ✅ |
| `payments:manage` | | | | ✅ | | | ✅ |
| `groups:manage`, `schedule:manage` | | | | | ✅ | ✅ | ✅ |
| `teaching:access`, `attendance:mark` | | ✅ | | | | ✅ | ✅ |
| `attendance:edit` | | | | | | ✅ | ✅ |
| `media:manage` | | | | | | ✅ | ✅ |
| `reports:read` | | | | ✅ | | ✅ | ✅ |
| `audit:read`, `settings:manage` | | | | | | ✅ | ✅ |

`MANAGER` — qabulxona/operator: o'quvchini guruhga yozadi, dars jadvalini tuzadi, buyurtmalarni ko'radi.

### Hisob raqamlari

| Maydon | Qachon beriladi | Ko'rinishi |
|---|---|---|
| `userNumber` | Ro'yxatdan o'tishda, har bir hisobga | `user0001`, `user0002`, … |
| `studentNumber` | **Birinchi kurs to'langanda** (to'lov provayderi tasdiqlaganda), alohida ketma-ketlik | `student0001`, `student0002`, … |

Ikkalasi ham doimiy, hech qachon qayta ishlatilmaydi. Kurs muddati tugasa ham `studentNumber` saqlanadi, qayta sotib olishda yangisi berilmaydi.
`studentNumber` yo'q = kurs sotib olmagan. Saytda ko'rinadigan ID: `studentNumber` bo'lsa `student####`, aks holda `user####`.

### Rate limit (cheklovlar)

`auth` (login/register/2FA/telegram) · `telegramCode` (kod tekshirish 10/15 daq) · `refresh` · `passwordReset` ·
`verification` · `contact` (aloqa formasi) · `test` (test, buyurtma, media). Bundan tashqari hisob 8 ta xato paroldan
keyin 15 daqiqaga bloklanadi. Redis bo'lmasa — xotirada (bitta server uchun yetarli).

---

## 2. Tizim

| Metod | Yo'l | Kim | Tavsif |
|---|---|---|---|
| GET | `/api/health/live` | 🌐 | Jarayon tirikmi (bazasiz). Railway healthcheck |
| GET | `/api/health`, `/health` | 🌐 | Baza ulanishi bilan: `{ status: "ok", database: "reachable" }` |
| GET | `/api/metrics` | `Bearer METRICS_TOKEN` | Prometheus metrikalari (token bo'lmasa 404) |
| GET | `/robots.txt`, `/sitemap.xml` | 🌐 | Qidiruv tizimlari uchun (bazadan yig'iladi) |
| POST | `/api/telegram/webhook/:secret` | maxfiy URL | Telegram webhook rejimi (polling o'rniga) |
| POST | `/api/payments/webhook/:provider` | provayder imzosi | To'lov tizimi xabarnomasi |

## 3. Auth — `/api/auth`

| Metod | Yo'l | Kim | Yuboriladi (body) | Qaytadi |
|---|---|---|---|---|
| POST | `/register` | 🌐 | `name` (2–100), `phone` (+998…), `password` (8+, harf va raqam), `email?` | `user`, `token` (+ refresh cookie) |
| POST | `/login` | 🌐 | `phone` (yoki `email`), `password` | `user`, `token` · yoki 2FA bo'lsa `challengeToken` |
| POST | `/2fa/login` | 🌐 | `challengeToken`, `code` (6 raqam yoki zaxira kod) | `user`, `token` |
| POST | `/refresh` | cookie + XHR | — | yangi `token` (refresh aylantiriladi) |
| POST | `/logout` | cookie + XHR | — | sessiya tugatiladi |
| POST | `/logout-all` | 🔑 | — | barcha qurilmalardan chiqish |
| GET | `/me` | 🔑 | — | joriy `user` (rol, `userNumber`, `studentNumber?`, `hasPassword`, `twoFactorEnabled`) — qarang: «Hisob raqamlari» |
| POST | `/complete-registration` | 🔑 | `name` (ism va familiya), `phone`, `password` | Telegram orqali kirganning 2-bosqichi |
| PUT | `/password` | 🔑 | `currentPassword`, `newPassword` | parol almashadi, boshqa sessiyalar tugaydi |
| POST | `/forgot-password` | 🌐 | `email` | ⚠️ email asosida (SMTP sozlanmagan) |
| POST | `/reset-password` | 🌐 | `token`, `password` | |
| POST | `/verify-email` | 🌐 | `token` | |
| POST | `/verify-email/resend` | 🔑 | — | |
| GET | `/2fa` | 🔑 | — | 2FA holati |
| POST | `/2fa/setup` | 🔑 xodim | — | `otpauthUrl`, `secret` (QR uchun) |
| POST | `/2fa/enable` | 🔑 xodim | `code` (6 raqam) | zaxira kodlar (bir marta ko'rsatiladi) |
| POST | `/2fa/disable` | 🔑 | `password?`, `code` | |
| POST | `/2fa/recovery-codes` | 🔑 | `code` | yangi zaxira kodlar |
| POST | `/telegram/start` | 🌐 | — | `botUrl`, `botUsername`, `codeLength: 6`, `expiresInSeconds: 300` |
| POST | `/telegram/verify` | 🌐 | `code` (botdan olingan 6 raqam) | `user`, `token` (yangi bo'lsa akkaunt yaratiladi) |

## 4. Foydalanuvchi va o'quvchi

| Metod | Yo'l | Kim | Yuboriladi / so'rov | Qaytadi |
|---|---|---|---|---|
| GET | `/api/profile`, `/api/users/me` | 🔑 | — | profil |
| PUT | `/api/profile`, `/api/users/me` | 🔑 | `name?`, `email?`, `phone?`, `avatarUrl?` | yangilangan profil |
| GET | `/api/statistics`, `/api/users/me/statistics` | 🔑 | — | `totalTests`, `averageScore`, `bestScore`, `passedTests`, `completedLessons`, `studyStreakDays`, `learningTime` (daq) |
| GET | `/api/leaderboard` | 🌐+ | `?courseId&sort=points\|accuracy\|tests` | reyting (rozilik berganlar), `me` — o'z o'rni |
| PUT | `/api/users/me/leaderboard` | 🔑 | `{ visible: boolean }` | reytingda ko'rinish |
| GET | `/api/me/enrollments` | 🔑 | — | sotib olingan kurslar |
| GET | `/api/me/course-access` | 🔑 | — | `{ all, courseIds[] }` — ochiq kurslar |
| GET | `/api/me/groups` | 🔑 | — | guruhlar: `name`, `course`, `days` (`ODD`=toq / `EVEN`=juft / `CUSTOM`), `weekdays`, `time` |
| GET | `/api/me/schedule` | 🔑 | `?from&to` (ISO sana) | dars jadvali (slotlar) |
| GET | `/api/me/attendance` | 🔑 | — | davomat |
| POST | `/api/me/study-time` | 🔑 | `{ kind: "lesson"\|"test", seconds: 1–600 }` | `{ credited }` — server faqat haqiqiy o'tgan vaqtni yozadi |
| GET | `/api/me/study-time/week` | 🔑 | — | dushanba–yakshanba: `days[{ date, lessonMinutes, testMinutes }]`, `totalMinutes` |
| GET | `/api/me/notifications` | 🔑 | — | `{ items, unread }` |
| POST | `/api/me/notifications/:id/read` | 🔑 | — | o'qildi |
| POST | `/api/me/notifications/read-all` | 🔑 | — | hammasi o'qildi |
| GET | `/api/me/notification-preferences` | 🔑 | — | sozlamalar |
| PUT | `/api/me/notification-preferences` | 🔑 | `inApp?`, `email?`, `attendance?`, `language?` | |
| GET | `/api/me/practice` | 🔑 | — | xato javoblar va saqlangan savollar ro'yxati |
| PUT | `/api/me/saved-questions/:questionId` | 🔑 | — | savolni saqlash |
| DELETE | `/api/me/saved-questions/:questionId` | 🔑 | — | saqlashdan olib tashlash |

## 5. Katalog: kurslar, darslar, paketlar

| Metod | Yo'l | Kim | So'rov | Qaytadi |
|---|---|---|---|---|
| GET | `/api/courses` | 🌐 | `?category&lang` | nashr qilingan kurslar (narx, davomiylik, rasm) |
| GET | `/api/courses/:id` | 🌐+ | | kurs tafsiloti |
| GET | `/api/courses/:id/lessons` | 🌐+ | | darslar ro'yxati (`locked`, ochilish sanasi) |
| GET | `/api/lessons` | 🌐+ | `?courseId` | darslar |
| GET | `/api/lessons/:id` | 🌐+ | | dars matni/video (sotib olinmagan bo'lsa qulf) |
| GET | `/api/categories` | 🌐 | `?lang` | toifalar |
| GET | `/api/packages` | 🌐 | | paketlar va amaldagi narx (`price.amount` — tiyinda) |
| POST | `/api/quote` | 🌐 | `packageId`, `couponCode?` | yakuniy narx: `subtotal`, `discountTotal`, `total`, `couponApplied` |

## 6. Test

| Metod | Yo'l | Kim | Yuboriladi | Qaytadi |
|---|---|---|---|---|
| POST | `/api/tests/start` | 🔑 | `courseId?`, `lessonId?`, `count?` (1–100), `mode?` (`EXAM`\|`MISTAKES`\|`SAVED`) | test `id`, savollar (to'g'ri javobsiz), `duration` |
| POST | `/api/tests/:id/answer` | 🔑 | `questionId`, `selectedIndex` (0–7) | qabul qilindi |
| POST | `/api/tests/:id/finish` | 🔑 | `answers?[{ questionId, selectedIndex }]` | natija: ball, `passed`, xatolar |
| GET | `/api/results` | 🔑 | | o'z natijalari |
| GET | `/api/results/:id` | 🔑 | | natija va har savol tahlili |

> Server tekshiradi: kurs sotib olinganmi (`ENFORCE_ENROLLMENT`), vaqt tugaganmi, urinishlar limiti. Savol bo'lmasa — `400 No questions available`.

## 7. Dars progressi

| Metod | Yo'l | Kim | Yuboriladi |
|---|---|---|---|
| GET | `/api/progress` | 🔑 | — kurslar bo'yicha foiz |
| GET | `/api/progress/completed` | 🔑 | — tugatilgan darslar |
| GET | `/api/progress/:lessonId` | 🔑 | — |
| PUT | `/api/progress/:lessonId` | 🔑 | `{ percent: 0–100 }` |

## 8. Buyurtma va to'lov

| Metod | Yo'l | Kim | Yuboriladi | Qaytadi |
|---|---|---|---|---|
| POST | `/api/orders` | 🔑 | `packageId`, `couponCode?` | buyurtma, `redirectUrl` (to'lov sahifasi) |
| GET | `/api/orders` | 🔑 | | o'z buyurtmalari |
| GET | `/api/orders/:id` | 🔑 | | holat (to'lovdan qaytganda tekshiriladi) |

> ⚠️ `PAYMENT_PROVIDER` hozir bo'sh — onlayn to'lov ulanmagan (`503 Payments are not configured`).

## 9. Media

| Metod | Yo'l | Kim | Tavsif |
|---|---|---|---|
| POST | `/api/media/:kind/:id/access` | 🔑 | Yopiq video/fayl uchun vaqtinchalik imzolangan havola |
| GET | `/api/media/stream/:token` | imzo | Video oqimi |
| GET | `/api/images/:name` | 🌐 | Admin yuklagan rasm |

## 10. CMS (ochiq)

| Metod | Yo'l | Kim | So'rov / body |
|---|---|---|---|
| GET | `/api/pages/:slug` | 🌐 | `?lang` |
| GET | `/api/news` | 🌐 | `?page&limit` (≤50) |
| GET | `/api/news/:slug` | 🌐 | |
| GET | `/api/faq` | 🌐 | |
| GET | `/api/public-stats` | 🌐 | → `users`, `questions`, `testsTaken`, `passRate` |
| GET | `/api/site-settings` | 🌐 | → sayt nomi, telefon, manzil, `branches[]`, `telegramBot` … |
| POST | `/api/contact` | 🌐 | `name`, `contact` (telefon), `message` (10+), `website` (honeypot — bo'sh). Botga kirgan adminlarga darhol yuboriladi |

## 11. O'qituvchi (guruh, jadval, davomat) — 🛡 `teaching:access` yoki `groups:manage`

Davomatni belgilash/yakunlash uchun alohida `attendance:mark` kerak (MANAGER'da yo'q).

| Metod | Yo'l | Yuboriladi / so'rov |
|---|---|---|
| GET | `/api/groups` | — o'z guruhlari (`groups:manage` — hammasi) |
| GET | `/api/groups/:id` | — guruh va a'zolar |
| GET | `/api/groups/:id/slots` | — darslar |
| GET | `/api/groups/:id/attendance-report` | — davomat hisoboti |
| GET | `/api/groups/:id/attendance-report.csv` | davomat hisoboti CSV fayl sifatida |
| GET | `/api/teacher/schedule` | `?from&to` |
| PATCH | `/api/slots/:id` | `topic?`, `room?`, `onlineUrl?` (https), `status?` (`PLANNED`\|`DONE`\|`CANCELLED`) |
| GET | `/api/slots/:id/attendance` | — ro'yxat |
| PUT | `/api/slots/:id/attendance` | `records[{ studentId, status: PRESENT\|ABSENT\|LATE\|EXCUSED\|ONLINE, note? }]`, `reason?` (saqlanganni o'zgartirishda majburiy) |
| POST | `/api/slots/:id/attendance/finalize` | — yakunlash (ABSENT → bildirishnoma + Telegram eslatma ×3) |

## 12. Admin

### Foydalanuvchilar, kurslar, darslar, savollar — `/api/admin`

| Metod | Yo'l | 🛡 | Yuboriladi / so'rov |
|---|---|---|---|
| GET | `/users` | `users:manage` yoki `users:read` | `?page&limit&search&role&kind=student\|user` — `search`: ism, email, telefon yoki `student0001`/`user0001`; javobda `userNumber`, `studentNumber`, `phone` |
| PATCH | `/users/:id/role` | `users:manage` (+ ADMIN/SUPERADMIN uchun `roles:manage`) | `{ role }` |
| PATCH | `/users/:id/status` | `users:manage` | `{ isActive }` |
| DELETE | `/users/:id/two-factor` | `users:manage` | 2FA ni tiklash |
| GET | `/statistics` | `users:manage` | umumiy statistika (`totalUsers`, `totalStudents` — kurs sotib olganlar, …) |
| GET | `/courses` | katalog/test/guruh | |
| POST · PUT `/:id` · DELETE `/:id` | `/courses` | `catalog:manage` | `title`, `description`, `thumbnail?`, `level?`, `order?`, `isPublished?`, `categoryId?`, `studyPeriod?`, `section?` (`MAIN`\|`COMBINED`\|`EXTRA`), `price?` |
| GET | `/lessons` | katalog/test/guruh | `?courseId` |
| POST · PUT `/:id` · DELETE `/:id` | `/lessons` | `catalog:manage` | `courseId`, `title`, `description?`, `content?` (HTML ≤50 000), `videoUrl?`, `thumbnail?`, `duration?` (soniya), `order?`, `isPublished?` |
| GET | `/questions` | `tests:manage` | `?page&limit&search` |
| POST · PUT `/:id` · DELETE `/:id` | `/questions` | `tests:manage` | `courseId?`, `lessonId?`, `text`, `imageUrl?`, `options[2–8]`, `correctIndex`, `explanation?`, `difficulty?` (`EASY`\|`MEDIUM`\|`HARD`), `order?`, `isPublished?` |

### Imtihon sozlamalari — `/api/admin/exam` — 🛡 `tests:manage`

| Metod | Yo'l | Yuboriladi |
|---|---|---|
| GET · PUT | `/courses/:id/config` | `questionCount` (1–100), `durationSeconds?`, `passScore` (1–100), `maxAttempts?`, `maxMistakes?` |
| POST | `/questions/import` | JSON: `{ questions: [ { text, options[], correctIndex, explanation?, courseId?, lessonId?, … } ] }` |
| GET | `/questions/export` | `?courseId` → `{ questions: [...] }` (import bilan bir xil format) |

### Toifalar — `/api/admin/categories`

| Metod | Yo'l | 🛡 | Yuboriladi |
|---|---|---|---|
| GET | `/` | katalog yoki test | |
| POST · PUT `/:id` · DELETE `/:id` | `/` | `catalog:manage` | `slug?`, `name`, `description?`, `order?`, `isActive?`, `translations?` (`uz_cyrl`, `ru`) |

### Paketlar, narxlar, chegirmalar — `/api/admin/catalog` — 🛡 `catalog:manage`

| Metod | Yo'l | Yuboriladi |
|---|---|---|
| GET · POST | `/packages` | `courseId`, `name`, `description?`, `durationDays?`, `order?`, `isActive?` |
| PUT · DELETE | `/packages/:id` | (DELETE — arxivlash) |
| POST | `/packages/:id/prices` | `amount` (tiyin), `currency` (UZS), `validFrom?`, `validTo?`, `isSample?` |
| GET · POST | `/discounts` | `name`, `type` (`PERCENT`\|`FIXED`), `value`, `packageId?`, `startsAt?`, `endsAt?` |
| PATCH | `/discounts/:id` | yoqish/o'chirish |
| GET · POST | `/coupons` | `code` (A-Z0-9_-), `type`, `value`, `maxRedemptions?`, `minOrderAmount?`, `expiresAt?` |
| PATCH | `/coupons/:id` | yoqish/o'chirish |

### Guruhlar — `/api/admin/groups` — 🛡 `groups:manage`

| Metod | Yo'l | Yuboriladi |
|---|---|---|
| POST | `/` | `name`, `courseId`, `teacherId`, `startDate`, `endDate?`, `capacity` (1–200) |
| PUT · DELETE | `/:id` | (DELETE — arxivlash) |
| POST | `/:id/members` | `{ studentId }` |
| DELETE | `/:id/members/:studentId` | |
| POST | `/:id/slots` | `startsAt`, `endsAt` (≤12 soat), `room?`, `onlineUrl?`, `topic?`, `repeat?{ everyWeeks 1–8, count 2–104 }` (xona/o'qituvchi to'qnashuvi tekshiriladi) |

### CMS — `/api/admin/cms` — 🛡 `content:manage`

| Metod | Yo'l | Yuboriladi |
|---|---|---|
| GET · POST · PUT `/:id` | `/pages` | `slug`, `title`, `content`, `seoTitle?`, `seoDescription?`, `status`, `translations?` |
| GET · POST · PUT `/:id` | `/news` | + `summary?`, `coverUrl?` |
| GET · POST · PUT `/:id` · DELETE `/:id` | `/faq` | `question`, `answer`, `order?`, `isPublished?`, `translations?` |
| GET | `/site-settings` | — |
| PUT | `/site-settings` (🛡 `settings:manage`) | `siteName`, `phone`, `email`, `address`, `workingHours`, `logoUrl`, `brandColor`, `heroTitle`, `social{}`, `branches[{ name, address }]` (≤20), `translations` |
| POST | `/announcements` | `title`, `body`, `audience`: `{type:"all"}` \| `{type:"group",groupId}` \| `{type:"course",courseId}` |
| GET | `/notification-templates` (🛡 `settings:manage`) | |
| PUT · DELETE | `/notification-templates/:key/:language` | `subject`, `body` (`{name}`, `{amount}` … o'rinbosarlar tekshiriladi) |
| GET | `/messages` | `?status=NEW\|READ\|ARCHIVED` — aloqa formasi xabarlari |
| PATCH | `/messages/:id` | `{ status }` |
| GET · PUT · DELETE `/:id` | `/images` | rasm kutubxonasi (`?filename`, ≤ `MAX_IMAGE_MB`) |

### Media — `/api/admin/media` — 🛡 `media:manage`

| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/config` | `uploadEnabled`, `maxVideoMb`, `maxFileMb` |
| GET | `/` | yuklangan fayllar |
| PUT | `/:kind` | yuklash (`?lessonId&courseId&title&filename`) — `MEDIA_UPLOAD_ENABLED=true` kerak |
| DELETE | `/video/:id` | arxivlash |

### Moliya — `/api/admin/finance` — 🛡 `orders:read`

| Metod | Yo'l | 🛡 | Yuboriladi / so'rov |
|---|---|---|---|
| GET | `/orders` | | `?page&limit&status=PENDING\|PAID\|CANCELLED\|EXPIRED\|REFUNDED&search` |
| GET | `/summary` | | `?from&to` — tushum |
| GET | `/refunds` | `payments:manage` | |
| POST | `/payments/:id/refunds` | `payments:manage` | `amount`, `reason` |
| POST | `/refunds/:id/complete` | `payments:manage` | |
| POST | `/refunds/:id/reject` | `payments:manage` | `reason` |

### Hisobotlar, audit, tizim

| Metod | Yo'l | 🛡 | So'rov |
|---|---|---|---|
| GET | `/api/admin/reports/leaderboard` | `reports:read` | `?courseId&sort&period=all\|month\|week` |
| GET | `/api/admin/reports/tests` | `reports:read` | `?from&to&courseId` (standart: oxirgi 30 kun, ≤366 kun) |
| GET | `/api/admin/reports/teachers` | `reports:read` | `?from&to` (≤366 kun) |
| GET | `/api/admin/audit` | `audit:read` | `?page&limit&entity&action&actorId` |
| GET | `/api/admin/system` | `settings:manage` | baza, migratsiyalar, to'lov, email, Telegram, media, Redis holati (sirlarsiz) |

## 13. Telegram bot (HTTP emas — bot buyruqlari)

| Buyruq | Kim | Natija |
|---|---|---|
| `/start`, `/code` | hamma | Saytga kirish uchun 6 xonali kod (5 daqiqa, bir martalik) |
| `/admin` → telefon → parol (→ 2FA kod) | `admin:access` | Xodim menyusi: 👥 O'quvchilar, 🔎 Qidirish, 🏆 Reyting, 📊 Statistika, ✉️ Xabarlar, 🚪 Chiqish |
| `/logout`, `/cancel` | xodim | Chiqish / kirishni bekor qilish |
| Avtomatik | — | Aloqa formasi xabari → xodimlarga; dars qoldirilsa → o'quvchiga 3 marta eslatma |
