# E-Avto — To‘liq loyiha texnik topshirig‘i, struktura va AI prompt

> Versiya: 1.0  
> Loyiha turi: haydovchilik nazariy imtihoniga tayyorlovchi veb-platforma  
> Asosiy til: o‘zbekcha (lotin)  
> Asosiy texnologiyalar: TypeScript, Next.js, PostgreSQL  
> Maqsad: ushbu hujjatni dasturchiga yoki AI kod yozish vositasiga berib, loyihani bosqichma-bosqich ishlab chiqish.

---

## 1. Loyiha haqida

**E-Avto** — foydalanuvchilarga haydovchilik nazariy imtihoniga tayyorlanish, yo‘l harakati qoidalarini o‘rganish, rasmli savollar yechish va videodarslarni ko‘rish imkonini beradigan zamonaviy platforma.

Sayt:
- kompyuter, planshet va telefonlarda ishlashi;
- o‘zbekcha interfeysga ega bo‘lishi;
- tun va kun rejimlarini qo‘llashi;
- testlar, foydalanuvchilar, natijalar va media fayllarni boshqarishi;
- xavfsizlikni boshidan hisobga olib ishlab chiqilishi;
- keyinchalik rus tili, to‘lovlar, mobil ilova va boshqa imkoniyatlar bilan kengayishi kerak.

### Asosiy maqsadlar
1. Imtihonga tayyorlanishni osonlashtirish.
2. Savollarni mavzu va toifalar bo‘yicha o‘rganish.
3. Imtihon rejimida vaqt bilan mashq qilish.
4. Natijalar va xatolarni tahlil qilish.
5. Administratorga kontentni qulay boshqarish imkonini berish.
6. Rasmlar, videolar va foydalanuvchi ma’lumotlarini ruxsatsiz kirishdan himoyalash.

---

## 2. Tavsiya etiladigan texnologiyalar

| Qism | Texnologiya | Vazifasi |
|---|---|---|
| Dasturlash tili | TypeScript | Frontend va backend kodini xavfsizroq, tushunarliroq yozish |
| Web framework | Next.js | Sahifalar, routing, server rendering va server API |
| UI | React | Interfeys komponentlari |
| CSS | Tailwind CSS | Moslashuvchan dizayn va ranglar |
| UI komponentlari | shadcn/ui yoki Radix UI | Kirish maydonlari, dialoglar, menyular va boshqa komponentlar |
| Ma’lumotlar bazasi | PostgreSQL | Foydalanuvchi, savol, natija va kontent metama’lumotlari |
| ORM | Prisma yoki Drizzle | Ma’lumotlar bazasi bilan ishlash |
| Validatsiya | Zod | Serverga kelgan ma’lumotlarni tekshirish |
| Autentifikatsiya | Auth.js yoki tekshirilgan autentifikatsiya yechimi | Kirish, sessiyalar va foydalanuvchi identifikatsiyasi |
| Fayllar | Private object storage, masalan Cloudflare R2 | Rasm, PDF va boshqa fayllarni saqlash |
| Video | Cloudflare Stream yoki shunga o‘xshash himoyalangan video hosting | Videoni qayta ishlash va streaming |
| Testlar | Vitest va Playwright | Birlik va end-to-end testlar |
| Monitoring | Xatolik monitoringi va server loglari | Xatolarni kuzatish |
| Deploy | HTTPS qo‘llaydigan hosting | Saytni internetga joylashtirish |

**Muhim:** Next.js’ni frontend va backend uchun ishlatish mumkin. Loyiha kattalashganda backendni alohida xizmatga ajratish ham mumkin. Texnologiya tanlovi xavfsizlikning o‘rnini bosmaydi.

---

## 3. Sayt xaritasi va sahifalar

### 3.1 Ommaviy sahifalar
1. `/` — Bosh sahifa
2. `/about` — Loyiha haqida
3. `/categories` — Test toifalari
4. `/categories/[slug]` — Toifa tafsilotlari
5. `/rules` — Yo‘l harakati qoidalari
6. `/rules/[slug]` — Qoidaning alohida sahifasi
7. `/road-signs` — Yo‘l belgilari katalogi
8. `/road-signs/[slug]` — Belgi tafsiloti
9. `/lessons` — O‘quv materiallari
10. `/videos` — Video darslar katalogi
11. `/videos/[slug]` — Video dars sahifasi
12. `/pricing` — Agar pullik tariflar qo‘shilsa
13. `/contact` — Aloqa
14. `/privacy` — Maxfiylik siyosati
15. `/terms` — Foydalanish shartlari
16. `/login` — Tizimga kirish
17. `/register` — Ro‘yxatdan o‘tish
18. `/forgot-password` — Parolni tiklash
19. `/403` — Ruxsat yo‘q
20. `/404` — Sahifa topilmadi

### 3.2 Foydalanuvchi kabineti
1. `/dashboard` — Umumiy ko‘rsatkichlar
2. `/dashboard/profile` — Profil va sozlamalar
3. `/dashboard/tests` — Testlar tarixi
4. `/dashboard/results/[id]` — Test natijasi
5. `/dashboard/mistakes` — Noto‘g‘ri javoblar
6. `/dashboard/bookmarks` — Saqlangan savollar
7. `/dashboard/progress` — O‘zlashtirish statistikasi
8. `/dashboard/lessons` — O‘quv jarayoni
9. `/dashboard/security` — Sessiyalar va xavfsizlik sozlamalari

### 3.3 Test sahifalari
- `/tests` — Test rejimlarini tanlash
- `/tests/practice` — Oddiy mashq
- `/tests/exam` — Imtihon rejimi
- `/tests/topic/[slug]` — Mavzu bo‘yicha test
- `/tests/session/[id]` — Boshlangan test sessiyasi
- `/tests/result/[id]` — Natija

