# API hujjatlari — E-Avto Test

Bazaviy manzil: `http://localhost:5000/api`

Barcha javoblar:

```json
{ "success": true, "data": { } }
{ "success": true, "data": [ ], "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
{ "success": false, "message": "Xatolik", "errors": [] }
```

Autentifikatsiya: `Authorization: Bearer <token>` sarlavhasi. `token` — **qisqa muddatli access token** (`ACCESS_TOKEN_TTL`, standart `15m`).
Sessiyani **refresh token** davom ettiradi: u faqat `eavto_rt` cookie’sida (`HttpOnly`, `Secure`, `SameSite=Strict` (`REFRESH_COOKIE_SAMESITE`), `Path=/api/auth`, muddati `REFRESH_TOKEN_TTL_DAYS`=30 kun) keladi va hech qachon javob tanasida bo‘lmaydi.
Brauzer klienti `withCredentials: true` bilan ishlaydi; access token faqat xotirada saqlanadi, `401` olganda `POST /api/auth/refresh` bilan yangilanadi.
Har so‘rovda foydalanuvchi bazadan tekshiriladi: bloklangan hisob `403`, bekor qilingan token `401` oladi.

HTTP statuslari: `200/201` muvaffaqiyat, `400` noto'g'ri so'rov, `401` autentifikatsiya yo'q/yaroqsiz, `403` ruxsat yo'q, `404` topilmadi, `409` ziddiyat (masalan, takroriy email), `422` validatsiya xatosi (`errors` ichida maydonlar), `429` limit oshdi, `500` server xatosi (tafsilotlarsiz).

## Auth

| Metod | Yo‘l | Body | Javob |
|-------|------|------|-------|
| POST | `/api/auth/register` | `{ name, email, password, phone? }` | `201 { user, token, emailVerification: { sent, mailConfigured } }` + refresh cookie |
| POST | `/api/auth/login` | `{ email, password }` | `{ user, token }` + refresh cookie, **yoki** 2FA yoqilgan bo‘lsa `{ twoFactorRequired: true, challengeToken }` (cookie yo‘q) |
| POST | `/api/auth/2fa/login` | `{ challengeToken, code }` | `{ user, token }` + refresh cookie. `code` — 6 xonali TOTP yoki zaxira kod (`xxxxx-xxxxx`). Noto‘g‘ri kod `401`, blok `429` |
| POST | `/api/auth/refresh` | — (cookie) | `{ user, token }` + **yangi** refresh cookie (rotatsiya). `X-Requested-With: XMLHttpRequest` sarlavhasi shart (aks holda `403`); cookie yo‘q/yaroqsiz `401` va cookie o‘chiriladi |
| POST | `/api/auth/logout` | — (cookie) | `{ loggedOut: true }` — shu qurilma sessiyasi (refresh oilasi) bekor, cookie o‘chiriladi. `X-Requested-With` shart, access token shart emas |
| GET  | `/api/auth/me` | — | `User` (`emailVerified`, `twoFactorEnabled` bilan) |
| PUT  | `/api/auth/password` | `{ currentPassword, newPassword }` | `{ changed: true, token }` + yangi refresh cookie — boshqa barcha sessiyalar bekor |
| POST | `/api/auth/logout-all` | — | `{ loggedOut: true }` — barcha access va refresh tokenlar bekor |
| POST | `/api/auth/forgot-password` | `{ email }` | `{ sent: true }` (hisob bor-yo‘qligini bildirmaydi) |
| POST | `/api/auth/reset-password` | `{ token, password }` | `{ reset: true }` — barcha sessiyalar bekor |
| POST | `/api/auth/verify-email` | `{ token }` | `{ verified: true }`; yaroqsiz/eskirgan/ishlatilgan havola `400` |
| POST | `/api/auth/verify-email/resend` | — | `{ alreadyVerified, sent, mailConfigured }` (5 ta / 15 daqiqa) |
| GET  | `/api/auth/2fa` | — | `{ available, enabled, enabledAt, recoveryCodesLeft }` |
| POST | `/api/auth/2fa/setup` | — | `{ secret, otpauthUrl }` — faqat ADMIN/SUPERADMIN/FINANCE (`403`), yoqilgan bo‘lsa `409` |
| POST | `/api/auth/2fa/enable` | `{ code }` | `{ enabled: true, recoveryCodes: [8 ta] }` — kodlar faqat bir marta ko‘rsatiladi |
| POST | `/api/auth/2fa/disable` | `{ password?, code }` | `{ enabled: false }` — parol (hisobda bo‘lsa) va kod shart |
| POST | `/api/auth/2fa/recovery-codes` | `{ code }` | `{ recoveryCodes }` — eskilari bekor |
| DELETE | `/api/admin/users/:id/two-factor` | — | `{ id, twoFactorEnabled: false }` — faqat SUPERADMIN, o‘ziga emas; sessiyalar yopiladi, auditga yoziladi |

