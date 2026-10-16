# E-Avto — xavfsizlik

Oxirgi audit: 2026-10-15 (16-bosqich, kod ko‘rigi + avtomatik testlar + `npm audit`). 2026-10-16: autentifikatsiya kuchaytirildi (11–15-bandlar).
Tekshiruv usuli: `backend/tests/security.test.ts` (route inventari, CORS, headerlar, blokirovka, IDOR), `checkout.test.ts` (poyga holatlari), E2E.
Audit **ichki** (muallif tomonidan) bo‘ldi; mustaqil penetratsion test o‘tkazilmagan.

## Topilgan va tuzatilgan muammolar

| # | Daraja | Muammo | Tuzatish | Tekshiruv |
|---:|---|---|---|---|
| 1 | Medium | Bog‘liqlik zaifliklari: `proxy-addr` (critical, IP spoofing — rate limit va `trust proxy` ga ta’sir), `qs`/`express` (DoS), `axios` (high) | `npm audit fix` | backend: 0 zaiflik; frontend: qarang “ochiq” |
| 2 | Medium | `z.string().url()` `javascript:` / `data:` ni qabul qiladi → havola/rasm orqali saqlangan XSS (avatar, dars videosi, kurs rasmi, onlayn dars havolasi — ayniqsa **yangilash** yo‘lida https tekshiruvi yo‘q edi) | `validators/common.ts`: faqat `http(s)` (onlayn havola — faqat `https`) | `catalog.validators.test.ts` |
| 3 | Medium | Hisob bo‘yicha brute-force himoyasi yo‘q (faqat IP bo‘yicha 20/daq) | 8 ta xato paroldan keyin 15 daqiqa blokirovka (`failedLogins`, `lockedUntil` bazada — bir necha instansiyada ishlaydi); blokda to‘g‘ri parol ham rad etiladi | `security.test.ts` |
| 4 | Low | Juda katta JSON tanasi `500` qaytarardi | `413` (yoki `400`) | `security.test.ts` |
| 5 | Low | Imzolangan media token, Telegram webhook sirri va `?token=` URL ichida access logga tushardi | `utils/redact.ts` | `security.test.ts` |
| 6 | Medium | ADMIN boshqa ADMIN yoki SUPERADMIN akkauntini bloklay/qayta yoqa olardi (`PATCH /api/admin/users/:id/status`) — rol o‘zgartirishdagi “faqat superadmin” chegarasi bu yerda yo‘q edi | Holat o‘zgartirish ham `canAssignRole` bilan tekshiriladi | `security.test.ts` |
| 7 | High | Ochiq `GET /api/courses/:id` va `/courses/:id/lessons` yopiq kurs darslarining `videoUrl` ini qaytarardi — pullik video kursni sotib olmasdan ochilardi | Kursga kirishsiz `videoUrl` bo‘sh, `locked: true` | `review-fixes.test.ts` |
| 8 | Medium | ADMIN foydalanuvchiga FINANCE rolini bera olardi (o‘zida yo‘q `payments:manage` — pul qaytarish huquqi) | Hech kim o‘zida yo‘q huquqni bera olmaydi (rol ruxsatlari aktyor ruxsatlari ichida bo‘lishi shart) | `permissions.test.ts`, `review-fixes.test.ts` |
| 9 | Medium | Parol tiklash tokeni bir vaqtdagi so‘rovlarda bir necha marta ishlatilishi mumkin edi; eski tokenlar ochiq qolardi | Token tranzaksiyada shartli ravishda band qilinadi; muvaffaqiyatdan keyin hamma ochiq tokenlar yopiladi | `review-fixes.test.ts` |
| 10 | Medium | Kursga kirishsiz dars progressi yozilib, reyting ochkolari olinardi | Progress faqat nashr etilgan va ochiq darslar uchun | `review-fixes.test.ts` |
| 11 | Medium | 7 kunlik JWT brauzerning `localStorage` ida — XSS bo‘lsa uzoq muddatli kalit o‘g‘irlanadi | Access token 15 daqiqa va faqat xotirada; sessiya `HttpOnly`+`Secure`+`SameSite=Strict` refresh cookie (`Path=/api/auth`) orqali, eski `localStorage` kalitlari o‘chiriladi | `auth-hardening.test.ts`, E2E `auth-security.spec.ts` |
| 12 | Medium | Sessiyani server tomonda faqat “hamma joydan chiqish” bilan yopish mumkin edi; o‘g‘irlangan token aniqlanmasdi | Rotatsiyalanuvchi refresh token (bazada SHA-256), qayta ishlatilsa butun oila bekor; logout, parol/rol o‘zgarishi, bloklash refresh tokenlarni bekor qiladi; bir vaqtdagi ikki refresh — ikkalasi o‘tmaydi | `auth-hardening.test.ts` |
| 13 | Low | Cookie bilan ishlaydigan `/refresh`, `/logout` ga begona saytdan forma orqali CSRF | `SameSite=Strict` + majburiy `X-Requested-With` (CORS preflight’dan faqat ruxsat etilgan origin o‘tadi) | `auth-hardening.test.ts` |
| 14 | Medium | Admin/moliya akkauntlari faqat parol bilan himoyalangan | Ixtiyoriy TOTP 2FA (ADMIN/SUPERADMIN/FINANCE): shifrlangan sir, replay himoyasi, 8 ta bir martalik zaxira kod, noto‘g‘ri kodlar blokirovkaga qo‘shiladi, superadmin reset (audit) | `auth-hardening.test.ts`, E2E |
| 15 | Low | Email manzil egaligi tekshirilmasdi | Bir martalik 24 soatlik tasdiqlash havolasi (xesh), email o‘zgarsa qayta tasdiqlash; SMTP yo‘q bo‘lsa javob “yuborildi” demaydi | `auth-hardening.test.ts`, E2E |

