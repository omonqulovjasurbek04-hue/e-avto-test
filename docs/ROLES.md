# E-Avto Test — rollar, vazifalar va ularning API'si

> Manba: `backend/src/lib/permissions.ts` (ruxsatlar jadvali), `backend/src/routes/*.ts` (2026-10-21 holati).
> Har bir endpointning to'liq parametrlari: [API.md](API.md). Ruxsat **serverda** tekshiriladi; menyuni yashirish faqat qulaylik uchun.

## 1. Qisqacha

| Rol | Kim | Asosiy vazifasi | Panel |
|---|---|---|---|
| `USER` | O'quvchi | Kurs sotib olish, dars o'qish, test topshirish, jadval va davomatni ko'rish | `/dashboard` |
| `TEACHER` | O'qituvchi | O'z guruhlari, dars jadvali, davomat belgilash | `/teacher` |
| `MODERATOR` | Kontent muharriri | Test savollari, imtihon sozlamalari, sayt sahifalari, yangiliklar, FAQ, e'lonlar, aloqa xabarlari | `/admin` (Savollar, Imtihon, CMS) |
| `FINANCE` | Buxgalter / kassir | Buyurtmalar, tushum, qaytarishlar (refund), hisobotlar | `/admin` (Buyurtmalar, Hisobotlar) |
| `MANAGER` | Qabulxona / operator | O'quvchini guruhga yozish, guruh ochish, dars jadvalini tuzish, buyurtmalarni ko'rish | `/admin` (Guruhlar, Buyurtmalar) |
| `ADMIN` | Markaz boshqaruvchisi | Foydalanuvchilar, kurslar, narxlar, guruhlar, jadval, media, audit, sayt sozlamalari | `/admin` (deyarli hammasi) |
| `SUPERADMIN` | Egasi | Hammasi + rollarni berish (ADMIN/SUPERADMIN ham) + to'lovlarni boshqarish | `/admin` |