### 3.4 Admin paneli
1. `/admin` — Admin bosh sahifasi
2. `/admin/questions` — Savollar ro‘yxati
3. `/admin/questions/new` — Yangi savol
4. `/admin/questions/[id]` — Savolni tahrirlash
5. `/admin/categories` — Kategoriyalar
6. `/admin/topics` — Mavzular
7. `/admin/media` — Rasmlar, videolar va fayllar
8. `/admin/lessons` — Darslar
9. `/admin/users` — Foydalanuvchilar
10. `/admin/roles` — Rollar va ruxsatlar
11. `/admin/results` — Natijalar statistikasi
12. `/admin/reports` — Hisobotlar
13. `/admin/audit-logs` — Audit jurnali
14. `/admin/settings` — Sayt sozlamalari
15. `/admin/backups` — Zaxira nusxalar holati
16. `/admin/security` — Xavfsizlik holati

Admin sahifalarining barchasi server tomonida ruxsatni tekshirishi shart. Faqat menyuni yashirish yetarli emas.

---

## 4. Bosh sahifa tarkibi

Bosh sahifada quyidagi bloklar bo‘lsin:

1. **Header**
   - E-Avto logotipi
   - Bosh sahifa
   - Testlar
   - Yo‘l qoidalari
   - Yo‘l belgilari
   - Videodarslar
   - Kirish / Profil
   - Tun/kun rejimi tugmasi
   - Mobil menyu

2. **Hero bo‘limi**
   - Sarlavha: “Haydovchilik imtihoniga ishonch bilan tayyorlaning”
   - Qisqa tushuntirish
   - “Testni boshlash” asosiy tugmasi
   - “Qoidalarni o‘rganish” ikkinchi tugmasi
   - Yo‘l belgisi yoki avtomobilga oid original illustratsiya

3. **Tezkor kategoriyalar**
   - Haydovchilik toifalari
   - Mavzu bo‘yicha test
   - Imtihon rejimi
   - Yo‘l belgilari

4. **Platforma imkoniyatlari**
   - Rasmli savollar
   - Vaqt bilan test
   - Xatolar tahlili
   - Natijalar tarixi
   - Videodarslar

5. **O‘rganishni davom ettirish**
   - Faqat tizimga kirgan foydalanuvchiga ko‘rsatilsin
   - Oxirgi test yoki dars
   - Progress ko‘rsatkichi

6. **Footer**
   - Aloqa
   - Maxfiylik siyosati
   - Foydalanish shartlari
   - Ijtimoiy tarmoqlar (agar mavjud bo‘lsa)
   - Saytning mualliflik va huquqiy ma’lumotlari

Statistika yoki “foydalanuvchilar soni” kabi raqamlar faqat haqiqiy ma’lumot bo‘lsa ko‘rsatilsin; uydirma raqamlar ishlatilmasin.

---

## 5. Ranglar va dizayn tizimi

Dizayn zamonaviy, ishonchli, o‘qilishi oson va haydovchilik mavzusiga mos bo‘lsin. Ranglar semantik tokenlar orqali boshqarilsin; komponentlarda ranglar tasodifiy takrorlanmasin.

### 5.1 Kun rejimi (Light)
- Sahifa foni: `#F8FAFC`
- Asosiy karta foni: `#FFFFFF`
- Asosiy matn: `#0F172A`
- Ikkinchi darajali matn: `#475569`
- Asosiy brend rangi: `#2563EB`
- Hover brend rangi: `#1D4ED8`
- Muvaffaqiyat: `#15803D`
- Ogohlantirish: `#B45309`
- Xato: `#B91C1C`
- Chegara: `#E2E8F0`

### 5.2 Tun rejimi (Dark)
- Sahifa foni: `#0B1220`
- Karta foni: `#111827`
- Ko‘tarilgan sirt: `#1F2937`
- Asosiy matn: `#F8FAFC`
- Ikkinchi darajali matn: `#CBD5E1`
- Asosiy brend rangi: `#60A5FA`
- Hover brend rangi: `#93C5FD`
- Muvaffaqiyat: `#4ADE80`
- Ogohlantirish: `#FBBF24`
- Xato: `#F87171`
- Chegara: `#334155`

### 5.3 Ranglardan foydalanish
- Ko‘k — asosiy harakatlar va navigatsiya.
- Yashil — to‘g‘ri javob va muvaffaqiyat.
- Qizil — xato javob va xavfli holat.
- Sariq — ogohlantirish.
- Fon va matn kontrasti WCAG AA talablariga imkon qadar mos bo‘lsin.
- Rangning o‘zi bilan ma’no berilmasin; ikonka yoki matn ham qo‘shilsin.
- `prefers-color-scheme` bo‘yicha boshlang‘ich rejim aniqlanishi mumkin.
- Foydalanuvchi tanlovi saqlansin va keyingi kirishda tiklansin.
- Hydration xatosi yoki rejim almashganda keskin miltillash bo‘lmasin.

### 5.4 Tipografiya va komponentlar
- Tavsiya etiladigan shrift: Inter yoki tizim shriftlari.
- Sarlavhalar aniq ierarxiyaga ega bo‘lsin.
- Tugmalar bosilganda holati ko‘rinsin.
- Fokus holati klaviatura foydalanuvchilari uchun ko‘rinadigan bo‘lsin.
- Karta burchaklari 12–16 px atrofida.
- Animatsiyalar yengil va qisqa; foydalanuvchi kamaytirilgan animatsiyani tanlagan bo‘lsa, hurmat qilinsin.
- Mobil ekranda navigatsiya qulay bo‘lsin.

---

## 6. Test tizimi

### 6.1 Test turlari
- Erkin mashq
- Mavzu bo‘yicha mashq
- Imtihon rejimi
- Noto‘g‘ri javoblarni qayta ishlash
- Belgilangan savollar bo‘yicha mashq
- Rasmli vaziyatlar testi