| POST | `/api/auth/telegram/start` | — | `{ sessionId, botUrl, expiresInSeconds }` (bot sozlanmagan bo‘lsa `503`) |
| POST | `/api/auth/telegram/verify` | `{ sessionId, code }` | `/login` bilan bir xil: `{ user, token }` + cookie yoki `{ twoFactorRequired, challengeToken }` — batafsil: [telegram.md](telegram.md) |

Telegram orqali yaratilgan hisobda `email` bo‘lmasligi mumkin (`emailVerified` — `undefined`).

Parol qoidasi: kamida 8 belgi, kamida bitta harf va bitta raqam. `role` ro‘yxatdan o‘tishda tanlanmaydi (doim `USER`).

**Refresh token rotatsiyasi.** Har login yangi “oila” boshlaydi; har `refresh` taqdim etilgan tokenni “ishlatilgan” deb belgilaydi va o‘rniga yangisini beradi. Allaqachon ishlatilgan yoki bekor qilingan token qayta kelsa (o‘g‘irlik belgisi), **butun oila bekor qilinadi** — o‘g‘ri ham, egasi ham qaytadan kiradi. Bazada faqat SHA-256 xeshi saqlanadi. Parol almashtirish/tiklash, `logout-all`, rol o‘zgarishi, bloklash va 2FA reset barcha refresh tokenlarni bekor qiladi.

**Email tasdiqlash.** Email bilan ro‘yxatdan o‘tganda (va profilda email o‘zgarganda) 24 soatlik bir martalik havola yuboriladi: `<CLIENT_URL>/verify-email?token=...`. `emailVerification.sent` faqat SMTP server xatni qabul qilganda `true`; `mailConfigured: false` — SMTP sozlanmagan (xat yuborilmagan, havola faqat development konsolida). Tasdiqlanmagan email hozircha hech narsani bloklamaydi (ogohlantirish ko‘rsatiladi).

**2FA (TOTP).** RFC 6238, SHA-1, 6 raqam, 30 soniya, ±1 qadam; bir kod qayta ishlatilmaydi. Sir AES-256-GCM bilan shifrlangan (`TOTP_ENCRYPTION_KEY`, bo‘sh bo‘lsa `JWT_SECRET` dan), zaxira kodlar SHA-256 xeshda. Noto‘g‘ri kodlar parol bilan bir xil hisob blokirovkasiga qo‘shiladi. `challengeToken` 5 daqiqa amal qiladi va access token sifatida qabul qilinmaydi.

Parolni tiklash tokeni bir martalik, 30 daqiqa amal qiladi, bazada faqat SHA-256 xeshi saqlanadi. Havola `SMTP_*` sozlangan bo‘lsa email bilan yuboriladi (`<CLIENT_URL>/reset-password?token=...`); sozlanmagan bo‘lsa faqat development konsoliga chiqadi.

## Kurslar / Darslar (ommaviy)

