# E-Avto Test — to‘liq texnik audit: kamchiliklar va bajariladigan ishlar

- **Sana:** 2026-11-07
- **Tekshirilgan hudud:** butun repo — `backend/` (131 TS fayl, 34 migratsiya, 58 test fayli), `frontend/` (129 TSX/TS fayl, 48 sahifa, 66 komponent), `e2e/` (15 spec), `deploy/`, `.github/workflows/`, `docs/`.
- **Metod:** kodni qatlamma-qatlam statik o‘qish, marshrutlar/DB sxemasi/CI-deploy solishtiruvi, ishlab turgan lokal muhitni xavfsiz (faqat GET) tekshirish. Maxfiy qiymatlar (`.env`, tokenlar, parollar) o‘qilmagan va hisobotga ko‘chirilmagan.
- **Lokal holat tekshiruvi:** `http://localhost:5173` → 200; `http://localhost:5000/api/health` → 200, `database: reachable`; himoyalangan endpointlar (`/api/users/me`, `/api/profile`, `/api/admin/stats`) tokensiz → **401**. Backend `helmet` sarlavhalari (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy) joyida. Superadmin login ishlashi foydalanuvchi tomonidan tasdiqlangan.

## Umumiy baho

Loyiha poydevori kuchli: qatlamlangan Express + Prisma backend, Zod validatsiya, refresh-token rotation, `tokenVersion`, rol/permission matritsasi, audit log, to‘lov idempotentligi, media tekshiruvi, yaxshi CI gate va 15 ta E2E spec mavjud. Lekin **production uchun real foydalanuvchi va pul oqimiga chiqishdan oldin** bir nechta kritik xavfsizlik va operatsion bo‘shliqlar bor.

Taxminiy tayyorlik: **backup/support 60–65%**, **xavfsizlik 70%**, **funksional to‘liqlik 65%**, **test qamrovi 55%**.

---

## 1. Eng muhim 12 ta kamchilik (qisqa jadval)

| # | Daraja | Kamchilik | Asosiy dalil |
|---|---|---|---|
| 1 | 🔴 KRITIK | Ro‘yxatdan o‘tishda telefon tasdiqlanmaydi; `BOOTSTRAP_ADMIN_PHONE` raqamini egallab, keyingi deploy’da SUPERADMIN bo‘lish mumkin | `backend/src/validators/auth.ts:27-34`, `backend/src/services/auth.service.ts:70-87`, `backend/prisma/bootstrap.ts:59-63` |
| 2 | 🔴 KRITIK | Profil email/telefonini **joriy parolsiz** almashtirish → akkaunt egallash zanjiri | `backend/src/services/auth.service.ts:148-174`, `backend/src/validators/auth.ts:63-69` |
| 3 | 🔴 KRITIK | DB backup yo‘q; `STORAGE_DRIVER=local` bo‘lsa yuklangan rasmlar har deploy’da o‘chadi | `docs/BACKEND_TODO.md:10,20`, `backend/src/config/env.ts:47,108-109` |
| 4 | 🟠 YUQORI | ADMIN/SUPERADMIN uchun 2FA **majburiy emas** | `backend/src/services/auth.service.ts:63-68`, `backend/src/services/twoFactor.service.ts:19-21` |
| 5 | 🟠 YUQORI | Real to‘lov provayderi yo‘q; 100% chegirmali buyurtma ham 503 bo‘ladi | `backend/src/lib/payments/index.ts:5-13`, `backend/src/services/order.service.ts:28-29,64` |
| 6 | 🟠 YUQORI | SMTP yo‘q → parol tiklash, email tasdiqlash, email xabarnomalar amalda o‘lik | `backend/src/services/mail.service.ts:8`, `backend/src/services/auth.service.ts:231-233` |
| 7 | 🟠 YUQORI | Bilet urinishlari exam limitini yeb qo‘yadi; tugallanmagan testlar ham sanaladi | `backend/src/services/test.service.ts:104-107` |
| 8 | 🟠 YUQORI | Lockout race + bloklangan akkauntda ham bcrypt tekshiriladi (DoS/brute-force) | `backend/src/services/auth.service.ts:101-114` |
| 9 | 🟡 O‘RTA | DB indekslari yetishmaydi, retention yo‘q, `ILIKE '%...%'`, N+1 so‘rovlar | `backend/prisma/schema.prisma:241-243,697-698,766-767,787`, `backend/src/services/cleanup.service.ts:11-18` |
| 10 | 🟡 O‘RTA | Frontend’da `ErrorBoundary` va testdan chiqish ogohlantirishi yo‘q | butun `frontend/src` (grep bo‘yicha topilmadi) |
| 11 | 🟡 O‘RTA | Frontend unit/component testlari yo‘q; E2E CI’da ishlamaydi | `frontend/package.json`, `.github/workflows/ci.yml:139-157` |
| 12 | 🟡 O‘RTA | Hujjat/kod/deploy nomuvofiqliklari (webhook yo‘li, PG versiyasi, Railway/Render/VPS) | `docs/API.md:92`, `backend/.env.example`, `docs/BACKEND_TODO.md:3,53`, `.github/workflows/deploy.yml` |