### 6.2 Savol modeli
Har bir savolda:
- Savol matni
- Kategoriya va mavzu
- Ixtiyoriy rasm yoki media
- Javob variantlari
- To‘g‘ri javob yoki javoblar
- Tushuntirish
- Qiyinlik darajasi
- Holat: qoralama/nashr qilingan/arxiv
- Manba yoki izoh (zarur bo‘lsa)
- Yaratilgan va yangilangan sana

### 6.3 Test ishlash oynasi
- Savol raqami va jami savollar
- Savol matni va rasmi
- Javob variantlari
- Oldingi/keyingi tugmalari (rejimga qarab)
- Javobni belgilash
- Qolgan vaqt (vaqtli rejimda)
- Savollar navigatsiyasi
- Yakunlashdan oldin tasdiqlash
- Internet uzilishi holatida xavfsiz tiklash strategiyasi

### 6.4 Natijalar
- To‘g‘ri javoblar soni
- Noto‘g‘ri javoblar soni
- Javob berilmagan savollar
- Foiz va ball
- Har bir savol bo‘yicha foydalanuvchi javobi
- To‘g‘ri javob va izoh (test yakunlangandan keyin, tegishli rejimda)
- Qayta ishlash tugmasi

**Xavfsizlik talabi:** to‘g‘ri javob kaliti va yakuniy ball hisoblash logikasi foydalanuvchi boshqaradigan frontendga ishonib topshirilmasin. Backend test sessiyasi va javoblarni tekshirib, natijani hisoblasin.

---

## 7. Foydalanuvchi hisobi

### Ro‘yxatdan o‘tish
- Ism (zarur bo‘lsa)
- Email yoki telefon (tanlangan autentifikatsiya usuliga qarab)
- Parol yoki xavfsiz autentifikatsiya oqimi
- Maxfiylik siyosati va shartlarga rozilik

### Profil
- Ism va profil ma’lumotlari
- Testlar tarixi
- O‘zlashtirish statistikasi
- Saqlangan savollar
- Darslar progressi
- Tun/kun rejimi
- Til sozlamasi (kelajakda ko‘p tillilik qo‘shilsa)

### Hisob xavfsizligi
- Sessiyani tugatish
- Barcha sessiyalardan chiqish
- Parolni tiklash
- Muhim amallarda qayta autentifikatsiya
- Foydalanuvchi hisobini o‘chirish so‘rovi
- Kerakli audit yozuvlari

---

## 8. Admin paneli

### 8.1 Dashboard
- Jami foydalanuvchilar
- Yangi ro‘yxatdan o‘tishlar
- Testlar soni
- O‘rtacha natija
- Eng ko‘p ishlangan mavzular
- Kontent holati
- Xavfsizlik ogohlantirishlari

Raqamlar real bazadan olinishi kerak.

### 8.2 Savollar boshqaruvi
- Yangi savol yaratish
- Savolni tahrirlash
- Javob variantlarini qo‘shish/o‘chirish
- To‘g‘ri javobni belgilash
- Rasm biriktirish
- Izoh yozish
- Kategoriya va mavzu tanlash
- Qoralama sifatida saqlash
- Nashr qilish
- Arxivlash
- Qidirish, filterlash va sahifalash
- CSV/JSON import-eksport faqat admin ruxsati bilan va validatsiya orqali

### 8.3 Media boshqaruvi
- Fayl yuklash
- Fayl metama’lumotlarini tahrirlash
- Kategoriya va kirish darajasi belgilash
- Faylni almashtirish yoki arxivlash
- Yuklash holati va xatolar
- Ruxsatsiz yuklab olishni tekshirish
- Ommaviy havolalarni tasodifan yaratishga yo‘l qo‘ymaslik

### 8.4 Foydalanuvchi va ruxsatlar
- Foydalanuvchilarni qidirish
- Holatni boshqarish
- Rol berish
- Rolni o‘zgartirish faqat yuqori huquqli admin tomonidan
- O‘z vakolatini o‘zi oshirish imkonini bermaslik
- Muhim amallarga audit yozuvi

### 8.5 Admin xavfsizligi
- Ikki bosqichli autentifikatsiya
- Kuchli sessiya siyosati
- Login urinishlariga limit
- Audit loglar
- Maxfiy ma’lumotlarni logga yozmaslik
- Muhim o‘zgarishlarda tasdiqlash oynasi
- Minimal zarur vakolat tamoyili

---

## 9. Fayllar, rasmlar va videolarni saqlash

### 9.1 Tavsiya etiladigan arxitektura
- PostgreSQL: foydalanuvchilar, testlar, natijalar va media metama’lumotlari.
- Private object storage (masalan, Cloudflare R2): rasm, PDF va xom fayllar.
- Himoyalangan video hosting (masalan, Cloudflare Stream): videolar va streaming.
- Backend: foydalanuvchining ruxsatini tekshiradi va keyin kerakli faylga qisqa muddatli ruxsat beradi.

### 9.2 Faylni yuklash jarayoni
1. Admin autentifikatsiyadan o‘tadi.
2. Server adminning media yuklash huquqini tekshiradi.
3. Fayl hajmi va ruxsat etilgan turlari tekshiriladi.
4. Faylning haqiqiy turi va mazmuni tekshiriladi; faqat fayl kengaytmasiga ishonilmaydi.
5. Zarur bo‘lsa zararli fayl skaneri ishlatiladi.
6. Fayl private storage'ga yuklanadi.
7. Ma’lumotlar bazasiga fayl metama’lumotlari yoziladi.
8. Fayl faqat ruxsatli oqim orqali ko‘rsatiladi.