## Tasdiqlangan (xato topilmadi)
- **Kirish nazorati inventari:** ilovadagi barcha marshrutlar avtomatik sanaladi; ochiq ro‘yxatdan tashqari hammasi tokensiz `401` beradi; oddiy o‘quvchi `/api/admin/*`, `/api/groups*`, `/api/slots*`, `/api/teacher*` ga `403` oladi. Yangi marshrut `authMiddleware`siz qo‘shilsa test yiqiladi.
- **Rol eskalatsiyasi:** profil yangilashda `role` yuborish ta’sir qilmaydi; ADMIN/SUPERADMIN berish faqat SUPERADMIN; o‘z rolini o‘zgartirib bo‘lmaydi.
- **IDOR/BOLA:** buyurtma, bildirishnoma, davomat, jadval, media, guruh — boshqa foydalanuvchi ob’ekti `404/403`.
- **To‘lov:** noto‘g‘ri imzo `401`; summa/valyuta mos kelmasa rad etiladi; 6 ta bir vaqtdagi bir xil callback → bitta `processed`, 5 `duplicate`, bitta enrollment.
- **Promo-kod poygasi:** 1 ta o‘rni qolgan kod 5 ta bir vaqtdagi xaridorning faqat bittasiga beriladi.
- **Headerlar:** `X-Powered-By` yo‘q, HSTS, `nosniff`, `X-Frame-Options`; CORS begona originni qaytarmaydi; xatolarda stack trace yo‘q.
- **Parollar:** bcrypt, bir xil vaqt (noma’lum email uchun dummy hash), parol almashtirilganda barcha access va refresh tokenlar bekor.
- **SQL injection:** faqat Prisma va parametrlangan `$queryRaw/$executeRaw` shablonlari ishlatiladi.
- **Fayl yuklash:** tur baytlardan aniqlanadi, hajm oqimda cheklanadi, kalit serverda yaratiladi (path traversal yo‘q); video yuklash standartda o‘chiq. `CLAMAV_HOST` berilsa har bir fayl saqlanishdan oldin ClamAV bilan skanerlanadi: virus → 422 + audit, skaner javob bermasa → 503 (fail-closed, fayl saqlanmaydi).
- **Ochiq CMS rasmlari** (`GET /api/images/:id.:ext`): faqat `isPublic` + `image/*` fayllar beriladi; yopiq fayl id’si bilan so‘ralsa 404; javobda `nosniff`, `Content-Security-Policy: sandbox`; SVG qabul qilinmaydi (faqat PNG/JPEG/WebP baytlardan).
- **Metrikalar** (`/api/metrics`): alohida bearer token (constant-time solishtirish), tokensiz 404; route shablonlari bo‘yicha (id va so‘rov parametrlari yo‘q); sirlar va IP yo‘q.
- **Xato kuzatuvchisi:** Sentry’ga cookie, header, body, query, IP yuborilmaydi; URL’dagi tokenlar yashiriladi; foydalanuvchidan faqat id.