---

## 2. Xavfsizlik kamchiliklari

### 2.1. Kritik

1. **Telefon egaligi tasdiqlanmaydi va bootstrap-admin oqimi xavfli.**
   - `register` faqat unikallikni tekshiradi va darhol akkaunt yaratadi (`auth.service.ts:70-87`). Email ham, telefon ham ixtiyoriy, bittasi bo‘lsa yetadi (`validators/auth.ts:27-34`).
   - `bootstrap.ts:59-63` tizimda admin bo‘lmasa, `BOOTSTRAP_ADMIN_PHONE` raqamiga ega akkauntni avtomatik `SUPERADMIN` qiladi.
   - Natija: raqamni bilgan tajovuzkor undan oldin ro‘yxatdan o‘tsa, keyingi deploy’da superadmin bo‘ladi. Istalgan odam boshqaning raqamini “band qilib” qo‘yishi ham mumkin.
   - **Yechim:** Telegram/SMS kod bilan telefon tasdiqlashni ro‘yxatdan o‘tishning majburiy qismiga aylantirish; bootstrap’ni bir martalik maxfiy token yoki faqat qo‘lda `create-superadmin` skriptiga o‘tkazish.

2. **Profil orqali akkaunt egallash.**
   - `updateProfile` joriy parolni talab qilmaydi; email/telefon `null`ga ham almashtiriladi (`auth.service.ts:148-174`, `validators/auth.ts:63-69`).
   - O‘g‘irlangan access token yoki XSS bilan: email tajovuzkor manziliga o‘zgartiriladi → tasdiqlash xati tajovuzkorga ketadi → `forgot-password` → parol reset → `tokenVersion` oshadi va qurbon hamma qurilmadan chiqadi.
   - Eski emailga ogohlantirish yuborilmaydi; parol o‘zgarganda ham email xabar yo‘q (`auth.service.ts:176-192,236-255`).
   - **Yechim:** email/telefon o‘zgarishida joriy parol + 2FA; eski manzilga xabar; 24 soatlik bekor qilish oynasi.

3. **Sirlarning saqlanishi.**
   - `JWT_SECRET_FROM_DB=true` bo‘lsa JWT sir `app_secrets` jadvalida **plaintext** saqlanadi (`schema.prisma:996-1002`, `lib/appSecrets.ts:5-16`).
   - `TOTP_ENCRYPTION_KEY` bo‘sh bo‘lsa, TOTP urug‘lari JWT siridan hosil qilingan kalit bilan shifrlanadi (`config/env.ts:80-81`).
   - DB dump + JWT sir → token forge va 2FA urug‘larini ochish. Backup/read-only replika sizib chiqishi uchun bu juda qimmat.
   - **Yechim:** JWT sirni faqat env/secret manager’da saqlash; TOTP uchun alohida mustaqil kalit majburiy qilish.

### 2.2. Yuqori

4. **2FA majburiy emas.** `completeLogin` faqat foydalanuvchi o‘zi yoqqan bo‘lsa challenge beradi (`auth.service.ts:63-68`). Admin 2FA’siz kira oladi.
5. **Lockout zaif.** `bcrypt.compare` blok tekshiruvidan oldin bajariladi; parallel so‘rovlar `lockedUntil` tekshiruvidan birga o‘tishi mumkin (`auth.service.ts:101-114`). Natijada to‘liq brute-force va hisobni ataylab bloklash (DoS) mumkin. `bcryptjs` pure JS — event loop’ni bloklaydi (`utils/password.ts`).
6. **Parol tiklash/email tasdiqlash SMTP’siz ishlamaydi.** `sendMail` SMTP bo‘lmasa `false` qaytaradi (`mail.service.ts:8`); havola faqat dev’da logga chiqadi (`auth.service.ts:231-233`). Telefon-only akkauntda tiklash yo‘li umuman yo‘q.
7. **Rate limit fail-open va instansiyaga bog‘liq.** Redis nosozligida `passOnStoreError: true` bilan hamma so‘rov o‘tadi; Redis bo‘lmasa har process o‘z hisoblagichini yuritadi; testda butunlay o‘chadi (`middleware/rateLimit.middleware.ts:9-26`).
8. **Webhook raw body muammosi.** `rawBody` faqat `express.json` ichida o‘rnatiladi (`app.ts:109-116`), `urlencoded` uchun yo‘q (`app.ts:118`). Payme/Click kabi form-urlencoded provayder qo‘shilsa, imzo tekshiruvi ishlamaydi.
9. **Media token qurilma/IP’ga bog‘lanmagan.** HLS token 4 soat amal qiladi (`config/env.ts:112-114`, `lib/media/signing.ts`); havola ulashilsa, begona odam ham ko‘radi.
10. **Telegram admin sessiyasi 30 kun** (`telegramAdmin.service.ts:20-23`) va cleanup’da tozalanmaydi (`cleanup.service.ts:11-18`); parol chatda yoziladi.
11. **Anti-bot yo‘q.** Register/login/contact faqat IP limit bilan; CAPTCHA, proof-of-work yoki telefon tasdiqlash yo‘q.
12. **Email tasdiqlash majburiy emas.** `emailVerifiedAt` faqat ko‘rsatiladi, login/register oqimida tekshirilmaydi.
13. **CSP’da `style-src 'unsafe-inline'` va `img-src https:`** (`app.ts:72-73`) — ma’lumot sizishi uchun yuzani kengaytiradi.
14. **`TRUST_PROXY_HOPS` noto‘g‘ri sozlansa**, barcha so‘rovlar bitta proxy IP’sidan ko‘rinadi va IP-limit/lockout buziladi (`app.ts:41`, `config/env.ts:127-131`).

