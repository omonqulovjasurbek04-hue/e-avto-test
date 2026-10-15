# API hujjatlari — E-Avto Test

Bazaviy manzil: `http://localhost:5000/api`

Barcha javoblar:

```json
{ "success": true, "data": { } }
{ "success": true, "data": [ ], "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
{ "success": false, "message": "Xatolik", "errors": [] }
```

Autentifikatsiya: `Authorization: Bearer <token>` sarlavhasi. Token muddati `JWT_EXPIRES_IN` (standart `7d`). Har so‘rovda foydalanuvchi bazadan tekshiriladi: bloklangan hisob `403`, bekor qilingan token `401` oladi.

HTTP statuslari: `200/201` muvaffaqiyat, `400` noto'g'ri so'rov, `401` autentifikatsiya yo'q/yaroqsiz, `403` ruxsat yo'q, `404` topilmadi, `409` ziddiyat (masalan, takroriy email), `422` validatsiya xatosi (`errors` ichida maydonlar), `429` limit oshdi, `500` server xatosi (tafsilotlarsiz).

## Auth

| Metod | Yo‘l | Body | Javob |
|-------|------|------|-------|
| POST | `/api/auth/register` | `{ name, email, password, phone? }` | `{ user, token }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ user, token }` |
| GET  | `/api/auth/me` | — | `User` |
| PUT  | `/api/auth/password` | `{ currentPassword, newPassword }` | `{ changed: true, token }` — eski tokenlar bekor qilinadi, yangi `token` ni saqlang |
| POST | `/api/auth/logout-all` | — | `{ loggedOut: true }` — barcha qurilmalardagi tokenlar bekor qilinadi |
| POST | `/api/auth/forgot-password` | `{ email }` | `{ sent: true }` (hisob bor-yo‘qligini bildirmaydi) |
| POST | `/api/auth/reset-password` | `{ token, password }` | `{ reset: true }` |

| POST | `/api/auth/telegram/start` | — | `{ sessionId, botUrl, expiresInSeconds }` (bot sozlanmagan bo‘lsa `503`) |
| POST | `/api/auth/telegram/verify` | `{ sessionId, code }` | `{ user, token }` — batafsil: [telegram.md](telegram.md) |

Telegram orqali yaratilgan hisobda `email` bo‘lmasligi mumkin.

Parol qoidasi: kamida 8 belgi, kamida bitta harf va bitta raqam. `role` ro‘yxatdan o‘tishda tanlanmaydi (doim `USER`).
`User.role` — `"USER"` yoki `"ADMIN"`.

Parolni tiklash tokeni bir martalik, 30 daqiqa amal qiladi, bazada faqat SHA-256 xeshi saqlanadi. Havola `SMTP_*` sozlangan bo‘lsa email bilan yuboriladi (`<CLIENT_URL>/reset-password?token=...`); sozlanmagan bo‘lsa faqat development konsoliga chiqadi. Tiklashdan keyin eski tokenlar bekor qilinadi.

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
Hisoblagich server xotirasida; bir nechta nusxada ishlatilsa umumiy store (masalan Redis) kerak bo‘ladi.

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

## Private media (11-bosqich)

`POST /api/media/{video|file}/:id/access` (token bilan) → `{ url, expiresAt }`; ruxsat bo‘lmasa 404 (id taxmin qilib bo‘lmaydi).
`GET /api/media/stream/:token` — `<video src>` uchun; Range (206) qo‘llanadi; `Cache-Control: private, no-store`.
Ruxsat: kursga faol enrollment (yoki `catalog:manage`/`media:manage`). `ENFORCE_ENROLLMENT=false` bo‘lsa istalgan kirgan foydalanuvchi.
Token muddati ichida ham akkaunt bloklansa yoki enrollment bekor qilinsa, stream to‘xtaydi.

Admin (`media:manage`): `GET /api/admin/media`, `PUT /api/admin/media/{video|file}?lessonId|courseId&title&filename`
(tanasi — xom fayl, `Content-Length` shart; faqat `MEDIA_UPLOAD_ENABLED=true` bo‘lsa), `DELETE /api/admin/media/video/:id` (arxivlash).

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

`GET|PUT /api/me/notification-preferences` `{ inApp?, email?, attendance? }` (boshqa kalit — 422).
`POST /api/admin/cms/announcements` `{ title, body, audience: {type:"all"} | {type:"group",groupId} | {type:"course",courseId} }` — `content:manage`;
matn oddiy matnga aylantiriladi. Javob: `{ recipients, emailsQueued, emailConfigured }`.
Email navbati har 5 daqiqada (va e’londan keyin darhol) ishlaydi; muvaffaqiyatsizlar 3 martagacha qayta uriniladi.
`GET /api/me/notifications` faqat `inApp=true` yozuvlarni qaytaradi.