## Ochiq (qolgan) xavflar

| Daraja | Muammo | Tavsiya |
|---|---|---|
| Low | XSS bo‘lsa skript sahifa ochiq turgan paytda xotiradagi 15 daqiqalik access tokendan yoki `/refresh` dan foydalana oladi (refresh tokenning o‘zini o‘qiy olmaydi) | Frontend hostida qat’iy **CSP** (quyida) |
| Medium | Agar API boshqa saytda (boshqa ro‘yxatdan o‘tgan domen) bo‘lsa `REFRESH_COOKIE_SAMESITE=none` kerak bo‘ladi — CSRF himoyasi faqat `X-Requested-With`+CORS ga qoladi | Sayt va API ni bir domen ostida joylash (`example.uz` + `api.example.uz`) |
| Low | 2FA ixtiyoriy (majburiy emas); tasdiqlanmagan email hech narsani bloklamaydi | Biznes qarori: staff uchun 2FA ni majburiy qilish, xariddan oldin email tasdiqlashni talab qilish |
| Low | Rate limit Redis’da (`REDIS_URL`); Redis ishlamay qolsa so‘rovlar cheklovsiz o‘tkaziladi (sayt to‘xtamasligi uchun). Hisob blokirovkasi bazada, shuning uchun parol terish himoyasi saqlanadi. Haqiqiy Redis bilan sinalmagan (testda soxta hisoblagich) | Redis’ni monitoring qilish (`app_redis_up`, tizim sahifasi) |
| Medium | Real to‘lov provayderi ulanmagan; Payme/Click imzo sxemasi va callback takrorlash (timestamp) qoidalari rasmiy hujjat bo‘yicha tekshirilmagan | Merchant hujjati + sandbox testi, so‘ng “tayyor” deb belgilash |
| Low | Antivirus ixtiyoriy: `CLAMAV_HOST` bo‘sh bo‘lsa fayllar skanerlanmaydi (tizim sahifasida ogohlantirish). Haqiqiy clamd bilan sinalmagan (protokol soxta server bilan sinalgan) | Production’da `--profile antivirus` |
| Low | Ro‘yxatdan o‘tishda email mavjudligi oshkor bo‘ladi (`409`) | Yagona javob + “hisob allaqachon bor” xati (SMTP kerak) |
| Low | Telefon tasdiqlash va “buzilgan parollar” tekshiruvi yo‘q; sessiyalar ro‘yxati (qurilmalar bo‘yicha) UI’da ko‘rsatilmaydi | Biznes qaroriga qarab |
| Info | Real SMTP bilan email yetkazib berish sinalmagan (testlarda transport almashtirilgan; E2E’da SMTP yo‘q) | Production SMTP bilan qo‘lda tekshirish |
| Low | `react-router` (frontend) moderate advisory — faqat SSR gidratatsiyasiga tegishli, loyiha SSR ishlatmaydi | Kelajakda v7 ga o‘tishda yopiladi (breaking) |
| Info | Telegram login (avvaldan mavjud) bu auditda chuqur qayta ko‘rilmadi (urinishlar hisoblagichi bor) | Alohida ko‘rik |
| Info | Backup/restore sinalmagan (pg_dump yo‘q); Sentry/Prometheus kodi bor, lekin haqiqiy servis bilan sinalmagan | Serverda bir marta tiklash mashqi; sinov xatosini yuborib ko‘rish |