### 2.3. O‘rta/past

- Sessiyalar soni cheklanmagan; har login yangi refresh token (`session.service.ts`).
- Audit logda IP/User-Agent yo‘q; forensika uchun kam.
- `optionalAuth` har public so‘rovda DB’ga qo‘shimcha `SELECT` yuboradi (`middleware/auth.middleware.ts:54-68`).
- `verify-email` noto‘g‘ri (qattiqroq) limiter bilan himoyalangan (`routes/auth.routes.ts`).
- Upload’da antivirus ixtiyoriy (`config/env.ts:152-155`), lekin upload default o‘chiq — ta’sir kamayadi.
- Register orqali email/telefon bandligini aniqlash (enumeratsiya) mumkin.
- **Kuchli tomonlari:** refresh token faqat hash holda, reuse detection + family revoke; rol escalation guard; audit log append-only; upload magic-byte/size/ffmpeg cheklovlari; error stack production’da berilmaydi.

---

## 3. Funksional xatolar (bug’lar)

| # | Bug | Fayl | Natija |
|---|---|---|---|
| 1 | Bilet urinishlari exam limitini yeb qo‘yadi; tugallanmagan testlar ham sanaladi | `services/test.service.ts:104-107` | Talaba bilet ishlab, keyin exam topshira olmaydi; ochib tashlagan test 1 kunga bloklaydi. Izoh (104-qator) buni inkor qiladi |
| 2 | `getProgress` umumiy dars soniga nashr etilmagan darslarni ham qo‘shadi | `services/progress.service.ts:159` | Progress foizi past ko‘rinadi (`refreshCourseProgress` bilan nomuvofiq) |
| 3 | Muddati o‘tgan enrollment’lar `ACTIVE` bo‘lib qoladi | `services/notification.service.ts:264` | E’lon muddati o‘tgan kurs egalariga ham boradi; admin statistikasi noto‘g‘ri |
| 4 | 100% chegirmali buyurtma provayder talab qiladi | `services/order.service.ts:28-29,64` | `PAYMENT_PROVIDER` bo‘sh bo‘lsa, `total=0` bo‘lishi mumkin bo‘lgan buyurtma ham 503 |
| 5 | `getLessonProgress` dars ko‘rinishini tekshirmaydi | `services/progress.service.ts:138-142` | Begona lesson mavjudligini bilish (kichik info leak) |
| 6 | `startTest` butun savol bankini xotiraga yuklaydi | `services/test.service.ts:123` | 100k savolda memory/latency spike |
| 7 | `announce` har foydalanuvchi uchun alohida INSERT | `services/notification.service.ts:274-278` | Katta auditoriyada N+1, sekin |
| 8 | `searchStudents` har topilgan user uchun 6 ta so‘rov | `services/telegramAdmin.service.ts:315-324` | Telegram admin qidiruvi sekin |
| 9 | `getStatistics` barcha tugallangan testlarni yuklaydi | `services/user.service.ts:100-103` | Vaqt o‘tishi bilan sekinlashadi |
| 10 | Admin leaderboard keshlanmagan | `services/leaderboard.service.ts:160-178` | Har chaqiruvda to‘liq aggregate |
| 11 | Schedule konflikt tekshiruvi tranzaksiyadan tashqarida va global | `services/group.service.ts:77-110` | Parallel so‘rovda double-booking; katta jadvalda sekin |
| 12 | Cleanup ommaviy `deleteMany` | `services/cleanup.service.ts:14-18` | Katta jadvalda uzoq lock; batch kerak |

---

## 4. Ma’lumotlar bazasi

### 4.1. Yetishmayotgan indekslar