### 9.3 Himoyalash qoidalari
- Maxfiy fayllar `public/` papkaga joylashtirilmasin.
- Storage bucket private bo‘lsin.
- Uzoq muddatli ochiq URL ishlatilmasin.
- Qisqa muddatli signed URL yoki token qo‘llansin.
- Backend har safar ruxsatni tekshirsin.
- Tokenlar serverda yaratilishi va maxfiy kalitlar serverda qolishi kerak.
- Video xizmatida private/signed playback yoqilsin.
- Video playerdagi manzillarni yashirishning o‘zi himoya hisoblanmaydi.
- Premium video uchun foydalanuvchiga bog‘langan watermark qo‘llanishi mumkin.
- Juda yuqori himoya kerak bo‘lsa, DRM qo‘llab-quvvatlaydigan xizmat ko‘rib chiqilsin.

**Haqiqiy cheklov:** brauzerda ko‘rsatilgan kontentni 100% ko‘chirishdan himoyalashning iloji yo‘q. Ekran yozuvi yoki boshqa qurilma bilan tasvirga olish mumkin. Maqsad — ruxsatsiz kirish, oddiy yuklab olish va havolani tarqatishni qiyinlashtirish.

Rasmiy hujjatlar:
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Cloudflare Stream xavfsiz ko‘rish: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/

---

## 10. Ma’lumotlar bazasi tuzilmasi

Quyidagi jadvallar boshlang‘ich model sifatida taklif qilinadi. Haqiqiy schema migratsiyalar bilan boshqarilsin.

### Asosiy jadvallar
- `users`: foydalanuvchi identifikatori va profil ma’lumotlari
- `roles`: rollar
- `permissions`: alohida ruxsatlar
- `user_roles`: foydalanuvchi-roll bog‘lanishi
- `categories`: test kategoriyalari
- `topics`: mavzular
- `questions`: savol matni, media identifikatori va holati
- `answer_options`: javob variantlari
- `test_sessions`: test sessiyalari
- `test_answers`: foydalanuvchi javoblari
- `test_results`: hisoblangan natijalar
- `bookmarks`: saqlangan savollar
- `media_assets`: fayl metama’lumotlari, storage key va kirish darajasi
- `lessons`: darslar
- `lesson_progress`: dars progressi
- `audit_logs`: muhim amallar jurnali
- `site_settings`: sayt sozlamalari

### Muhim schema qoidalari
- Har bir jadvalda kerakli primary key va foreign key bo‘lsin.
- Kerakli ustunlar uchun indekslar yaratilishi.
- Vaqtlar UTC da saqlanib, interfeysda foydalanuvchi vaqt zonasiga mos ko‘rsatilishi.
- Maxfiy ma’lumotlar zarur bo‘lmagan joyda saqlanmasin.
- Parollar ochiq matnda saqlanmasin.
- Media uchun ommaviy URL emas, storage key yoki provider ID saqlansin.
- Natijalar server tomonidan hisoblanib saqlansin.
- O‘chirish va arxivlash siyosati oldindan belgilanib qo‘yilsin.

---

## 11. Xavfsizlik talablari

1. **Autentifikatsiya:** ishonchli sessiya boshqaruvi, xavfsiz cookie sozlamalari.
2. **Avtorizatsiya:** har bir API va maxfiy sahifada server-side ruxsat tekshiruvi.
3. **RBAC:** foydalanuvchi, moderator, admin va superadmin vakolatlarini ajratish.
4. **Parollar:** kuchli, zamonaviy password hashing; parollarni loglamaslik.
5. **2FA:** administratorlar uchun ikki bosqichli tasdiqlash.
6. **Rate limiting:** login, parol tiklash, fayl yuklash va muhim APIlarda.
7. **Validatsiya:** serverda Zod yoki o‘xshash vosita bilan kiruvchi ma’lumotlarni tekshirish.
8. **SQL injection:** parametrli so‘rovlar yoki ORM orqali himoyalash.
9. **XSS:** foydalanuvchi kiritgan HTMLni ishonchsiz deb hisoblash va to‘g‘ri escape qilish.
10. **CSRF:** autentifikatsiya usuliga mos himoya.
11. **IDOR:** boshqa foydalanuvchining ID sini almashtirish orqali ma’lumot olishning oldini olish.
12. **Secrets:** `.env` maxfiy fayllari repozitoriyga qo‘shilmasin; production secret manager yoki muhit sozlamalaridan foydalanilsin.
13. **HTTPS:** barcha production trafik uchun.
14. **CORS:** faqat zarur originlarga ruxsat.
15. **CSP va xavfsizlik headerlari:** ilova imkoniyatiga mos sozlash.
16. **Audit:** admin amallari va muhim xavfsizlik hodisalari qayd etilsin.
17. **Backup:** shifrlangan, alohida ruxsatli joyda saqlash va tiklashni sinash.
18. **Ma’lumotlar maxfiyligi:** faqat kerakli shaxsiy ma’lumotlarni yig‘ish, saqlash muddatini belgilash.
19. **Xato javoblari:** stack trace va secretlarni foydalanuvchiga ko‘rsatmaslik.
20. **Dependency audit:** kutubxonalarni muntazam tekshirish va yangilash.

---

## 12. API yo‘nalishlari

Aniq endpointlar implementatsiya vaqtida belgilanadi. Taxminiy guruhlar:

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login` (tanlangan auth yechimiga mos)
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`

### Testlar
- `GET /api/categories`
- `GET /api/questions` — faqat ruxsat etilgan savollar
- `POST /api/test-sessions`
- `POST /api/test-sessions/:id/answers`
- `POST /api/test-sessions/:id/submit`
- `GET /api/test-results/:id`

### Media
- `POST /api/admin/media/upload`
- `GET /api/media/:id/access` — ruxsat tekshirilib, kerak bo‘lsa vaqtinchalik URL/token beriladi
- `DELETE /api/admin/media/:id` — admin huquqi va bog‘liqlik tekshiruvi bilan

### Admin
- `/api/admin/questions`
- `/api/admin/categories`
- `/api/admin/users`
- `/api/admin/reports`
- `/api/admin/settings`