Faqat `isPublished = true` yozuvlar qaytadi.

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/courses` | Kurslar ro‘yxati (`lessonCount` bilan) |
| GET | `/api/courses/:id` | Kurs + darslar (`questionCount` bilan) |
| GET | `/api/courses/:id/lessons` | Kurs darslari |
| GET | `/api/lessons` | Barcha nashr etilgan darslar |
| GET | `/api/lessons/:id` | Dars + `videoUrl` (davomiylik **soniyada**). Savollar va izohlar bu yerda **berilmaydi** |

## Test tizimi (autentifikatsiya shart)

| Metod | Yo‘l | Body | Izoh |
|-------|------|------|------|
| POST | `/api/tests/start` | `{ courseId?, lessonId?, count? }` | `{ test:{id,totalQuestions,duration,startedAt}, questions:[{id,text,imageUrl,options,order}] }` |
| POST | `/api/tests/:id/answer` | `{ questionId, selectedIndex }` | `{ saved: true }` — ixtiyoriy, javobni darhol saqlaydi |
| POST | `/api/tests/:id/finish` | `{ answers?: [{questionId, selectedIndex}] }` | To‘liq natija (`GET /results/:id` bilan bir xil). Takroriy chaqiriq xuddi shu natijani qaytaradi |

Qoidalar:
- `count` standart 50. Vaqt: ≤20 savol — 20 daqiqa, ≤50 — 45 daqiqa, ≤100 — 90 daqiqa (`duration`, soniyada). O‘tish chegarasi **70%**.
- Har urinishda savollar tartibi **va variantlar tartibi** Fisher-Yates bilan aralashtiriladi; `selectedIndex` mijozga ko‘rsatilgan (aralashgan) tartibdagi indeks.
- Test davomida `correctIndex` va `explanation` hech qachon yuborilmaydi.
- Vaqtni server nazorat qiladi: `duration + 10 soniya` dan keyin kelgan javoblar (`/answer` ham, `/finish` ichidagi `answers` ham) hisobga olinmaydi; `timeSpent` `duration` bilan cheklanadi.
- Boshqa foydalanuvchining testiga murojaat `403` qaytaradi.

## Natijalar

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/results` | Yakunlangan urinishlar ro‘yxati (`createdAt`, `skippedAnswers` bilan) |
| GET | `/api/results/:id` | Natija + `answers[]` (`options`, `correctIndex`, `selectedIndex`, `explanation`). Yakunlanmagan test uchun `409` |

## Profil, statistika, reyting

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/profile` (`/api/users/me`) | `{ user: { ...User, progress: [{ courseId, course, completedLessons, pct }] } }` |
| PUT | `/api/profile` (`/api/users/me`) | `{ name?, email?, phone?, avatarUrl? }` -> `{ user }` |
| GET | `/api/statistics` (`/api/users/me/statistics`) | `totalTests, averageScore, bestScore, passedTests, failedTests, completedLessons, studyStreakDays, learningTime` (daqiqa) |
| GET | `/api/leaderboard` | Top 50, `rank, name, tests, averageScore, points` |

## Progress (autentifikatsiya shart)

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/progress` | Kurslar kesimida progress |
| GET | `/api/progress/completed` | Yakunlangan dars ID’lari |
| GET | `/api/progress/:lessonId` | Bitta dars progressi |
| PUT | `/api/progress/:lessonId` | `{ percent: 0..100 }` — progress faqat oldinga siljiydi |