**Xulosa:** ochiq Critical/High yo‘q, lekin loyiha productionga **tayyor emas**: real to‘lov, backup/restore sinovi, mustaqil audit va yuqoridagi Medium bandlar qolgan.

## Frontend hosti uchun tavsiya etilgan headerlar
API (`helmet`) JSON qaytaradi; HTML’ni statik hosting beradi, shuning uchun CSP o‘sha yerda qo‘yiladi:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https: blob:; connect-src 'self' https://<api-domen>; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
(`style-src 'unsafe-inline'` Tailwind/framer-motion inline uslublari uchun; ko‘rsatish bilan sinab ko‘ring.)

## Maxfiy ma’lumotlar
- Sirlar faqat `.env` da; `.env` repoda yo‘q; `.env.example` da faqat placeholder.
- `AuditLog` parol/token/karta/secret kalitlarini avtomatik olib tashlaydi; to‘lov hodisalarida karta ma’lumoti saqlanmaydi.
- Production’da `JWT_SECRET` ≥ 32 belgi majburiy; `PAYMENT_PROVIDER=mock` productionda ishga tushmaydi; `REFRESH_COOKIE_SECURE=false` productionda ishga tushmaydi.
- `TOTP_ENCRYPTION_KEY` ni alohida tasodifiy qiymat qilib qo‘yish tavsiya etiladi (bo‘sh bo‘lsa `JWT_SECRET` dan hosil qilinadi — `JWT_SECRET` almashtirilsa, yoqilgan 2FA sirlari o‘qilmay qoladi va superadmin reset kerak bo‘ladi).

## Private media
- Loyiha qoidasi (`PROJECT.md`, 3-band): video fayllar backendga yuklanmaydi, tashqi CDN URL saqlanadi. Prompt 11 esa autentifikatsiyalangan media serverni ham ruxsat etadi.
  Ziddiyat shunday hal qilindi: yuklash kodi bor, lekin **standartda o‘chiq** (`MEDIA_UPLOAD_ENABLED=false`). Yoqish — loyiha egasining qarori.
- Saqlash: mahalliy disk (`MEDIA_DIR`, repoda yo‘q, `public/` dan tashqarida) yoki `STORAGE_DRIVER=s3` — S3/R2/MinIO. Bucket **yopiq** bo‘lishi shart: fayllar baribir API orqali, ruxsat tekshirilgandan keyin beriladi. S3 drayveri protokolni taqlid qiluvchi server bilan sinalgan, haqiqiy bucket bilan emas.
- Imzolangan URL muddati `MEDIA_URL_TTL_SECONDS` (5 daqiqa); bearer token — havolani olgan kishi muddat ichida ochishi mumkin. Akkaunt bloklansa yoki enrollment bekor qilinsa, oqim token muddatidan oldin to‘xtaydi.
- Yopiq video ustida harakatlanuvchi watermark (ko‘ruvchining email/telefoni + akkaunt id’sining boshi) — to‘liq ekranda ham ko‘rinadi; ekran yozuvi tarqalsa kimdan chiqqani bilinadi. Bu DRM emas: nusxalashni to‘xtatmaydi, faqat qo‘rqitadi (va yuklab olish tugmasi/kontekst menyu o‘chirilgan). Watermark brauzerda chiziladi, faylga “kuydirilmaydi”.
- Mavjud `Lesson.videoUrl` (tashqi CDN) imzolanmaydi: CDN havolasini bilgan kishi ochadi. `ENFORCE_ENROLLMENT` faqat API javobida havolani yashiradi.