| Jadval | Kerakli indeks | Sabab |
|---|---|---|
| `Enrollment` | `(status, expiresAt)`, `(userId, status)` | Muddat/aktivlik filtrlari sekin (`schema.prisma:697-698`) |
| `Test` | `(finishedAt, mode)`, `finishedAt`, `mode` | Leaderboard/report/statistika to‘liq scan (`:241-243`) |
| `ScheduleSlot` | `(startsAt, endsAt)`, `(room, startsAt)` | Konflikt tekshiruvi barcha guruhlarni yuklaydi (`:787`) |
| `GroupMembership` | `(groupId, leftAt)` yoki `leftAt=null` qisman indeks | Faol a’zolar filtri (`:766-767`) |
| `StudyTime` | `(userId, lastBeatAt)` | Har heartbeat’da skan (`:1016`) |
| `PasswordReset` / `EmailVerification` | `(expiresAt)` | Cleanup skani |
| `Order` | `(status, expiresAt)` | Expiry job |
| `MediaAccessLog` / `PaymentEvent` | `(createdAt)` | Retention/audit |
| `AuditLog` | yaxshi, lekin cheksiz o‘sadi | Arxivlash siyosati kerak |

### 4.2. Constraint va yaxlitlik

- DB darajasida deyarli CHECK yo‘q. Kerak: manfiy bo‘lmagan pullar (`Order`, `Payment`, `Refund`, `OrderItem`), `Test.score 0..100`, `Progress.percent 0..100`, `Question.correctIndex < options.length`, `ScheduleSlot.startsAt < endsAt`, `TeacherGroup.capacity > 0`.
- `Notification.emailStatus`, `Refund.status`, `ContactMessage.status`, `TelegramAdminSession.step` — `String`; enum yoki CHECK kerak.
- `Question` o‘chirilsa `UserAnswer` cascade o‘chadi — tarixiy natijalar yo‘qoladi. Soft-delete (`isArchived`) kerak.
- `Course` hard delete enrollment’larni cascade o‘chiradi; arxivlash (`archivedAt`) afzal.
- `GroupMembership` unique `(groupId, studentId)` — chiqib qayta qo‘shilsa, oldingi davr yo‘qoladi.
- Pul `Int` (tiyin) ~21.4 mln so‘m bilan cheklanadi; narx oshsa `BigInt`/`Decimal` kerak.
- Migratsiyalar faqat forward; rollback/down strategiyasi yo‘q.

### 4.3. Retention

`cleanup.service.ts` faqat 5 ta narsani tozalaydi. Tozalanmaydi: `audit_logs`, `media_access_logs`, `payment_events`, eski `notifications`, `telegram_admin_sessions`, arxivlangan `contact_messages`. DB hajmi va backup vaqti o‘sadi.

---

## 5. Backend kod sifati va unumdorlik

**Kuchli tomonlari:** `strict: true`, `any` yo‘q, `$queryRawUnsafe` ESLint bilan taqiqlangan, markaziy error middleware, pagination cap, yaxshi izohlar.