Qoidalar:
- Rolni faqat `ADMIN` (oddiy rollar uchun) va `SUPERADMIN` (hammasi uchun) o'zgartiradi. Hech kim o'z rolini o'zgartira olmaydi.
- `ADMIN` o'zida yo'q huquqni bera olmaydi: masalan, `FINANCE` rolini (`payments:manage`) faqat `SUPERADMIN` beradi.
- Rol o'zgarsa yoki akkaunt o'chirilsa, kirish **darhol** yopiladi (har so'rovda bazadan tekshiriladi).
- Xodimlar (`admin:access` borlar) 2FA yoqishi mumkin; hozircha majburiy emas (qarang: BACKEND_TODO #10).

## 2. Ruxsatlar jadvali

| Ruxsat | Nima beradi | USER | TEACHER | MODERATOR | FINANCE | MANAGER | ADMIN | SUPERADMIN |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `admin:access` | `/admin` paneli, Telegram `/admin` menyusi | | | ✅ | ✅ | ✅ | ✅ | ✅ |
| `users:read` | Foydalanuvchilar ro'yxati (faqat o'qish: guruhga o'qituvchi/o'quvchi tanlash), Telegram: o'quvchilar ro'yxati, qidirish | | | | | ✅ | ✅ | ✅ |
| `users:manage` | Foydalanuvchilar, bloklash, 2FA tiklash, umumiy statistika | | | | | | ✅ | ✅ |
| `roles:manage` | ADMIN/SUPERADMIN rolini berish/olish | | | | | | | ✅ |
| `content:manage` | CMS: sahifa, yangilik, FAQ, e'lon, rasm, aloqa xabarlari | | | ✅ | | | ✅ | ✅ |
| `catalog:manage` | Kurs, dars, toifa, paket, narx, chegirma, kupon | | | | | | ✅ | ✅ |
| `tests:manage` | Savollar, imtihon sozlamasi, import/eksport | | | ✅ | | | ✅ | ✅ |
| `orders:read` | Buyurtmalar, tushum | | | | ✅ | ✅ | ✅ | ✅ |
| `payments:manage` | Qaytarishlar (refund) | | | | ✅ | | | ✅ |
| `groups:manage` | Guruh yaratish, a'zo qo'shish, dars (slot) qo'yish | | | | | ✅ | ✅ | ✅ |
| `schedule:manage` | Jadvalni (vaqt) o'zgartirish | | | | | ✅ | ✅ | ✅ |
| `teaching:access` | `/teacher` paneli: guruhlar, jadval | | ✅ | | | | ✅ | ✅ |
| `attendance:mark` | Davomat belgilash va yakunlash | | ✅ | | | | ✅ | ✅ |
| `attendance:edit` | Yakunlangan davomatni o'zgartirish | | | | | | ✅ | ✅ |
| `media:manage` | Video/fayl yuklash | | | | | | ✅ | ✅ |
| `reports:read` | Hisobotlar, reyting, Telegram statistika | | | | ✅ | | ✅ | ✅ |
| `audit:read` | Audit jurnali | | | | | | ✅ | ✅ |
| `settings:manage` | Sayt sozlamalari, bildirishnoma shablonlari, tizim holati | | | | | | ✅ | ✅ |

## 3. Har bir rolning vazifalari va API'si

### 3.1. USER — o'quvchi

Vazifalar: ro'yxatdan o'tish → kurs/paket tanlash → to'lash → darslarni o'qish → test → natija; guruhda o'qisa — jadval va davomat.

| Vazifa | API |
|---|---|
| Ro'yxatdan o'tish / kirish | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/telegram/start` → `/verify` |
| Profil, parol | `GET·PUT /api/users/me`, `PUT /api/auth/password`, `POST /api/auth/logout-all` |
| Kurslarni ko'rish | `GET /api/courses`, `/api/courses/:id`, `/api/courses/:id/lessons`, `GET /api/packages` |
| Narxni hisoblash va sotib olish | `POST /api/quote`, `POST /api/orders`, `GET /api/orders/:id` |
| Qaysi kurslar ochiq | `GET /api/me/enrollments`, `GET /api/me/course-access` |
| Dars o'qish va progress | `GET /api/lessons/:id`, `PUT /api/progress/:lessonId`, `GET /api/progress` |
| Test | `POST /api/tests/start` → `POST /api/tests/:id/answer` → `POST /api/tests/:id/finish` |
| Natijalar, xatolar ustida ishlash | `GET /api/results`, `/api/results/:id`, `GET /api/me/practice`, `PUT·DELETE /api/me/saved-questions/:id` |
| Statistika, o'qish vaqti, reyting | `GET /api/users/me/statistics`, `POST /api/me/study-time`, `GET /api/me/study-time/week`, `GET /api/leaderboard`, `PUT /api/users/me/leaderboard` |
| Guruh, jadval, davomat | `GET /api/me/groups`, `/api/me/schedule`, `/api/me/attendance` |
| Bildirishnomalar | `GET /api/me/notifications`, `POST .../read`, `GET·PUT /api/me/notification-preferences` |

### 3.2. TEACHER — o'qituvchi

Vazifalar: o'z guruhlari va jadvalini ko'rish, har bir darsda davomat belgilash va yakunlash, dars mavzusi/xonasini yozish.
Darsga kelmagan o'quvchiga yakunlashda avtomatik bildirishnoma va Telegram eslatma (3 marta) ketadi.

| Vazifa | API (🛡 `teaching:access`) |
|---|---|
| Guruhlarim | `GET /api/groups`, `GET /api/groups/:id` |
| Jadvalim | `GET /api/teacher/schedule?from&to`, `GET /api/groups/:id/slots` |
| Dars ma'lumoti (mavzu, xona, onlayn havola, holat) | `PATCH /api/slots/:id` (vaqtni o'zgartirish — faqat `schedule:manage`) |
| Davomat | `GET·PUT /api/slots/:id/attendance`, `POST /api/slots/:id/attendance/finalize` (🛡 `attendance:mark`) |
| Davomat hisoboti | `GET /api/groups/:id/attendance-report`, `.csv` |

Yakunlangan davomatni o'qituvchi o'zgartira olmaydi — buni `ADMIN` qiladi (`attendance:edit`, sabab majburiy).

### 3.3. MODERATOR — kontent muharriri

Vazifalar: test savollarini yozish va tekshirish, imtihon qoidalari (savol soni, vaqt, o'tish bali), sayt matnlari, yangiliklar, FAQ, e'lonlar, aloqa formasi xabarlariga javob.

| Vazifa | API |
|---|---|
| Savollar | `GET·POST /api/admin/questions`, `PUT·DELETE /api/admin/questions/:id` (🛡 `tests:manage`) |
| Kurs/dars ro'yxatini ko'rish (savolni bog'lash uchun) | `GET /api/admin/courses`, `GET /api/admin/lessons` |
| Imtihon sozlamasi, import/eksport | `GET·PUT /api/admin/exam/courses/:id/config`, `POST /api/admin/exam/questions/import`, `GET .../export` |
| Sahifa, yangilik, FAQ | `/api/admin/cms/pages`, `/news`, `/faq` (🛡 `content:manage`) |
| Rasm kutubxonasi | `/api/admin/cms/images` |
| E'lon yuborish (hammaga / guruhga / kurs o'quvchilariga) | `POST /api/admin/cms/announcements` |
| Aloqa xabarlari | `GET /api/admin/cms/messages`, `PATCH /api/admin/cms/messages/:id`; Telegram: ✉️ Xabarlar |

### 3.4. FINANCE — moliya

Vazifalar: tushgan to'lovlarni kuzatish, buyurtma holatini tekshirish, qaytarish (refund) so'rovlarini bajarish, davr bo'yicha tushum va hisobotlar.

| Vazifa | API |
|---|---|
| Buyurtmalar | `GET /api/admin/finance/orders?status&search` (🛡 `orders:read`) |
| Tushum | `GET /api/admin/finance/summary?from&to` |
| Qaytarish | `GET /api/admin/finance/refunds`, `POST .../payments/:id/refunds`, `POST .../refunds/:id/complete`, `.../reject` (🛡 `payments:manage`) |
| Hisobotlar | `GET /api/admin/reports/tests`, `/teachers`, `/leaderboard` (🛡 `reports:read`); Telegram: 📊 Statistika, 🏆 Reyting |

> Onlayn to'lov (Payme/Click) hali ulanmagan (`PAYMENT_PROVIDER` bo'sh) — FINANCE ishining asosiy qismi shundan keyin boshlanadi.

### 3.5. MANAGER — qabulxona / operator

Vazifalar: yangi o'quvchini guruhga yozish, guruh ochish (kurs + o'qituvchi), dars jadvalini tuzish va o'zgartirish (vaqt, xona, bekor qilish), to'lov holatini tekshirish.
Narxlar, kurs mazmuni, sozlamalar, audit, rollar, refund va davomat belgilash — yo'q.

| Vazifa | API |
|---|---|
| O'qituvchi/o'quvchi ro'yxati (tanlash uchun) | `GET /api/admin/users?role` (🛡 `users:read`, faqat o'qish) |
| Kurs ro'yxati (guruh ochish uchun) | `GET /api/admin/courses`, `GET /api/admin/lessons` (faqat o'qish) |
| Guruhlar | `POST·PUT·DELETE /api/admin/groups`, `.../members` (🛡 `groups:manage`); `GET /api/groups`, `/api/groups/:id`, `/api/groups/:id/slots` |
| Jadval | `POST /api/admin/groups/:id/slots`, `PATCH /api/slots/:id` (🛡 `schedule:manage`) |
| Buyurtmalar | `GET /api/admin/finance/orders`, `/summary` (🛡 `orders:read`) |

Rolni `ADMIN` ham beradi (MANAGER'ning hamma ruxsati ADMIN'da bor).

### 3.6. ADMIN — markaz boshqaruvchisi

Vazifalar: o'quvchi va xodimlarni boshqarish, kurs/dars/narxlarni yuritish, guruh ochish va jadval tuzish, video yuklash, sayt sozlamalari, audit.

| Vazifa | API |
|---|---|
| Foydalanuvchilar | `GET /api/admin/users`, `PATCH .../users/:id/role`, `.../status`, `DELETE .../users/:id/two-factor`, `GET /api/admin/statistics` |
| Katalog | `/api/admin/courses`, `/lessons`, `/api/admin/categories`, `/api/admin/catalog/packages`, `.../prices`, `/discounts`, `/coupons` |
| Guruhlar va jadval | `POST·PUT·DELETE /api/admin/groups`, `.../members`, `POST .../:id/slots` (takrorlanuvchi, to'qnashuv tekshiriladi) |
| Davomatni tuzatish | `PUT /api/slots/:id/attendance` + `reason` |
| Media | `/api/admin/media` (`MEDIA_UPLOAD_ENABLED=true` kerak) |
| Sayt sozlamalari, shablonlar | `PUT /api/admin/cms/site-settings`, `/api/admin/cms/notification-templates` |
| Audit, tizim holati | `GET /api/admin/audit`, `GET /api/admin/system` |
| + MODERATOR va o'qituvchi vazifalari | yuqoridagi hammasi (refunddan tashqari) |

### 3.7. SUPERADMIN — egasi

ADMIN qila oladigan hamma narsa + `roles:manage` (ADMIN/SUPERADMIN tayinlash) + `payments:manage` (refund).
Birinchi SUPERADMIN `BOOTSTRAP_ADMIN_PHONE` yoki `npm run create-superadmin` bilan yaratiladi. Kundalik ishda ADMIN akkauntidan foydalanish tavsiya etiladi.

## 4. Loyiha optimal ishlashi uchun tavsiyalar

Hozirgi 7 rol avtomaktab uchun yetarli, lekin bir nechta bo'shliq bor:

| # | Muammo | Taklif |
|---|---|---|
| 1 | ✅ Bajarildi: qabulxona uchun **`MANAGER`** roli (3.5) — ADMIN bermasdan guruh va jadval bilan ishlash | — |
| 2 | O'qituvchi o'z guruhidagi o'quvchilarning test natijalarini ko'rmaydi | `GET /api/groups/:id/results` (🛡 `teaching:access`, faqat o'z guruhi) — o'quvchining tayyorgarligini kuzatish uchun |
| 3 | MODERATOR `POST /announcements` orqali **barcha** foydalanuvchilarga xabar yubora oladi | `audience: all` uchun alohida ruxsat (`announcements:broadcast`) yoki faqat ADMIN |
| 4 | Xodimlar uchun 2FA ixtiyoriy | `admin:access` bor rollar uchun 2FA'ni majburiy qilish (BACKEND_TODO #10) |
| 5 | Ruxsatlar kodda qattiq yozilgan | Hozircha to'g'ri yondashuv (oddiy, xavfsiz). Rollar ko'paysa — bazada rol→ruxsat jadvali va SUPERADMIN uchun tahrirlash sahifasi |

## 5. Lokal sinov akkauntlari

`cd backend && npm run seed:roles` — har bir rol uchun bittadan akkaunt (faqat lokal baza, telefon `+99890000001x`).
Parol: `prisma/seed-roles.ts` dagi `PASSWORD` (yoki `SEED_ROLE_PASSWORD`).