## Admin (`ADMIN` roli shart; rol har so‘rovda bazadan tekshiriladi)

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/admin/statistics` | `totalUsers, totalCourses, totalLessons, totalQuestions, totalTests, averageScore, passRate` |
| GET | `/api/admin/users?page&limit&search` | Sahifalangan ro‘yxat |
| PATCH | `/api/admin/users/:id/status` | `{ isActive }` — bloklash barcha tokenlarni bekor qiladi (o‘zini bloklab bo‘lmaydi) |
| PATCH | `/api/admin/users/:id/role` | `{ role: "USER" \| "ADMIN" }` (o‘z rolini o‘zgartirib bo‘lmaydi) |
| GET/POST | `/api/admin/courses` | Barcha kurslar (qoralamalar bilan) / yaratish |
| PUT/DELETE | `/api/admin/courses/:id` | Tahrirlash / o‘chirish |
| GET/POST | `/api/admin/lessons?courseId` | Darslar / yaratish (`videoUrl` — faqat tashqi CDN URL) |
| PUT/DELETE | `/api/admin/lessons/:id` | Tahrirlash / o‘chirish |
| GET | `/api/admin/questions?page&limit&search` | Sahifalangan savollar (`correctIndex` bilan) |
| POST | `/api/admin/questions` | `{ text, options[2..8], correctIndex, explanation?, difficulty?, courseId?, lessonId?, imageUrl? }` |
| PUT/DELETE | `/api/admin/questions/:id` | Tahrirlash / o‘chirish |

## Health

`GET /api/health` (va `/health`) → `{ success, status: "ok", service, database: "reachable" }`. Baza ishlamasa `500`.

## Rate limit

- `/auth/register`, `/auth/login`, `/auth/password`: 20 so‘rov/daqiqa.
- `/auth/forgot-password`, `/auth/reset-password`: 5 so‘rov/15 daqiqa.
- `/tests/*`: 120 so‘rov/daqiqa.
`REDIS_URL` berilsa hisoblagichlar Redis’da (barcha API nusxalari uchun umumiy), aks holda har jarayon xotirasida. Redis ishlamasa so‘rov cheklovsiz o‘tkaziladi.

## Metrikalar

`GET /api/metrics` — Prometheus matn formati, `Authorization: Bearer <METRICS_TOKEN>`; token o‘rnatilmagan yoki noto‘g‘ri bo‘lsa `404`.
`http_requests_total{method,route,status}`, `http_request_duration_seconds` (histogram), `http_server_errors_total`, `process_resident_memory_bytes`, `app_database_up`, `app_redis_up`.

## Kategoriyalar

Ochiq: `GET /api/categories?lang` — faol kategoriyalar (`id, slug, name, description, order, courseCount` — nashr etilgan kurslar soni), tashrifchi tilida.
`GET /api/courses?category=<slug>&lang` — shu kategoriyadagi kurslar (noma’lum yoki yashirin slug → bo‘sh ro‘yxat). Har kursda `category: { id, slug, name } | null`.
Admin (`/api/admin/categories`): `GET` (`catalog:manage` yoki `tests:manage`), `POST`, `PUT /:id`, `DELETE /:id` (`catalog:manage`).
Maydonlar: `name` (2–120), `slug?` (bo‘sh bo‘lsa nomdan), `description?`, `order?`, `isActive?`, `translations?: { uz_cyrl?: {name, description}, ru?: {...} }`.
Kategoriya o‘chirilsa kurslar o‘chmaydi, `categoryId = null` bo‘ladi. Kurs yaratish/yangilashda `categoryId` (uuid yoki `null`).

## Katalog va narxlar (06-bosqich)

Summalar butun son, minor birlikda (tiyin). Mijoz summa yubormaydi — server hisoblaydi.

| Metod | Yo‘l | Kim | Izoh |
|---|---|---|---|
| GET | `/api/packages?courseId=` | ochiq | Faol paketlar va joriy narx |
| POST | `/api/quote` | ochiq (rate limit) | `{ packageId, couponCode? }` → `{ subtotal, discountTotal, total, couponApplied, couponRejection? }` |
| GET/POST | `/api/admin/catalog/packages` | `catalog:manage` | Ro‘yxat / yaratish |
| PUT/DELETE | `/api/admin/catalog/packages/:id` | `catalog:manage` | Tahrirlash / arxivlash |
| POST | `/api/admin/catalog/packages/:id/prices` | `catalog:manage` | Yangi narx (oldingisi yopiladi) |
| GET/POST/PATCH | `/api/admin/catalog/discounts` | `catalog:manage` | Chegirmalar |
| GET/POST/PATCH | `/api/admin/catalog/coupons` | `catalog:manage` | Promo-kodlar |

Hisoblash tartibi: eng yaxshi bitta avtomatik chegirma, so‘ng promo-kod qolgan summadan. Promo-kod slot'i
buyurtma yaratishda `reserveCouponSlot` (bitta shartli UPDATE) orqali band qilinadi.

## Buyurtma va to‘lov (07-bosqich)

`PAYMENT_PROVIDER=mock` + `PAYMENT_MOCK_SECRET` bo‘lmasa buyurtma 503 qaytaradi. `mock` productionda taqiqlangan.
Real Payme/Click ulanmagan.

| Metod | Yo‘l | Kim | Izoh |
|---|---|---|---|
| POST | `/api/orders` | kirgan foydalanuvchi | `{ packageId, couponCode? }`. Summa serverda hisoblanadi |
| GET | `/api/orders`, `/api/orders/:id` | egasi | Boshqa foydalanuvchi buyurtmasi 404 |
| POST | `/api/payments/webhook/:provider` | provayder | Xom body imzosi (`x-signature`, HMAC-SHA256) tekshiriladi; noto‘g‘ri imzo 401 |

Brauzerdagi success sahifasi to‘lovni tasdiqlamaydi: faqat webhook `PAID` holatga o‘tkazadi va `Enrollment` yaratadi.
Webhook javobi: `processed | duplicate | ignored | rejected`.

## O‘quvchi kabineti (08-bosqich)

| Metod | Yo‘l | Izoh |
|---|---|---|
| GET | `/api/me/enrollments` | O‘z kurslari, `isActive` bilan |
| GET | `/api/me/notifications` | `{ items, unread }` |
| POST | `/api/me/notifications/:id/read`, `/read-all` | O‘qilgan deb belgilash (faqat o‘zinikini) |

`ENFORCE_ENROLLMENT=true` bo‘lganda `/api/lessons` va `/api/lessons/:id` (ixtiyoriy token bilan) yopiq
kurslar uchun `locked: true` qaytaradi va `videoUrl`/`content` bermaydi. Admin/superadmin hammasini ko‘radi.
Standart `false` — hozirgi ochiq xatti-harakat saqlanadi.

## Guruh, jadval, davomat (09–10-bosqichlar)

| Metod | Yo‘l | Kim | Izoh |
|---|---|---|---|
| POST/PUT/DELETE | `/api/admin/groups[/:id]` | `groups:manage` | Yaratish (faqat TEACHER roli), tahrirlash, arxivlash |
| POST/DELETE | `/api/admin/groups/:id/members[/:studentId]` | `groups:manage` | Sig‘im va dublikat tekshiruvi |
| POST | `/api/admin/groups/:id/slots` | `schedule:manage` | `repeat: { everyWeeks, count }`; to‘qnashuvda 409 |
| GET | `/api/groups`, `/api/groups/:id`, `/api/groups/:id/slots` | teacher/admin | O‘qituvchi faqat o‘zinikini; begona guruh 404 |
| GET | `/api/teacher/schedule?from&to` | teacher/admin | O‘z darslari |
| PATCH | `/api/slots/:id` | teacher/admin | Mavzu/holat; xona, havola, bekor qilish — faqat `schedule:manage` |
| GET/PUT | `/api/slots/:id/attendance` | teacher/admin | `{ records:[{studentId,status,note}], reason? }` |
| POST | `/api/slots/:id/attendance/finalize` | teacher/admin | Yakunlangandan keyin tahrir — faqat `attendance:edit` |
| GET | `/api/groups/:id/attendance-report[.csv]` | teacher/admin (CSV: `reports:read`) | Foizlar |
| GET | `/api/me/schedule`, `/api/me/attendance` | o‘quvchi | Faqat o‘ziniki |

Vaqtlar UTC; ko‘rsatish `Asia/Tashkent` (UTC+5, DST yo‘q). Davomat foizi: (PRESENT+LATE+ONLINE) / (jami − EXCUSED);
bekor qilingan darslar hisobga olinmaydi. Bu vaqtinchalik standart — egasi tasdiqlashi kerak.

## CMS (05-bosqich)

Ochiq (faqat nashr etilganlar; draft 404): `GET /api/pages/:slug`, `GET /api/news?page&limit`, `GET /api/news/:slug`,
`GET /api/faq`, `GET /api/site-settings`, `POST /api/contact` (soatiga 5 ta; yashirin `website` maydoni to‘ldirilsa jimgina tashlanadi).
Crawler: `GET /robots.txt`, `GET /sitemap.xml` (sayt manzili `CLIENT_URL` ning birinchi qiymatidan).

Admin (`content:manage` — ADMIN, SUPERADMIN, MODERATOR), prefiks `/api/admin/cms`:
`pages`, `news`, `faq` (GET/POST/PUT, faq DELETE), `messages` (GET, PATCH holat),
`PUT site-settings` (faqat `settings:manage`; oq ro‘yxatdagi kalitlar, URL faqat http(s) yoki /yo‘l).
HTML yozishda tozalanadi (script, event handler, iframe, `javascript:`/`data:` olib tashlanadi).

**Ko‘p tillilik.** Asosiy ustunlar — o‘zbekcha (lotin) versiya. Sahifa/yangilik/FAQ va sozlamalarda ixtiyoriy
`translations: { uz_cyrl?: {...}, ru?: {...} }` (sahifa: `title, content, seoTitle, seoDescription`; yangilik: + `summary`;
FAQ: `question, answer`; sozlamalar: `siteName, tagline, address, workingHours, heroTitle, heroSubtitle`). Har bir til versiyasi ham xuddi
shunday tozalanadi. Yangilashda berilgan til butunlay almashtiriladi, `null` — o‘chiriladi, berilmagan til saqlanib qoladi.
Ochiq API tilni `?lang=uz|uz_cyrl|ru`, so‘ng `Accept-Language` (`uz-Cyrl`, `ru-RU` ham) dan oladi, aks holda `uz`; javobda `Vary: Accept-Language`.
Tarjima qilinmagan (bo‘sh) maydon o‘rniga uz matni qaytadi. Draft/nashr holati barcha tillar uchun bitta.
`GET /api/admin/cms/site-settings` — tahrirlash uchun uz qiymatlar + `translations` (ochiq javobda `translations` yo‘q).

## Private media (11-bosqich)

`POST /api/media/{video|file}/:id/access` (token bilan) → `{ url, expiresAt }`; ruxsat bo‘lmasa 404 (id taxmin qilib bo‘lmaydi).
`GET /api/media/stream/:token` — `<video src>` uchun; Range (206) qo‘llanadi; `Cache-Control: private, no-store`.
Ruxsat: kursga faol enrollment (yoki `catalog:manage`/`media:manage`). `ENFORCE_ENROLLMENT=false` bo‘lsa istalgan kirgan foydalanuvchi.
Token muddati ichida ham akkaunt bloklansa yoki enrollment bekor qilinsa, stream to‘xtaydi.

Admin (`media:manage`): `GET /api/admin/media`, `PUT /api/admin/media/{video|file}?lessonId|courseId&title&filename`
(tanasi — xom fayl, `Content-Length` shart; faqat `MEDIA_UPLOAD_ENABLED=true` bo‘lsa), `DELETE /api/admin/media/video/:id` (arxivlash).
`CLAMAV_HOST` berilsa har bir fayl skanerlanadi: virus → `422`, skaner javob bermasa → `503` (fayl saqlanmaydi).

**CMS rasmlari** (`content:manage`), prefiks `/api/admin/cms/images`: `GET /` (ro‘yxat), `GET /config` (`maxImageMb`),
`PUT /?filename` (xom PNG/JPEG/WebP, `MAX_IMAGE_MB` gacha; `MEDIA_UPLOAD_ENABLED` ga bog‘liq emas) → `{ id, url, path, … }`, `DELETE /:id`.
Ochiq: `GET /api/images/<id>.<ext>` — `Cache-Control: public, max-age=31536000, immutable`; faqat ochiq rasmlar, boshqasi `404`.
`url` = `PUBLIC_API_ORIGIN` + `path` (CMS matnidagi `<img src>` va yangilik `coverUrl` uchun).

## Moliya va imtihon (admin)

`GET /api/admin/finance/orders?page&status&search`, `GET /api/admin/finance/summary?from&to` — `orders:read` (ADMIN, SUPERADMIN, FINANCE).
`GET|PUT /api/admin/exam/courses/:id/config` (`questionCount, durationSeconds?, passScore, maxAttempts?`),
`POST /api/admin/exam/questions/import` (`{ questions: [...] }`, ≤500, qoralama bo‘ladi), `GET /api/admin/exam/questions/export?courseId` — `tests:manage`.
`GET /api/admin/users?role=TEACHER|USER|…` — rol bo‘yicha filtr.
Xato javobida `errors` maydoni qator/ziddiyat tafsilotlarini qaytaradi (import, jadval to‘qnashuvi).

## Refund, buyurtma muddati, audit

`POST /api/admin/finance/payments/:id/refunds` `{ amount, reason }`, `GET /api/admin/finance/refunds`,
`POST /api/admin/finance/refunds/:id/complete`, `POST /api/admin/finance/refunds/:id/reject` `{ reason }` — `payments:manage` (FINANCE, SUPERADMIN).
Provayder qaytarishni qo‘llasa `DONE`, aks holda `PENDING` (qo‘lda tasdiqlanadi). Summa to‘langandan oshib ketmaydi (paralel so‘rovlarda ham);
to‘liq qaytarilsa `Order=REFUNDED`, `Payment=REFUNDED`, kursga kirish `REVOKED`. Tushum hisobotida faqat `DONE` qaytarishlar ayriladi.
To‘lanmagan buyurtmalar `ORDER_TTL_MINUTES` dan keyin avtomatik `EXPIRED` (har 5 daqiqada), promo-kod bo‘shatiladi.
`GET /api/admin/audit?page&action&entity&actorId` — `audit:read` (ADMIN, SUPERADMIN); faqat o‘qish.

## Bildirishnomalar (14-bosqich)

`GET|PUT /api/me/notification-preferences` `{ inApp?, email?, attendance?, language?: "uz"|"uz_cyrl"|"ru" }` (boshqa kalit — 422).
`language` — sayt ichidagi xabar va email shu tilda yaratiladi (standart `uz`).
`POST /api/admin/cms/announcements` `{ title, body, audience: {type:"all"} | {type:"group",groupId} | {type:"course",courseId} }` — `content:manage`;
matn oddiy matnga aylantiriladi. Javob: `{ recipients, emailsQueued, emailConfigured }`.
Email navbati har 5 daqiqada (va e’londan keyin darhol) ishlaydi; muvaffaqiyatsizlar 3 martagacha qayta uriniladi.
`GET /api/me/notifications` faqat `inApp=true` yozuvlarni qaytaradi.

**Xabar shablonlari** (`settings:manage`): `GET /api/admin/cms/notification-templates`,
`PUT /api/admin/cms/notification-templates/:key/:language` `{ subject, body }`, `DELETE …/:key/:language` (standart matnga qaytarish).
Kalitlar va o‘rinbosarlar: `PAYMENT_PAID {name} {amount}` (so‘m), `ATTENDANCE_ABSENT {name} {group} {date}`, `SCHEDULE_NEW {name} {group} {count}`,
`SCHEDULE_CHANGED` / `SCHEDULE_CANCELLED {name} {group} {date}`, `TEST_PASSED` / `TEST_FAILED {name} {score} {correct} {total}`,
`ANNOUNCEMENT {name} {title} {body}` (`{body}` majburiy). Noma’lum o‘rinbosar yoki yopilmagan qavs — 400; mavzu bir qatorga keltiriladi.
Xabar oluvchining tilida yaratiladi: saqlangan shablon, bo‘lmasa o‘rnatilgan matn (`backend/src/lib/notificationTemplates.ts`).
Matn yaratilgan paytda qotiriladi: keyingi tahrir eski xabarlarni o‘zgartirmaydi. Sana — `dd.mm.yyyy, HH:MM` (Toshkent).

## Hisobotlar va tizim holati

`GET /api/admin/reports/tests?from&to&courseId` — `reports:read` (ADMIN, SUPERADMIN, FINANCE). Faqat yakunlangan urinishlar;
javob: `{ total: { attempts, students, passed, passRate, averageScore }, rows: [{ courseId, course, attempts, students, passed, passRate, averageScore, averageSeconds }] }`.
`GET /api/admin/reports/teachers?from&to` — `reports:read`. Har o‘qituvchi: `activeGroups, students, lessons, planned, done, cancelled, hours, attendanceMissing`
(`attendanceMissing` — tugagan, bekor qilinmagan, davomati yakunlanmagan darslar). Davr standart 30 kun, `to > from`, ko‘pi bilan 366 kun (aks holda 400).
`GET /api/admin/system` — `settings:manage` (ADMIN, SUPERADMIN). `checks[]`: `database` (kechikish, qo‘llangan migratsiyalar), `payments`, `email`
(oxirgi 7 kunlik email holatlari), `telegram`, `media`, `enrollment`, `rateLimit`; har biri `ok | warning | error`. Host, token, parol, ulanish satri qaytarilmaydi (testda tekshiriladi).