Bu yo‘nalishlar namunaviy. Endpointlar faqat nomi bo‘yicha xavfsiz bo‘lib qolmaydi: serverda autentifikatsiya, rol, resurs egaligi, validatsiya va rate limiting tekshirilsin.

---

## 13. Loyihani ishlab chiqish ketma-ketligi

### 1-bosqich — Rejalash
- Talablarni yakunlash
- MVP funksiyalarini belgilash
- Dizayn prototipi
- Ma’lumotlar modeli
- Hosting va storage tanlovi

### 2-bosqich — Loyihani yaratish
- Next.js + TypeScript loyihasi
- Tailwind CSS va UI komponentlari
- Lint, format va type-check
- `.env.example`
- Git va branch siyosati

### 3-bosqich — Dizayn tizimi
- Rang tokenlari
- Kun/tun rejimi
- Header, footer, tugmalar, inputlar, kartalar
- Mobil navigatsiya
- Loading, empty va error holatlari

### 4-bosqich — Ma’lumotlar bazasi
- PostgreSQL ulash
- Schema va migratsiyalar
- Seed ma’lumotlari
- Indekslar va constraintlar

### 5-bosqich — Autentifikatsiya va ruxsatlar
- Ro‘yxatdan o‘tish va kirish
- Sessiya boshqaruvi
- Rollar
- Admin route himoyasi
- Parolni tiklash
- Admin 2FA

### 6-bosqich — Test tizimi
- Kategoriya va mavzular
- Savollar CRUD
- Test sessiyasi
- Javoblarni saqlash
- Serverda natija hisoblash
- Xatolar va tarix

### 7-bosqich — Media tizimi
- Private storage
- Fayl yuklash validatsiyasi
- Media metama’lumotlari
- Signed URL/token oqimi
- Video player
- Ruxsatsiz kirish testlari

### 8-bosqich — Foydalanuvchi kabineti
- Profil
- Natijalar
- Progress
- Saqlangan savollar
- Sozlamalar

### 9-bosqich — Admin paneli
- Dashboard
- Savollar va media boshqaruvi
- Foydalanuvchilar va rollar
- Audit jurnali
- Sayt sozlamalari

### 10-bosqich — Testlash
- Unit testlar
- API testlari
- E2E testlar
- Ruxsatsiz kirish sinovlari
- Mobil va brauzer mosligi
- Performance va accessibility

### 11-bosqich — Deploy
- Production environment
- HTTPS
- Database migration
- Backup
- Monitoring
- Xavfsizlik headerlari
- Qayta tiklash rejasi

### 12-bosqich — Keyingi imkoniyatlar
- Rus tili
- Tarif va to‘lovlar
- Telegram integratsiyasi
- Sertifikat yoki natija PDF
- Tavsiya algoritmi
- Mobil ilova uchun API
- DRM yoki kuchliroq video himoyasi

---

## 14. MVP — birinchi ishga tushadigan versiya

Birinchi versiyada eng zarur funksiyalar:
1. Bosh sahifa
2. Login/register
3. Test kategoriyalari
4. Rasmli savollar va javoblar
5. Mashq va imtihon rejimi
6. Natijalar sahifasi
7. Foydalanuvchi kabineti
8. Savol va kategoriya boshqaradigan admin paneli
9. Private media saqlash
10. Tun/kun rejimi
11. Asosiy xavfsizlik va backup
12. Mobilga mos dizayn

MVP to‘liq testdan o‘tgandan keyin video darslar, pullik kontent va murakkab analitikani qo‘shish mumkin.

---

## 15. Qabul qilish mezonlari

Loyiha tayyor deb hisoblanishi uchun:
- Barcha asosiy sahifalar ishlashi.
- Mobil va desktop dizayni buzilmasligi.
- Tun/kun rejimi to‘g‘ri ishlashi va tanlov saqlanishi.
- Foydalanuvchi faqat o‘z ma’lumotlarini ko‘rishi.
- Admin sahifalariga oddiy foydalanuvchi kira olmasligi.
- Test natijasi serverda hisoblanishi.
- Maxfiy fayllar ochiq URL bilan olinmasligi.
- Vaqtinchalik media ruxsati muddati tugagach ishlamasligi.
- Fayl yuklash validatsiyadan o‘tishi.
- Backupdan tiklash amaliyoti bajarilgan bo‘lishi.
- Muhim oqimlar uchun avtomatik testlar bo‘lishi.
- Ishga tushirish va sozlash bo‘yicha README yozilgan bo‘lishi.

---

# 16. AI dasturchi uchun asosiy prompt

Quyidagi promptni AI kod yozish vositasiga bering. Uni bir urinishda butun loyihani yozishga majburlash o‘rniga, bosqichma-bosqich bajarishni talab qiling.

## MASTER PROMPT

Sen tajribali full-stack dasturchi, tizim arxitektori, UI/UX dizayner va application security mutaxassisi sifatida ishlaysan. “E-Avto” nomli haydovchilik nazariy imtihoniga tayyorlovchi professional veb-platformani ishlab chiq.

### Texnologiyalar
- TypeScript
- Next.js App Router
- React
- Tailwind CSS
- shadcn/ui yoki mos accessible komponentlar
- PostgreSQL
- Prisma yoki Drizzle ORM
- Zod
- Ishonchli autentifikatsiya yechimi
- Private object storage
- Himoyalangan video streaming xizmati
- Vitest va Playwright

### Majburiy mahsulot talablari
1. O‘zbekcha (lotin) interfeys.
2. Kun va tun rejimi; rang tokenlari markazlashgan bo‘lsin.
3. Responsive dizayn.
4. Bosh sahifa, testlar, yo‘l qoidalari, yo‘l belgilari, videodarslar va aloqa sahifalari.
5. Login, register, profil va foydalanuvchi kabineti.
6. Mashq va imtihon rejimi.
7. Rasmli savollar, javob izohlari, natijalar tarixi va xatolar tahlili.
8. Admin paneli: savollar, kategoriyalar, media, foydalanuvchilar, rollar, hisobotlar va sozlamalar.
9. Private storage orqali rasmlar va hujjatlar.
10. Himoyalangan video playback.
11. Audit loglar, backup va xavfsizlik sozlamalari.
12. Kelajakda rus tili va boshqa imkoniyatlarni qo‘shishga mos arxitektura.

