# E-Avto — xavfsizlik

Oxirgi audit: 2026-10-15 (16-bosqich, kod ko‘rigi + avtomatik testlar + `npm audit`).
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

## Tasdiqlangan (xato topilmadi)
- **Kirish nazorati inventari:** ilovadagi barcha marshrutlar avtomatik sanaladi; ochiq ro‘yxatdan tashqari hammasi tokensiz `401` beradi; oddiy o‘quvchi `/api/admin/*`, `/api/groups*`, `/api/slots*`, `/api/teacher*` ga `403` oladi. Yangi marshrut `authMiddleware`siz qo‘shilsa test yiqiladi.
- **Rol eskalatsiyasi:** profil yangilashda `role` yuborish ta’sir qilmaydi; ADMIN/SUPERADMIN berish faqat SUPERADMIN; o‘z rolini o‘zgartirib bo‘lmaydi.
- **IDOR/BOLA:** buyurtma, bildirishnoma, davomat, jadval, media, guruh — boshqa foydalanuvchi ob’ekti `404/403`.
- **To‘lov:** noto‘g‘ri imzo `401`; summa/valyuta mos kelmasa rad etiladi; 6 ta bir vaqtdagi bir xil callback → bitta `processed`, 5 `duplicate`, bitta enrollment.
- **Promo-kod poygasi:** 1 ta o‘rni qolgan kod 5 ta bir vaqtdagi xaridorning faqat bittasiga beriladi.
- **Headerlar:** `X-Powered-By` yo‘q, HSTS, `nosniff`, `X-Frame-Options`; CORS begona originni qaytarmaydi; xatolarda stack trace yo‘q.
- **Parollar:** bcrypt, bir xil vaqt (noma’lum email uchun dummy hash), parol almashtirilganda barcha tokenlar bekor.
- **SQL injection:** faqat Prisma va parametrlangan `$queryRaw/$executeRaw` shablonlari ishlatiladi.
- **Fayl yuklash:** tur baytlardan aniqlanadi, hajm oqimda cheklanadi, kalit serverda yaratiladi (path traversal yo‘q); yuklash standartda o‘chiq.

## Ochiq (qolgan) xavflar

| Daraja | Muammo | Tavsiya |
|---|---|---|
| Medium | JWT `localStorage` da — XSS bo‘lsa o‘g‘rilanadi. Yengillashtirish: server+brauzer sanitizatsiyasi, `http(s)`-only URL | Frontend hostida qat’iy **CSP** (quyida); keyinroq httpOnly cookie + refresh token |
| Medium | Rate limit xotirada — bir nechta instansiyada ishlamaydi | Redis store (hisob blokirovkasi allaqachon bazada) |
| Medium | Real to‘lov provayderi ulanmagan; Payme/Click imzo sxemasi va callback takrorlash (timestamp) qoidalari rasmiy hujjat bo‘yicha tekshirilmagan | Merchant hujjati + sandbox testi, so‘ng “tayyor” deb belgilash |
| Medium | Yuklangan fayllarga antivirus yo‘q (yuklash o‘chiq) | Yoqishdan oldin ClamAV yoki shu kabi skaner |
| Low | Ro‘yxatdan o‘tishda email mavjudligi oshkor bo‘ladi (`409`) | Email tasdiqlash oqimi bilan birga yagona javob |
| Low | Email/telefon tasdiqlash, 2FA, parol “buzilgan parollar” tekshiruvi yo‘q | Biznes qaroriga qarab |
| Low | `react-router` (frontend) moderate advisory — faqat SSR gidratatsiyasiga tegishli, loyiha SSR ishlatmaydi | Kelajakda v7 ga o‘tishda yopiladi (breaking) |
| Info | Telegram login (avvaldan mavjud) bu auditda chuqur qayta ko‘rilmadi (urinishlar hisoblagichi bor) | Alohida ko‘rik |
| Info | Backup/restore va monitoring sinalmagan | 18-bosqich |

**Xulosa:** ochiq Critical/High yo‘q, lekin loyiha productionga **tayyor emas**: real to‘lov, backup/restore, monitoring, mustaqil audit va yuqoridagi Medium bandlar qolgan.

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
- Production’da `JWT_SECRET` ≥ 32 belgi majburiy; `PAYMENT_PROVIDER=mock` productionda ishga tushmaydi.

## Private media
- Loyiha qoidasi (`PROJECT.md`, 3-band): video fayllar backendga yuklanmaydi, tashqi CDN URL saqlanadi. Prompt 11 esa autentifikatsiyalangan media serverni ham ruxsat etadi.
  Ziddiyat shunday hal qilindi: yuklash kodi bor, lekin **standartda o‘chiq** (`MEDIA_UPLOAD_ENABLED=false`). Yoqish — loyiha egasining qarori.
- Mahalliy disk (`MEDIA_DIR`, repoda yo‘q, `public/` dan tashqarida). Haqiqiy object storage (S3/R2) ulanmagan.
- Imzolangan URL muddati `MEDIA_URL_TTL_SECONDS` (5 daqiqa); bearer token — havolani olgan kishi muddat ichida ochishi mumkin. Akkaunt bloklansa yoki enrollment bekor qilinsa, oqim token muddatidan oldin to‘xtaydi.
- Brauzerga ko‘rsatilgan videoni nusxalashdan to‘liq himoya yo‘q (ekran yozish va h.k.); watermark ulanmagan.
- Mavjud `Lesson.videoUrl` (tashqi CDN) imzolanmaydi: CDN havolasini bilgan kishi ochadi. `ENFORCE_ENROLLMENT` faqat API javobida havolani yashiradi.