**Kamchiliklar:**
1. Katta servislar (SRP buzilishi): `group.service.ts` 492, `media.service.ts` 491, `telegramAdmin.service.ts` 420, `test.service.ts` 338 qator.
2. Vaqt zonasi `UTC+5` 4 joyda hardcode (`lib/schedule.ts`, `studyTime.service.ts`, `telegramAdmin.service.ts`, `user.service.ts`) — bitta helper kerak.
3. Strukturaviy logger yo‘q: 38 ta `console.*`; request-id, JSON log, darajalar yo‘q. Sentry ixtiyoriy.
4. Takror endpointlar: `/api/profile` = `/api/users/me`, `/api/statistics` = `/api/users/me/statistics`.
5. Qatlam buzilishlari: `routes/audit.routes.ts:15-42` ichida biznes-logika; `controllers/telegram.controller.ts:7,22` controller → controller import.
6. `Math.random` test shuffle’da (`test.service.ts:17-24`) — fairness uchun `crypto.randomInt` afzal.
7. Raw body har JSON so‘rovda 1 MB gacha saqlanadi (`app.ts:109-116`) — faqat webhook’da kerak.
8. Gzip/compression yo‘q (`package.json`, `deploy/nginx.conf.template`) — JSON javoblar siqilmaydi.
9. Public GET’larda `Cache-Control`/ETag siyosati yo‘q (TODO #21).
10. Media streaming Node orqali (`MEDIA_DIRECT_DELIVERY=false` bo‘lsa) — bandwidth/CPU; S3/R2 direct delivery afzal.
11. Fon job’lari `setInterval` bilan (`cleanup.service.ts:25-40`); multi-instance’da takror ishlaydi — Redis lock yoki cron kerak.
12. `Dockerfile.railway` build’dan keyin `npm prune --omit=dev` qilmaydi — image katta, supply-chain yuzasi keng.

**N+1 / to‘liq scan:** `knowledge.service.ts:97`, `telegramAdmin.service.ts:315-324`, `notification.service.ts:274-278`, `user.service.ts:100-103`, `leaderboard.service.ts:40-71`, `payment.service.ts:151`.

**Qidiruv:** `course.service.ts:191-201`, `admin.service.ts:32-34`, `group.service.ts:261`, `ticket.service.ts:151`, `finance.service.ts:18` — `ILIKE '%...%'`; `pg_trgm` yoki FTS kerak.

---

## 6. Frontend kamchiliklari

### 6.1. Xavfsizlik

1. **SVG profil rasmi qabul qilinadi** — `components/settings/ProfilePhoto.tsx:14` (`image/*,.heic,.heif,.avif,.svg`). SVG ichida skript bo‘lishi mumkin. SVG’ni olib tashlash yoki qat’iy sanitizatsiya qilish kerak.
2. Access token faqat xotirada, refresh httpOnly cookie — **yaxshi**. DOMPurify yagona `SafeHtml` orqali — **yaxshi**.
3. `lib/serverErrors.ts:73` noma’lum 4xx matnini o‘zgarishsiz qaytaradi — xom texnik matn UI’ga chiqishi mumkin.
4. `vite.config.ts` `server.host: true` — dev server LAN’ga ochiq.
5. Production HTML’da CSP/security header’lar yo‘q; ular faqat backend orqali beriladi. Alohida static hosting’da deploy qilinsa, header’lar yo‘qoladi.

### 6.2. Ishonchlilik/UX

1. **Guruh ochishda vaqt kiritishda `type="time"` 브라uzer-lokaliga bog‘liq AM/PM ko‘rsatishi mumkin** — `frontend/src/components/groups/GroupForm.tsx:102`. HTML5 `type="time"` qiymati hámmon 24-soat formatda (`HH:mm`), lekin brauzer interfeysi foydalanuvchi mintaqasiga qarab AM/PM ko‘rsata oladi. Agar to‘liq 24-soat va ikkilik sekund kerak bo‘lsa, maxsus time-komponent yoki `step="1"` + `HH:mm:ss` qiymat kerak bo‘ladi.
2. **`ErrorBoundary` yo‘q** — bitta render xatosi butun ilovani oq ekranga aylantiradi.
2. **Faol testdan chiqishda ogohlantirish yo‘q** — `beforeunload`/`useBlocker` topilmadi; tasodifiy chiqishda javoblar yo‘qoladi.
3. **Theme FOUC** — mavzu `useEffect`da qo‘llanadi (`store/ui.store.tsx:39-42`), `index.html`da pre-paint skript yo‘q; tizim mavzusi (`prefers-color-scheme`) hisobga olinmaydi.
4. **Modal focus trap yo‘q** — `components/ui/Modal.tsx`; fokus orqadagi sahifaga chiqadi. Bir vaqtda `open` va `isOpen` (8-9, 28-qatorlar) — ikki xil API, chalkashlik.
5. **Admin modallari `window.prompt`/`window.confirm`** — `pages/admin/AdminOrders.tsx:78`, `AdminCms.tsx:319`; mobil uchun noqulay.
6. **Admin kod student/public sahifalarga aralashgan** — `pages/public/Courses.tsx:11-13`, `pages/student/Dashboard.tsx:21-22`, `Lessons.tsx:16-18`, `Mistakes.tsx:4`; bundle shishadi.
7. **SEO yetishmaydi** — `index.html` 13 qator: `meta description`, Open Graph, canonical, `theme-color`, `noscript`, preconnect yo‘q.
8. **Hardcoded o‘zbekcha matnlar** — `QuestionCard.tsx:45,60,109`, `Progress.tsx:19`, `ErrorState.tsx:10,18`, `formatTime.ts`, `useLoad.ts:20`, `TestPage.tsx`, `Register.tsx`, `ResetPassword.tsx`, `Legal.tsx`, `VideoPlayer.tsx:315-376`. Ru/uz_cyrl foydalanuvchisi uchun tarjima yo‘q.
9. **`<Link>` ichida `<Button>`** (invalid interactive nesting) — `MainLayout.tsx:93-105`, `NotFound.tsx:28-31`, `Forbidden.tsx:37-48`, `Orders.tsx:46`, `Dashboard.tsx:171`, `Mistakes.tsx:140`, `TeacherDashboard.tsx:73,115,122`, `TeacherGroups.tsx:145`, `CourseCard.tsx:17`, `GuideList.tsx:16`, `LessonCard.tsx:21`, `CourseDetails.tsx:65`, `ResetPassword.tsx:101`.
10. **`key={index}`** ~20 joyda — ro‘yxat qayta tartiblansa, noto‘g‘ri DOM holati.
11. **A11y:** `Breadcrumb` inglizcha `aria-label` va `key={i}`; `Avatar` fokuslanmaydi; `Pagination`da `aria-label`/`aria-current` yo‘q; `VideoPlayer` klaviatura bilan boshqarilmaydi; mobil drawer focus trap’siz.
12. **Polling `visibilitychange`’siz** — `StudentLayout.tsx:86` (60 s), `Orders.tsx:31` (8 s), `useTest.ts:19` (1 s), `useStudyTimer.ts`, `VideoPlayer.tsx:57` — yashirin tabda ham ishlaydi.
13. **`test.store.ts:87`** `saveAnswer` `await`/`catch` siz — unhandled rejection.
14. **`ProfilePhoto`/`Settings`** parol qoidalari 3 joyda takrorlangan va turli minimal uzunlikda (`Settings.tsx:37-46`).
15. **Legal sahifasi** barcha tillarda o‘zbekcha.
16. **Rasm `alt`lari bo‘sh** — `News.tsx:34`, `NewsDetail.tsx:27`, `QuestionMedia.tsx:8`, `Avatar.tsx:41`, `StudentLayout.tsx:361,381`.

### 6.3. Unumdorlik

- `public/video/hero.mp4` — **10.26 MB**, `login.mp4` — **3.20 MB**; WebM/AV1, siqish, `preload="none"`/poster kerak.
- `loading="lazy"` izchil emas (14 ta `img`dan ~4 tasida).
- Rasm `width`/`height` yo‘q — CLS.
- `Pagination` barcha sahifa raqamlarini render qiladi.
- Vendor `manualChunks` strategiyasi yo‘q; recharts/hls/framer katta chunk berishi mumkin.
- Ikki variable font (Inter + Plus Jakarta Sans) — kerakligini tekshirish.

### 6.4. Tip va konfiguratsiya

- `tsconfig.json:15-16` — `noUnusedLocals: false`, `noUnusedParameters: false`.
- `vite-env.d.ts` faqat `VITE_TELEGRAM_URL`ni e’lon qiladi; `VITE_API_URL`/`VITE_USE_MOCK` uchun `ImportMetaEnv` kengaytmasi yo‘q.
- `vite.config.ts` `base` sozlanmagan — subpath deploy’da asset yo‘llari buziladi.
- `tsconfig.tsbuildinfo`/`tsconfig.node.tsbuildinfo` repo ildizida — root `.gitignore`da `*.tsbuildinfo` bor, lekin ular hali ham ishchi daraxtda.

---

## 7. Testlar va CI

### Mavjud
- Backend: 58 test fayli (Vitest), CI’da PostgreSQL 16 bilan ishlaydi.
- E2E: 15 spec (`e2e/tests`) — auth, exam, cms, media, mobile, notifications, reports, shop, staff, teaching va h.k.
- CI: backend lint + `tsc` + migratsiya drift + testlar; bootstrap ikki marta; Railway image smoke; frontend lint + build.

### Kamchiliklar
1. **E2E CI’da yo‘q** — `ci.yml`faqat backend/frontend job’lari bor; Playwright ishlamaydi. Bundan tashqari `playwright.config.ts` `channel: "msedge"` (Windows Edge) — Linux CI’da chromium kerak.
2. **Frontend unit/component testlari yo‘q** — `package.json`da vitest/jest/testing-library yo‘q, `test` script yo‘q.
3. **Integratsion testlar `TEST_DATABASE_URL` bo‘lmasa skip** — lokal `npm test` “yashil” ko‘rinadi, lekin muhim qism tekshirilmaydi.
4. **`ENFORCE_ENROLLMENT=false` default** — aksariyat testlar paywall’ni chetlab o‘tadi; access regressiyalari o‘tib ketadi.
5. **Rate limit/lockout testda o‘chirilgan** (`rateLimit.middleware.ts:24`).
6. **Coverage threshold yo‘q** — qaysi modullar qamralmagani noma’lum.
7. **IDOR/object-level authorization** har endpoint uchun alohida tekshirilmaydi; security test asosan 401’ni tekshiradi.
8. **Migration rollback, yuklama testi, multi-instance job testi yo‘q.**
9. **DB versiyasi nomuvofiq:** CI va prod compose PG16, `BACKEND_TODO.md:53` esa PG18 deydi.
10. **Deploy:** `.github/workflows/deploy.yml` faqat qo‘lda (`workflow_dispatch`), izohda “sayt hozir Render’da” deyilgan, `BACKEND_TODO.md` esa Railway’ni production deb ko‘rsatadi — yagona haqiqat manbasi yo‘q.

---

## 8. Hujjatlar va deploy nomuvofiqliklari

| Muammo | Dalil |
|---|---|
| Telegram webhook yo‘li hujjatda `/:secret`, kodda header (`X-Telegram-Bot-Api-Secret-Token`) | `docs/API.md:92`, `backend/.env.example`, `backend/src/app.ts:154`, `controllers/telegram.controller.ts:27-31` |
| PostgreSQL 16 (CI/compose) vs 18 (`BACKEND_TODO.md:53`) | `.github/workflows/ci.yml:29`, `deploy/docker-compose.prod.yml`, `docs/BACKEND_TODO.md:53` |
| Production platformasi: Railway vs Render vs VPS | `docs/BACKEND_TODO.md:3`, `deploy/render.yaml`, `.github/workflows/deploy.yml` izohi |
| `/admin` eski yo‘llar | Frontendda redirect bor (`OldAdminRedirect`), hujjatlarda tarixiy deb ajratish kerak |
| `.env.example`da webhook `<secret>` yo‘li | `backend/.env.example` |
| API.md koddan orqada | `docs/API.md` sanasi va kod o‘zgarishlari |

**Yechim:** har bir hujjat boshiga `Tekshirilgan: YYYY-MM-DD` qo‘yish; yagona manbalarni belgilash (`docs/Ai.md` topshirig‘iga mos); deploy platformasini egasidan bir marta tasdiqlatish.

---

## 9. Kuchli tomonlar (saqlab qolish kerak)

- Refresh token rotation + reuse detection + family revoke.
- `tokenVersion` orqali barcha sessiyalarni bekor qilish.
- Rol/permission matritsasi va escalation guard (`lib/permissions.ts`).
- Audit log append-only.
- Zod validatsiya va markaziy error handling.
- Upload’da magic-byte, hajm, ffmpeg, ixtiyoriy ClamAV.
- To‘lov webhook’ida imzo → unique event → amount/currency → transition tartibi.
- Helmet CSP/HSTS va production env guard’lari.
- Frontend’da token xotirada, refresh httpOnly cookie, DOMPurify, production build guard.
- 15 ta E2E spec va yaxshi CI gate.

---

## 10. Nima qilish kerak — ustuvor reja

### P0 — darhol (production riskini yopish)

- [ ] **Telefon tasdiqlash:** register’da Telegram/SMS kodni majburiy qilish; `BOOTSTRAP_ADMIN_PHONE` oqimini bir martalik token yoki qo‘lda skript bilan almashtirish (`auth.service.ts`, `bootstrap.ts`).
- [ ] **Profil himoyasi:** email/telefon o‘zgarishida joriy parol + 2FA talab qilish; eski emailga xabar; bekor qilish oynasi (`auth.service.ts:148-174`).
- [ ] **Admin 2FA majburiy:** `ADMIN`/`SUPERADMIN`/`FINANCE` uchun 2FA yoqilmagan bo‘lsa, kirishda sozlashga majburlash.
- [ ] **Lockout atomikligi:** `UPDATE ... WHERE failedLogins = ...` yoki advisory lock; blok tekshiruvini `bcrypt.compare`dan oldin qilish; `bcryptjs` → `argon2`/native `bcrypt`.
- [ ] **Bilet/exam bug:** `count` shartiga `finishedAt: { not: null }` va `ticket: null` qo‘shish (`test.service.ts:104-107`).
- [ ] **Backup + storage:** kunlik avtomatik `pg_dump` tashqi saqlashga + oylik restore sinovi; `STORAGE_DRIVER=s3` yoki doimiy volume.
- [ ] **`getProgress` bug:** `_count.lessons`ni `isPublished: true` bilan cheklash (`progress.service.ts:159`).

### P1 — yaqin haftalar

- [ ] **SMTP yoki Telegram orqali parol tiklash**; email funksiyalarini yoqish yoki UI’dan olib tashlash.
- [ ] **Real to‘lov (Payme/Click)** + `application/x-www-form-urlencoded` uchun `rawBody`; 100% chegirmali buyurtmani provaydersiz ham yakunlash.
- [ ] **DB indekslari:** `Enrollment(status,expiresAt)`, `Test(finishedAt,mode)`, `ScheduleSlot(startsAt,endsAt)`, `GroupMembership(groupId,leftAt)`, `StudyTime(userId,lastBeatAt)`, expiry indekslari.
- [ ] **Retention job:** audit/media log/payment events/notifications/telegram sessions uchun batch tozalash.
- [ ] **Muddati o‘tgan enrollment’lar:** job bilan `EXPIRED`ga o‘tkazish; e’lonlarda `expiresAt`ni tekshirish (`notification.service.ts:264`).
- [ ] **`ILIKE '%...%'`** → `pg_trgm`/FTS.
- [ ] **N+1 va to‘liq scan’lar:** `announce` bulk insert, `searchStudents` birlashtirilgan so‘rov, `getStatistics` aggregate, `leaderboard` SQL `ORDER BY ... LIMIT`.
- [ ] **`compression` + public GET `Cache-Control`/ETag.**
- [ ] **E2E’ni CI’ga qo‘shish:** Linux chromium (`channel: "msedge"`ni CI uchun almashtirish), `TEST_DATABASE_URL` bilan.
- [ ] **Frontend test infratuzilmasi:** Vitest + React Testing Library; `api.ts`, `lib/serverErrors`, `test.store`, `useLoad` uchun testlar.
- [ ] **Coverage threshold** va `IDOR` testlarini qo‘shish.

### P2 — keyingi bosqich

- [ ] **`ErrorBoundary`** va sahifa darajasidagi xato UI.
- [ ] **Testdan chiqish guard** (`beforeunload`/`useBlocker`).
- [ ] **Theme:** `index.html`da pre-paint skript + `prefers-color-scheme`.
- [ ] **Modal:** focus trap, focus restore, yagona `open` prop, nested modal scroll.
- [ ] **Admin kodni ajratish:** `Dashboard`, `Courses`, `Lessons`, `Mistakes`dan admin komponentlarini olib tashlash yoki alohida lazy chunk.
- [ ] **i18n:** hardcoded matnlarni `uz/uz_cyrl/ru`ga ko‘chirish; `Legal` va validatsiya xabarlarini ham.
- [ ] **A11y:** `<Link><Button>`ni tuzatish, `aria-current`/`aria-label`, klaviatura bilan video boshqaruvi, `key={index}`ni almashtirish.
- [ ] **SEO:** `meta description`, OG, canonical, `theme-color`, `noscript`, preconnect.
- [ ] **Video optimizatsiyasi:** `hero.mp4`/`login.mp4`ni WebM/AV1, siqish, poster, `preload="none"`.
- [ ] **SVG upload**ni olib tashlash yoki sanitizatsiya.
- [ ] **Polling**ni `visibilitychange` bilan to‘xtatish.
- [ ] **`tsconfig`:** `noUnusedLocals`/`noUnusedParameters: true`; `ImportMetaEnv` tiplari.

### P3 — sifat va uzoq muddat

- [ ] Strukturaviy logger + request-id + Sentry/METRICS_TOKEN.
- [ ] OpenAPI (Zod’dan) va `docs/API.md`ni kod bilan sinxronlash.
- [ ] Takror endpointlarni birlashtirish (`/profile` → `/users/me`, `/statistics` → `/users/me/statistics`).
- [ ] Admin questions filtrlariga `courseId`/`lessonId` qo‘shish.
- [ ] Katta servislarni bo‘lish, timezone helperini birlashtirish, statuslarni enumga o‘tkazish.
- [ ] DB CHECK constraint’lar va schedule exclusion constraint.
- [ ] Soft-delete/arxivlash siyosati (user, course, question).
- [ ] `Dockerfile.railway`ni `npm prune --omit=dev` bilan yengillashtirish.
- [ ] Multi-instance joblar uchun Redis lock yoki cron.
- [ ] Hujjatlarni yangilash: platforma, URL, PG versiyasi, webhook yo‘li, Node versiyasi.

---

## 11. Tezkor buyruqlar (lokal tekshiruv uchun)

```powershell
# Backend
cd backend
npm run lint
npm run typecheck
npm test                 # TEST_DATABASE_URL bo‘lsa to‘liqroq ishlaydi
npm audit --omit=dev

# Frontend
cd ..\frontend
npm run lint
npm run typecheck
npm audit --omit=dev

# E2E (Windows Edge bilan lokal)
cd ..\e2e
npm test
```

> Eslatma: `localhost:5173/api/...` Vite dev server orqali backend’ga proxy qilinmaydi — frontend `VITE_API_URL` orqali to‘g‘ridan-to‘g‘ri `http://localhost:5000/api`ga murojaat qiladi. Shuning uchun 5173’da `/api/admin/stats` HTML (SPA fallback) qaytaradi; bu ma’lumot sizishi emas, lekin dev konfiguratsiyasini chalkashtirmaslik uchun izoh qoldirish tavsiya etiladi.

---

## 12. Xulosa

Loyiha **ishlaydi va yaxshi arxitekturaga ega**, lekin hozirgi holatda uni real foydalanuvchilar va moliyaviy oqim bilan ishga tushirish xavfli. Eng katta risklar:

1. **Telefon tasdiqlash yo‘qligi + bootstrap superadmin oqimi.**
2. **Profil orqali akkaunt egallash.**
3. **Admin 2FA majburiy emasligi.**
4. **To‘lov, SMTP va backup kabi operatsion funksiyalarning yo‘qligi.**
5. **DB indeks/retention va test qamrovidagi bo‘shliqlar.**

P0 bandlari bajarilmasa, tizimni production’ga chiqarish tavsiya etilmaydi. P1 bandlari biznes funksiyalarini (to‘lov, parol tiklash, unumdorlik) ishga tayyorlaydi, P2/P3 esa sifat, UX va uzoq muddatli barqarorlikni ta’minlaydi.