### Xavfsizlik qoidalari
- Har bir server endpointda autentifikatsiya va avtorizatsiyani tekshir.
- Admin menyusini yashirishni ruxsat tekshiruvi deb hisoblama.
- Barcha maxfiy kalitlarni serverda saqla.
- Parollarni ochiq matnda saqlama.
- Fayllarni public katalogga yoki ochiq storage bucketga joylashtirma.
- Fayl yuklashda MIME turi, hajmi va haqiqiy mazmunini tekshir.
- Ruxsatli foydalanuvchi uchun qisqa muddatli media tokenlari yarat.
- To‘g‘ri javob kalitlarini va natija hisoblashni frontendga ishonib topshirma.
- IDOR, XSS, CSRF, SQL injection, brute force va ruxsatsiz fayl kirishiga qarshi himoya qil.
- Maxfiy ma’lumotlarni loglarga yozma.
- Har bir xavfsizlik talabi uchun test yoz.
- Brauzerda ko‘rsatilgan kontentni mutlaq himoyalash mumkin deb da’vo qilma.

### Ishlash tartibi
1. Avval talablarni qisqacha tahlil qil.
2. Papkalar strukturasini taklif qil.
3. Ma’lumotlar bazasi modelini va ruxsatlar matritsasini ishlab chiq.
4. Muhim arxitektura qarorlarini tushuntir.
5. Loyihani kichik, tekshiriladigan bosqichlarga ajrat.
6. Har bosqichda to‘liq ishlaydigan kod yoz.
7. Har bir faylning yo‘lini ko‘rsat.
8. Kerakli paketlar va buyruqlarni aniq ber.
9. `.env.example` yarat, ammo haqiqiy secretlarni yozma.
10. Migratsiyalar va xavfsiz seed ma’lumotlarini yarat.
11. Unit, API va E2E testlarini yoz.
12. Har bosqich oxirida lint, type-check va testlarni ishga tushirish yo‘lini ko‘rsat.
13. Xatolarni yashirma va ishlamaydigan kodni tayyor deb e’lon qilma.
14. README, lokal ishga tushirish, deploy va backup ko‘rsatmalarini yoz.
15. Avval MVP’ni yakunla, keyin qo‘shimcha funksiyalarni qo‘sh.

### Birinchi javobda nima qilishing kerak?
Darhol hamma kodni bir joyga yozma. Avval:
- papkalar strukturasini;
- ma’lumotlar bazasi ER modelini;
- rollar va ruxsatlar jadvalini;
- sahifalar xaritasini;
- asosiy xavfsizlik xavflari va himoyalarini;
- ishlab chiqish bosqichlarini;
- birinchi bosqich uchun aniq terminal buyruqlarini
taqdim et. So‘ng birinchi bosqichni bajarishga o‘t.

---

## 17. Har bir bosqich uchun qo‘shimcha promptlar

### A. Arxitektura prompti
“E-Avto uchun Next.js App Router, TypeScript, PostgreSQL va ORM asosida papkalar strukturasini, ER diagrammani, API guruhlarini va RBAC ruxsatlar matritsasini ishlab chiq. Maxfiy ma’lumotlar oqimini va media faylga kirish tekshiruvini ko‘rsat. Kod yozishdan oldin qarorlar va xavflarni tushuntir.”

### B. Dizayn prompti
“E-Avto uchun professional, responsive UI yarat. Kun rejimida fon `#F8FAFC`, karta `#FFFFFF`, matn `#0F172A`, asosiy rang `#2563EB`; tun rejimida fon `#0B1220`, karta `#111827`, matn `#F8FAFC`, asosiy rang `#60A5FA` bo‘lsin. Ranglarni CSS variables yoki theme tokens orqali boshqar. WCAG kontrastini, klaviatura navigatsiyasini, loading, empty, error va mobile holatlarini hisobga ol.”

### C. Test tizimi prompti
“Test kategoriyalari, mavzular, savollar va javob variantlarini yaratish hamda boshqarish tizimini ishlab chiq. Test sessiyasi serverda boshqarilsin. Javoblar va natijalar serverda tekshirilsin. Savol holatlari, vaqt cheklovi, testni yakunlash, natija tafsilotlari, xatolarni qayta ishlash va avtomatik testlarni qo‘sh.”

### D. Media xavfsizligi prompti
“Rasm, PDF va video uchun private media arxitekturasini yarat. Maxfiy fayllar public papkada saqlanmasin. Adminning ruxsati serverda tekshirilsin. Fayl turi, hajmi va mazmuni validatsiya qilinsin. Storage key ma’lumotlar bazasida saqlansin. Foydalanuvchi ruxsati tekshirilgandan keyin qisqa muddatli signed URL yoki video token berilsin. Ruxsatsiz kirish, muddati o‘tgan token va boshqa foydalanuvchining media ID sini ishlatish holatlarini test qil.”

### E. Admin paneli prompti
“RBAC bilan himoyalangan admin paneli yarat. Dashboard, savollar, kategoriyalar, mavzular, media kutubxonasi, foydalanuvchilar, rollar, natijalar, audit log va sozlamalar bo‘limlari bo‘lsin. Barcha amallar serverda ruxsat tekshiruvidan o‘tsin. O‘chirishdan oldin tasdiqlash, qidiruv, filter va sahifalash qo‘sh.”

### F. Xavfsizlik auditi prompti
“E-Avto kodini xavfsizlik nuqtayi nazaridan tekshir. Autentifikatsiya, avtorizatsiya, IDOR, XSS, CSRF, SQL injection, rate limiting, fayl yuklash, signed URL, token muddati, secretlar, loglar, backup va admin vakolatlarini tekshir. Har bir topilmani xavf darajasi, ta’siri, takrorlash qadamlari va tuzatish yo‘li bilan yoz. Sinov natijalarini uydirma; bajarilmagan testni bajarilgan deb ko‘rsatma.”

---

## 18. Papkalar strukturasi uchun boshlang‘ich namuna

```text
e-avto/
├── public/
│   ├── icons/
│   └── branding/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── categories/
│   │   │   ├── rules/
│   │   │   ├── road-signs/
│   │   │   ├── lessons/
│   │   │   ├── videos/
│   │   │   └── contact/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── dashboard/
│   │   ├── tests/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── privacy/
│   │   └── terms/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── tests/
│   │   └── media/
│   ├── features/
│   │   ├── auth/
│   │   ├── questions/
│   │   ├── tests/
│   │   ├── media/
│   │   ├── users/
│   │   └── admin/
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── storage/
│   │   ├── validation/
│   │   ├── permissions/
│   │   └── security/
│   ├── server/
│   │   ├── services/
│   │   └── repositories/
│   ├── styles/
│   └── types/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

Bu struktura boshlang‘ich namuna. Tanlangan Next.js versiyasi va arxitekturaga qarab ayrim papkalar o‘zgarishi mumkin. Maxfiy fayllar `public/` ichiga joylashtirilmasin.

---

## 19. Yakuniy eslatmalar

- Avval MVP’ni ishga tushiring; barcha imkoniyatlarni bir vaqtda yozish loyiha murakkabligini oshiradi.
- Rasm va videolarni kod repozitoriyga joylashtirmang; media storage ishlating.
- Test savollarining manbasi va foydalanish huquqlarini tekshiring.
- Maxfiylik siyosati, foydalanish shartlari va ma’lumotlarni saqlash qoidalarini yozing.
- Production ishga tushirishdan oldin xavfsizlik tekshiruvi va backup tiklash sinovini bajaring.
- Hosting, storage va video xizmatining narxlari foydalanish hajmiga qarab o‘zgaradi; ishlab chiqarishga chiqarishdan oldin joriy tariflarni tekshiring.

**E-Avto uchun yakuniy tavsiya:** TypeScript + Next.js + PostgreSQL, rasmlar uchun private object storage, videolar uchun token bilan himoyalangan streaming va barcha muhim ruxsatlarni serverda tekshirish.


Ha, albatta. Siz aytgan barcha qo‘shimchalarni birlashtirib, E-Avto loyihasining kengaytirilgan 2-versiya texnik topshirig‘ini tayyorladim. Unda oddiy test saytidan tashqari, kurslar, to‘lovlar, o‘qituvchilar, o‘quvchilar va yo‘qlama tizimi ham bor.

E-Avto — To‘liq texnik topshiriq v2

Markdown (.md) · 22 ta bo‘lim · AI promptlar bilan

📄 To‘liq hujjatni yuklab olish

Asosiy promptni nusxalash

## Hujjatga qo‘shilgan yangi imkoniyatlar

1\. To‘lov va kurs narxlari

- Kurslarni bepul yoki pullik qilish.
- Narxlar, chegirmalar va promokodlar.
- Payme, Click yoki boshqa provayderni ulash uchun arxitektura.
- To‘lov tarixi, muvaffaqiyatsiz to‘lovlar va qaytarimlar.

2\. O‘qituvchi kabineti

- O‘qituvchi profili va biriktirilgan guruhlar.
- O‘quvchilar ro‘yxati.
- Dars jadvali, materiallar va topshiriqlar.
- O‘quvchilarning natijalari va progressi.

3\. Yo‘qlama — davomat tizimi

- Qatnashdi, kelmadi, kechikdi va uzrli sabab statuslari.
- O‘qituvchi tomonidan davomatni belgilash.
- O‘quvchining o‘z davomat tarixini ko‘rishi.
- Guruhlar bo‘yicha foizlar, hisobotlar va o‘zgarishlar tarixi.

4\. To‘liq boshqariladigan admin paneli

- Kurslar, narxlar, sahifalar, bannerlar va menyular.
- O‘qituvchilar, o‘quvchilar, guruhlar va jadval.
- Savollar, videolar, rasmlar va boshqa materiallar.
- Rollar, hisobotlar, bildirishnomalar va sayt sozlamalari.

## Ishlab chiqish tartibi

Men loyihani quyidagi ketma-ketlikda qurishni tavsiya qilaman:

1. Sayt dizayni va tun/kun rejimi.
2. Ro‘yxatdan o‘tish, login va rollar.
3. Admin paneli va kurslarni boshqarish.
4. O‘qituvchilar, guruhlar va dars jadvali.
5. Yo‘qlama va davomat hisobotlari.
6. To‘lov tizimi va kursga kirish huquqi.
7. Testlar, natijalar va videodarslar.
8. Xavfsizlik, sinovlar va internetga joylashtirish.

Muhim: hujjatda kurs narxlari uchun keltirilgan summalar faqat namunadir. Haqiqiy narxlarni siz belgilaysiz. To‘lov provayderi ham ulanishdan oldin tanlanishi kerak.

Keyingi bosqichda ushbu hujjat asosida E-Avto’ning ishlaydigan kodini yaratishni boshlash mumkin.

# E-Avto loyihasi uchun to‘liq AI prompt, struktura va ketma-ketlik

Sizga E-Avto — avtomaktab va haydovchilik imtihonlariga tayyorlanish platformasini noldan boshlab to‘liq ishlaydigan holatga keltirish uchun AI dasturlash vositasiga beriladigan promptlar to‘plamini tuzib beraman.

Buni bitta juda katta prompt bilan emas, bosqichma-bosqich bajartirish ma’qul. Shunda AI har bir modulni yaratadi, tekshiradi va keyingi modulga o‘tadi. Loyihada oddiy sahifalar emas, balki haqiqiy ma’lumotlar bazasi, ro‘yxatdan o‘tish, kirish, to‘lov, kurslar, o‘qituvchilar, davomat va boshqaruv paneli bo‘ladi.

## 1. Loyiha oxirida nimalar ishlashi kerak?

[Driving Admin Dashboard :: Behance](https://images.openai.com/static-rsc-4/scHo3b7MmO7RPAAyCvJOs2JmhT9eoaCPncxvz_GVVnA4voQka4XzBgXNy2xjCKrShYvtsuqVpajCtcvMYj9xLHUVi1VIglpHH0cuIwwQit6ckcSTfr6plF_yND3sgUL3mVB_er4MnDCiEQyYvnOYuT0zqovDS6uhRT_8D9x2kOo?purpose=inline)

1\. Ochiq sayt

Bosh sahifa, kurslar, narxlar, o‘qituvchilar, yangiliklar, aloqa, FAQ va ro‘yxatdan o‘tish.

[Online Course Student Dashboard by Ronas IT | UI/UX Team on Dribbble](https://images.openai.com/static-rsc-4/VDXCxmQEe5NLnVjrgGNlmNPVXn-yLYv_Xx7HvQT8mJpT3wA30rOx_qr82g-OpR6Cetxq5e2VmkwBDSJUORJVtuFMyEXdHlfNxmk6powc8lf7Rj3fpeJX1w0xJGQ4-uMWw73T0hgCkQSG9j2tMmkrlHqCcm1cCGxsHUD6_J7I6sc?purpose=inline)

2\. O‘quvchi kabineti

Kurs sotib olish, to‘lov holati, video darslar, testlar, natijalar, jadval va o‘z davomatini ko‘rish.

[Edudash - School College & LMS Admin Dashboard Vue JS Template by wowtheme7](https://images.openai.com/static-rsc-4/j9xR9PYJEjSv24-Jgam08Jn00QbCQC5glinHewQJlU1Tl2Yd1cHreivp4c47X38ttvozsbafm--hV7LYoJqztNVfMc2QvQtbxrYyxIBsnoEaD2VPK3IwrcIAmUVGoIdY5r7AYQ-R2GwL8vPCTXsEJV6PKCsvlRgg2Pg7e_MTYJc?purpose=inline)

3\. O‘qituvchi kabineti

Biriktirilgan guruhlar, dars jadvali, o‘quvchilar ro‘yxati, davomat belgilash va dars natijalarini kiritish.

[10 Bootstrap Admin Panel Templates 2026 - AdminLTE.IO](https://images.openai.com/static-rsc-4/Ndaw91DQcTDL33K5IGlC7PtsQBbyN4DdD3EuOZXyqgizdEJeFTMNoIJ__4MT5tqyt6MNxnGpuXGEdVLN8HH8yrtYOWgn-K9kGRvI4P90_QwjdHPWkTjPF-kL3AuZDLgT-Lj27DLE7LkrRf_Fx6q0ieivpLeKnEvUeodA1hZHZC4?purpose=inline)

4\. Admin paneli

Narxlar, kurslar, o‘qituvchilar, guruhlar, to‘lovlar, sahifalar, test savollari, ranglar, rasmlar va boshqa sozlamalarni kodni o‘zgartirmasdan boshqarish.

Muhim: quyidagi promptlar faqat dizayn yasash uchun emas. AI'dan frontend + backend + ma’lumotlar bazasi + xavfsizlik + testlar + ishga tushirish yo‘riqnomasi talab qilinadi.

## 2. To‘liq promptlar fayli

Men siz uchun barcha promptlarni bitta Markdown (`.md`) hujjatiga joyladim. Uni yuklab olib, WPS Office yoki VS Code orqali ochishingiz mumkin.

E-Avto — To‘liq AI promptlar va ketma-ketlik

Markdown hujjati · 29 bo‘lim · 18 ta asosiy prompt

Faylni yuklab olish

Hujjat ichida quyidagilar bor:

- 18 ta bosqich uchun tayyor AI promptlar.
- Saytning barcha asosiy sahifalari va URL strukturasi.
- Ma’lumotlar bazasi va papkalar strukturasi.
- Ro‘yxatdan o‘tish, login va rollar.
- Kurslar, narxlar, chegirmalar va to‘lovlar.
- O‘quvchi va o‘qituvchi kabinetlari.
- Guruhlar, jadval va davomat tizimi.
- Himoyalangan video va fayllar.
- Testlar va imtihon moduli.
- Admin panel orqali kodsiz boshqaruv.
- Xavfsizlik, testlash va hostingga chiqarish.

## 3. Qaysi tartibda bajarish kerak?

1. Prompt 1–4: arxitektura, loyiha poydevori, ma’lumotlar bazasi, login va rollar.
2. Prompt 5–7: ochiq sayt, kurslar, narxlar, buyurtmalar va to‘lovlar.
3. Prompt 8–12: o‘quvchi kabineti, o‘qituvchi, guruhlar, davomat, video va testlar.
4. Prompt 13–15: admin panel, bildirishnomalar va hisobotlar.
5. Prompt 16–18: xavfsizlik auditi, barcha testlar va productionga chiqarish.

Eng muhim maslahat: birinchi navbatda Prompt 1 ni AI dasturlash vositasiga yuboring. U reja tuzib bo‘lgach, Prompt 2 ga o‘ting. Har bir bosqich ishlayotganini tekshirmasdan keyingisiga o‘tmang.

To‘lov tizimi uchun haqiqiy merchant akkaunti va maxfiy kalitlar, saytni internetga chiqarish uchun esa hosting va domen alohida sozlanadi. Bular tayyor bo‘lmaguncha AI faqat test muhitini yaratishi kerak, haqiqiy to‘lov ishlayapti deb ko‘rsatmasligi lozim.