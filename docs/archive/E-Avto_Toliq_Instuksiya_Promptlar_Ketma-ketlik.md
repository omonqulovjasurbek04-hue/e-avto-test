### Kerakli skillar va qo'shimchlar ni uchun papka yo'nalish: "C:\Users\Admin\Documents\GitHub\AI-Prompt-and-Dars\Dasturchi"

# E-AVTO LOYIHASI — TO‘LIQ ISHLAB CHIQISH INSTRUKSIYASI
## Talablar, arxitektura, papkalar, AI promptlar, ketma-ketlik, test va ishga tushirish

**Hujjat turi:** loyiha uchun to‘liq texnik yo‘riqnoma  
**Loyiha nomi:** E-Avto  
**Asosiy maqsad:** avtomaktab kurslari, haydovchilik nazariy testlari, o‘quvchi kabineti, o‘qituvchi kabineti, davomat, buyurtma/to‘lov va to‘liq boshqariladigan admin panelga ega web-platforma yaratish.

> **Ishlashning asosiy qoidasi:** ushbu hujjatdagi promptlarni AI coding vositasiga bittadan yuboring. Bir bosqichni tekshirmasdan keyingisiga o‘tmang. AI faqat maket yaratib, uni tayyor tizim deb ko‘rsatmasligi kerak. Har bir funksiya real backend, ma’lumotlar bazasi va ruxsat tekshiruvlari bilan ishlashi lozim.

---

# MUNDARIJA

1. Loyihaning maqsadi va natijasi
2. Foydalanuvchi rollari va ruxsatlar
3. Sayt sahifalari va URL manzillari
4. Funksional talablar
5. Texnologiyalar va arxitektura
6. Papkalar strukturasi
7. Ma’lumotlar bazasi obyektlari
8. UI/UX va ranglar
9. AI bilan ishlash qoidalari
10. Prompt 01 — Loyihani audit qilish va rejalashtirish
11. Prompt 02 — Loyiha poydevori va dizayn tizimi
12. Prompt 03 — Ma’lumotlar bazasi
13. Prompt 04 — Login, register va rollar
14. Prompt 05 — Ochiq sayt va CMS
15. Prompt 06 — Kurslar, paketlar, narxlar va chegirmalar
16. Prompt 07 — Buyurtma va to‘lovlar
17. Prompt 08 — O‘quvchi kabineti
18. Prompt 09 — O‘qituvchi, guruhlar va jadval
19. Prompt 10 — Davomat tizimi
20. Prompt 11 — Video va fayllar xavfsizligi
21. Prompt 12 — Testlar va imtihonlar
22. Prompt 13 — To‘liq admin panel
23. Prompt 14 — Bildirishnomalar
24. Prompt 15 — Hisobotlar va audit jurnali
25. Prompt 16 — Xavfsizlik auditi
26. Prompt 17 — Testlash va qabul qilish
27. Prompt 18 — Hostingga chiqarish
28. Har bosqich uchun umumiy tekshiruv prompti
29. Xatolarni tuzatish prompti
30. Ishlab chiqish ketma-ketligi
31. Productionga tayyorlik checklisti
32. Loyiha egasi belgilaydigan biznes qarorlari
33. AI coding vositasida amaliy ish boshlash
34. Yakuniy qoidalar

---

# 1. LOYIHANING MAQSADI VA NATIJASI

E-Avto quyidagi vazifalarni bajarishi kerak:

- Mehmonlar kurslar, narxlar, o‘qituvchilar va sayt ma’lumotlarini ko‘rishi.
- Foydalanuvchi ro‘yxatdan o‘tishi, tizimga kirishi va profilini boshqarishi.
- O‘quvchi kurs tanlashi, buyurtma berishi va to‘lov holatini ko‘rishi.
- To‘lov tasdiqlangach, o‘quvchiga kerakli kursga kirish huquqi berilishi.
- O‘quvchi video darslar, o‘quv materiallari va nazariy testlardan foydalanishi.
- O‘quvchi o‘z natijalari, jadvali, to‘lovlari va davomatini ko‘rishi.
- O‘qituvchi faqat o‘ziga biriktirilgan guruhlar va o‘quvchilarni boshqarishi.
- O‘qituvchi dars jadvalini ko‘rishi va davomat belgilashi.
- Administrator kurs, narx, chegirma, o‘qituvchi, guruh, jadval, dars, test, media, sayt sahifalari va sozlamalarni kodga tegmasdan boshqarishi.
- Superadmin tizimning eng yuqori darajadagi rollari va xavfsizlik sozlamalarini boshqarishi.
- To‘lovlar, davomat va muhim admin amallari audit jurnalida saqlanishi.
- Sayt telefon, planshet va kompyuterda ishlashi.
- Light mode va dark mode bo‘lishi.

## 1.1. “To‘liq ishlaydi” degani

Quyidagilarni alohida farqlang:

- **UI maket:** ko‘rinishi tayyor, ammo backendga ulanmagan bo‘lishi mumkin.
- **Demo:** test ma’lumotlari bilan ishlaydi, lekin real foydalanuvchilar uchun tayyor emas.
- **Integratsiya qilingan modul:** backend va ma’lumotlar bazasi bilan ishlaydi.
- **Productionga tayyor modul:** ruxsat tekshiruvlari, xatolarni boshqarish, testlar, loglar va deploy sozlamalari bilan tekshirilgan.

AI modulning holatini rost ko‘rsatishi shart. Demo yoki mock integratsiyani productionga tayyor deb aytmasin.

---

# 2. FOYDALANUVCHI ROLLARI VA RUXSATLAR

## 2.1. Mehmon (`guest`)

- Ochiq sahifalarni ko‘rish.
- Kurslar va narxlar bilan tanishish.
- O‘qituvchilar ro‘yxatini ko‘rish.
- FAQ va yangiliklarni o‘qish.
- Ro‘yxatdan o‘tish va tizimga kirish.
- Aloqa formasini yuborish.

Mehmon o‘quvchi kabineti, to‘lovlar, test natijalari, shaxsiy ma’lumotlar yoki private videolarga kira olmasligi kerak.

## 2.2. O‘quvchi (`student`)

- Shaxsiy profilini ko‘rish va ruxsat etilgan maydonlarni yangilash.
- Kurslar va xarid qilingan paketlarni ko‘rish.
- Buyurtma va to‘lov holatini ko‘rish.
- To‘lovdan keyin ruxsat etilgan darslarni ochish.
- Test topshirish va natijalarni ko‘rish.
- Jadval va davomatni ko‘rish.
- Bildirishnomalarni ko‘rish.
- Ruxsat berilgan materiallarni ochish.

O‘quvchi boshqa o‘quvchining ma’lumotlarini URL yoki API so‘rovini o‘zgartirish orqali ham ko‘ra olmasligi kerak.

## 2.3. O‘qituvchi (`teacher`)

- O‘z profilini ko‘rish.
- O‘ziga biriktirilgan guruhlarni ko‘rish.
- Biriktirilgan guruhlardagi o‘quvchilar ro‘yxatini ko‘rish.
- Dars jadvalini ko‘rish.
- Ruxsat doirasida dars mavzusi va holatini belgilash.
- Davomat sessiyasini yuritish.
- Ruxsat berilgan o‘quv natijalari yoki hisobotlarini ko‘rish.

O‘qituvchi boshqa o‘qituvchining guruhini, begona o‘quvchilarni, barcha to‘lovlarni yoki admin sozlamalarini boshqara olmasligi kerak.

## 2.4. Moderator (`moderator`)

- Ruxsat berilgan sahifalar, FAQ, yangiliklar yoki test savollarini ko‘rib chiqish.
- Murojaat va izohlarni boshqarish.
- Ruxsat doirasida kontentni draft holatiga o‘tkazish yoki tasdiqlash.

Moderatorga moliyaviy yoki superadmin huquqlarini bermang, agar biznes talabi buni aniq talab qilmasa.

## 2.5. Moliya xodimi (`finance`)

- Buyurtmalar va to‘lovlarni ko‘rish.
- To‘lov holatlarini tekshirish.
- Ruxsat etilgan hisobotlarni olish.
- Refund jarayonini vakolat va provayder qoidalari doirasida boshlash yoki ko‘rib chiqish.

Moliya xodimi parollarni, autentifikatsiya tokenlarini yoki keraksiz shaxsiy ma’lumotlarni ko‘rmasligi kerak.

## 2.6. Administrator (`admin`)

- Kurs va paketlar.
- Narxlar va chegirmalar.
- Foydalanuvchilar va o‘qituvchilar.
- Guruhlar, darslar va jadval.
- Davomat.
- Testlar va savollar.
- Video va fayllar.
- Ochiq sahifalar, yangiliklar va FAQ.
- Bildirishnomalar.
- Saytning brend sozlamalari.
- Hisobotlar.
- Audit jurnali — ruxsat doirasida.

## 2.7. Superadmin (`superadmin`)

- Rollar va ruxsatlarni boshqarish.
- Tizim xavfsizligi va yuqori darajadagi sozlamalar.
- Admin vakolatlarini boshqarish.
- Integratsiyalar konfiguratsiyasining xavfsiz metadata qismini ko‘rish.
- Audit jurnali va tizim holatini tekshirish.

**Xavfsizlik qoidasi:** foydalanuvchi o‘zini o‘zi `admin` yoki `superadmin`ga aylantira olmasin. Rol berish faqat vakolatli server-side jarayon orqali bajarilsin.

---

# 3. SAYT SAHIFALARI VA URL MANZILLARI

## 3.1. Ochiq sayt

- `/` — bosh sahifa.
- `/courses` — barcha kurslar.
- `/courses/[slug]` — bitta kurs tafsiloti.
- `/pricing` — narxlar va paketlar.
- `/teachers` — o‘qituvchilar.
- `/about` — loyiha haqida.
- `/contact` — aloqa.
- `/faq` — savol-javoblar.
- `/news` — yangiliklar.
- `/news/[slug]` — yangilik tafsiloti.
- `/privacy` — maxfiylik siyosati.
- `/terms` — foydalanish shartlari.
- `/login` — tizimga kirish.
- `/register` — ro‘yxatdan o‘tish.
- `/forgot-password` — parolni tiklashni boshlash.
- `/reset-password` — yangi parol o‘rnatish.

## 3.2. O‘quvchi kabineti

- `/student` — boshqaruv paneli.
- `/student/profile` — profil.
- `/student/courses` — mening kurslarim.
- `/student/courses/[id]` — kurs ichidagi darslar.
- `/student/lessons/[id]` — dars tafsiloti.
- `/student/videos/[id]` — himoyalangan video dars.
- `/student/tests` — testlar ro‘yxati.
- `/student/tests/[id]` — test topshirish.
- `/student/results` — natijalar.
- `/student/schedule` — dars jadvali.
- `/student/attendance` — davomat.
- `/student/payments` — to‘lovlar.
- `/student/orders` — buyurtmalar.
- `/student/notifications` — bildirishnomalar.

## 3.3. O‘qituvchi kabineti

- `/teacher` — umumiy panel.
- `/teacher/profile` — profil.
- `/teacher/groups` — biriktirilgan guruhlar.
- `/teacher/groups/[id]` — guruh tafsiloti.
- `/teacher/students` — biriktirilgan o‘quvchilar.
- `/teacher/schedule` — jadval.
- `/teacher/lessons` — darslar.
- `/teacher/attendance` — davomat.
- `/teacher/reports` — ruxsat berilgan hisobotlar.

## 3.4. Admin paneli

- `/admin` — dashboard.
- `/admin/users` — foydalanuvchilar.
- `/admin/roles` — rollar va ruxsatlar.
- `/admin/courses` — kurslar.
- `/admin/course-packages` — paketlar.
- `/admin/pricing` — narxlar.
- `/admin/discounts` — chegirmalar.
- `/admin/coupons` — promo-kodlar.
- `/admin/orders` — buyurtmalar.
- `/admin/payments` — to‘lovlar.
- `/admin/refunds` — qaytarishlar.
- `/admin/teachers` — o‘qituvchilar.
- `/admin/groups` — guruhlar.
- `/admin/schedule` — jadval.
- `/admin/lessons` — darslar.
- `/admin/attendance` — davomat.
- `/admin/videos` — video/fayllar.
- `/admin/tests` — testlar.
- `/admin/question-bank` — savollar banki.
- `/admin/pages` — sahifalar.
- `/admin/news` — yangiliklar.
- `/admin/faq` — FAQ.
- `/admin/media` — media kutubxonasi.
- `/admin/notifications` — bildirishnomalar.
- `/admin/reports` — hisobotlar.
- `/admin/audit-logs` — audit jurnali.
- `/admin/settings` — sayt sozlamalari.
- `/admin/integrations` — integratsiya holatlari.

Har bir himoyalangan URL server-side authorization bilan himoyalanishi shart.

---

# 4. FUNKSIONAL TALABLAR

## 4.1. Ro‘yxatdan o‘tish va login

- Telefon yoki email orqali ro‘yxatdan o‘tish.
- Parolni xavfsiz xeshlash.
- Login/logout.
- Parolni unutganda xavfsiz tiklash.
- Sessionni boshqarish.
- Zarur bo‘lsa telefon/emailni tasdiqlash.
- Kirish urinishlariga rate limiting.
- Server-side validatsiya.
- Login xatolari maxfiy ma’lumotni oshkor qilmasin.

## 4.2. Kurslar va narxlar

- Kurs yaratish, tahrirlash, nashr qilish, yashirish va arxivlash.
- Kursga bir nechta paket biriktirish.
- Narx, valyuta va amal qilish davrini belgilash.
- Promo-kod va chegirmalar.
- Xarid paytidagi narx buyurtmada snapshot sifatida saqlanishi.
- Narxni server qayta hisoblash; brauzerdan kelgan summaga ishonmaslik.

## 4.3. To‘lovlar

- Buyurtma yaratish.
- Provider orqali to‘lov sessiyasini yaratish.
- Provider callback/webhook imzosini tekshirish.
- Idempotency: takroriy callback ikki marta hisoblanmasin.
- To‘lov statuslarini boshqarish.
- Faqat tasdiqlangan to‘lovdan keyin kursga kirish huquqini berish.
- Refund jarayonini provider imkoniyatiga mos qilish.
- Test muhitida sandbox ishlatish.

## 4.4. Davomat

Davomat statuslari:
- `present` — qatnashdi.
- `absent` — kelmadi.
- `late` — kechikdi.
- `excused` — uzrli sabab.
- `online` — masofadan qatnashdi, agar kurs uchun mos bo‘lsa.

Davomatni kim belgilagani, qachon o‘zgartirgani va o‘zgarish sababi audit jurnalida saqlanishi kerak.

## 4.5. Testlar

- Kategoriya va savollar banki.
- Javob variantlari.
- To‘g‘ri javob va izoh.
- Savolga rasm biriktirish.
- Vaqt limiti va urinishlar soni.
- O‘tish bali.
- Natijani serverda hisoblash.
- Javob kalitini test tugamaguncha clientga yubormaslik.

## 4.6. Media

- Ochiq rasmlar va himoyalangan videolarni ajratish.
- Private media public papkada saqlanmasin.
- Kirishdan oldin foydalanuvchi va kursga kirish huquqi tekshirilsin.
- Qisqa muddatli signed URL yoki token ishlatilsin.
- Fayl turi va hajmi tekshirilsin.
- Brauzerga ko‘rsatilgan kontentni mutlaq nusxalashdan himoya qilib bo‘lmaydi; watermark/DRM va private storage xavfni kamaytiradi, ammo to‘liq kafolat bermaydi.

---

# 5. TEXNOLOGIYALAR VA ARXITEKTURA

Quyidagi stack tavsiya etiladi. Mavjud loyiha boshqa mos stackda bo‘lsa, AI uni sababsiz qayta yozmasin.

- **Framework:** Next.js App Router.
- **Til:** TypeScript, strict mode.
- **UI:** Tailwind CSS va accessibility talablariga mos komponentlar.
- **Database:** PostgreSQL.
- **ORM:** Prisma yoki Drizzle — bittasini tanlab, izchil ishlatish.
- **Validation:** Zod yoki o‘xshash schema validation.
- **Auth:** xavfsiz server-side session yoki ishonchli auth kutubxonasi.
- **Media:** private object storage yoki himoyalangan media server.
- **Testing:** unit, integration va Playwright kabi E2E testlar.
- **Deployment:** PostgreSQL, HTTPS va private storage qo‘llaydigan hosting.

To‘lov providerini ulashdan oldin Payme, Click yoki tanlangan provayderning amaldagi rasmiy merchant/API hujjatlari tekshiriladi. API kalitlari faqat server muhitida saqlanadi.

---

# 6. TAVSIYA ETILADIGAN PAPKALAR STRUKTURASI

```text
e-avto/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── student/
│   ├── teacher/
│   ├── admin/
│   ├── api/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── forms/
│   ├── layout/
│   ├── public/
│   ├── student/
│   ├── teacher/
│   └── admin/
├── features/
│   ├── auth/
│   ├── users/
│   ├── courses/
│   ├── enrollments/
│   ├── payments/
│   ├── teachers/
│   ├── groups/
│   ├── attendance/
│   ├── tests/
│   ├── media/
│   ├── notifications/
│   └── reports/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── permissions/
│   ├── validation/
│   ├── payments/
│   ├── storage/
│   ├── logging/
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── SECURITY.md
│   ├── PAYMENTS.md
│   └── DEPLOYMENT.md
├── public/
│   └── brand/
├── .env.example
├── README.md
└── package.json
```

> Bu faqat namunaviy struktura. Tanlangan framework yoki ORM boshqacha fayl tuzilishini talab qilsa, uni moslashtirish mumkin. Private videolarni `public/` ichiga joylashtirmang.

---

# 7. MA’LUMOTLAR BAZASI OBYEKTLARI

AI quyidagi obyektlarni loyihalasin va ular orasidagi munosabatlarni migration orqali yaratsin:

- `User`
- `Role`
- `Permission`
- `UserRole`
- `StudentProfile`
- `TeacherProfile`
- `Course`
- `CoursePackage`
- `Price`
- `Discount`
- `Coupon`
- `CouponRedemption`
- `Enrollment`
- `Order`
- `OrderItem`
- `Payment`
- `PaymentEvent`
- `Refund`
- `TeacherGroup`
- `GroupMembership`
- `Lesson`
- `ScheduleSlot`
- `LessonMaterial`
- `AttendanceSession`
- `AttendanceRecord`
- `VideoAsset`
- `FileAsset`
- `MediaAccessLog`
- `Test`
- `Question`
- `AnswerOption`
- `TestAttempt`
- `TestAnswer`
- `Notification`
- `NotificationPreference`
- `Page`
- `NewsArticle`
- `FaqItem`
- `SiteSetting`
- `AuditLog`
- `SupportTicket` yoki `ContactMessage`

Ma’lumotlar yaxlitligi uchun:
- Foreign key va kerakli unique constraint ishlatilsin.
- Kerakli indekslar yaratilishi.
- Narx va pul summalari floating-point formatda saqlanmasin.
- Buyurtmada xarid paytidagi narx snapshoti saqlansin.
- To‘lovlar, davomat va audit tarixi muhim bo‘lsa, hard delete o‘rniga archive/soft delete qo‘llansin.
- Migration ma’lumotlarni yo‘qotish xavfini tug‘dirsa, AI buni oldindan ogohlantirsin.

---

# 8. UI/UX VA RANGLAR

## 8.1. Light mode

- Fon: `#F8FAFC`
- Kartalar: `#FFFFFF`
- Asosiy matn: `#0F172A`
- Ikkinchi matn: `#475569`
- Brend rangi: `#2563EB`
- Muvaffaqiyat: `#16A34A`
- Ogohlantirish: `#D97706`
- Xato: `#DC2626`
- Chegara: `#E2E8F0`

## 8.2. Dark mode

- Fon: `#0B1220`
- Kartalar: `#111827`
- Asosiy matn: `#F8FAFC`
- Ikkinchi matn: `#CBD5E1`
- Brend rangi: `#60A5FA`
- Chegara: `#334155`

## 8.3. UI talablari

- Responsive dizayn.
- Navigatsiya tushunarli bo‘lishi.
- Formlarda label va validatsiya xabarlari.
- Loading, empty, error va success holatlari.
- O‘chirishdan oldin tasdiqlash.
- Jadvalda qidiruv, filtr, tartiblash va pagination.
- Keyboard navigation va ko‘rinadigan focus holati.
- Kontrast va accessibility talablariga e’tibor.
- Logo, favicon va ranglar admin sozlamalaridan boshqariladigan bo‘lishi mumkin.
- Brend sozlamalari foydalanuvchi matni yoki xavfli HTML orqali XSSga yo‘l ochmasin.

---

# 9. AI BILAN ISHLASH QOIDALARI

Har bir promptni AI coding vositasiga alohida yuboring.

AI quyidagilarni bajarishi shart:
1. Avval mavjud fayllarni o‘qisin.
2. Mavjud kodni sababsiz qayta yozmasin.
3. Faqat tavsiya emas, real fayllarga kod yozsin.
4. Loyiha uchun zarur migrationlarni yaratsin.
5. Lint, typecheck va testlarni ishga tushirsin.
6. Xatolarni tuzatsin.
7. `.env.example`ni yangilasin, ammo secret qiymatlarni kiritmasin.
8. Ulanmagan xizmatni ishlayotgandek ko‘rsatmasin.
9. Xavfsizlik va ruxsat tekshiruvlarini serverda amalga oshirsin.
10. Har bosqich oxirida o‘zgargan fayllar, test natijalari va qolgan ishlarni sanab bersin.

---

# 10. PROMPT 01 — LOYIHANI AUDIT QILISH VA REJALASHTIRISH

Quyidagi matnni birinchi bo‘lib AI coding vositasiga yuboring:

```text
Sen katta tajribaga ega full-stack dasturchi, software architect va application security mutaxassisi sifatida ishlaysan. Men E-Avto nomli avtomaktab va haydovchilik nazariy test platformasini yaratmoqchiman.

Birinchi bosqichda kodni birdaniga yozib tashlama. Avval joriy repositoryni va barcha muhim fayllarni tekshir.

Loyiha talablari:
- Ochiq sayt: bosh sahifa, kurslar, narxlar, o‘qituvchilar, yangiliklar, FAQ, aloqa.
- Auth: register, login, logout, parolni tiklash, profil.
- Rollar: guest, student, teacher, moderator, finance, admin, superadmin.
- Kurslar, paketlar, narxlar, chegirmalar, promo-kodlar.
- Buyurtmalar, to‘lovlar va refund jarayoni.
- O‘quvchi kabineti.
- O‘qituvchi kabineti.
- Guruhlar, dars jadvali va davomat.
- Video darslar va private materiallar.
- Nazariy testlar, savollar banki va natijalar.
- Bildirishnomalar.
- Admin panel: yuqoridagi asosiy kontent va biznes ma’lumotlarini kod o‘zgartirmasdan boshqarish.
- Hisobotlar, audit jurnali, xavfsizlik va deployment.

Vazifalar:
1. Mavjud texnologiyalar va fayl tuzilmasini aniqlagin.
2. Mavjud kodning holatini va kamchiliklarini yoz.
3. Arxitektura, URLlar, rollar va permission modelini rejalashtir.
4. DB entity va munosabatlar ro‘yxatini tuz.
5. To‘lov, media, auth va davomat xavfsizlik chegaralarini tushuntir.
6. Ishlab chiqish bosqichlarini va acceptance criteria yoz.
7. README.md hamda docs/ARCHITECTURE.md, docs/IMPLEMENTATION_PLAN.md, docs/SECURITY.md uchun reja tayyorla.
8. Noaniq biznes qarorlarini alohida sanab ber.
9. Mavjud loyiha bo‘lsa, sababsiz qayta yaratma.
10. To‘lov providerini ulash uchun rasmiy hujjat va credential kerakligini hisobga ol.

Avval reja va tahlilni ko‘rsat. Hali kod yozishni boshlama. Noaniq savollarni eng muhimlaridan ber; javob bo‘lmasa, xavfsiz standartni tanlab hujjatlashtir.
```

### Prompt 01 natijasini tekshirish

- Arxitektura aniqmi?
- Rollar va ruxsatlar ajratilganmi?
- DB obyektlari sanalganmi?
- Bosqichlar tartibi tushunarlimi?
- Payment va media xavfsizligi hisobga olinganmi?

Reja maqbul bo‘lgach Prompt 02 ga o‘ting.

---

# 11. PROMPT 02 — LOYIHA POYDEVORI VA DIZAYN TIZIMI

```text
Tasdiqlangan reja asosida E-Avto loyihasining poydevorini yarat.

Talablar:
1. TypeScript strict mode ishlasin.
2. Mavjud loyihani saqlab, faqat zarur konfiguratsiyalarni yangila.
3. Ochiq sayt, auth, student, teacher va admin uchun mos layoutlar yarat.
4. Umumiy UI komponentlari: Button, Input, Select, Modal, Toast, Table, Pagination, Card, Badge, FormField, ConfirmDialog, LoadingState, EmptyState, ErrorState.
5. Tailwind CSS yoki tanlangan UI tizimida dizayn tokenlarini yarat.
6. Light/dark mode qo‘sh.
7. Responsive dizaynni telefon, planshet va desktopda tekshir.
8. Navigation, form label, focus state va rang kontrastini hisobga ol.
9. `.env.example`, README va development buyruqlarini tayyorla.
10. `lint`, `typecheck`, `test` va `build` scriptlarini sozla.
11. Hech qanday haqiqiy secretni repositoryga kiritma.
12. Hozircha integratsiya qilinmagan funksiyalarni “ishlaydi” deb ko‘rsatma.

Ishni bajargach, yaratilgan/o‘zgargan fayllarni sanab ber. Lint, typecheck va buildni ishga tushir; xatolarni tuzat.
```

### Qabul qilish sharti

- Sayt ishga tushadi.
- Asosiy layoutlar ko‘rinadi.
- Light/dark mode ishlaydi.
- Lint, typecheck va build xatosiz tugaydi yoki qolgan muammolar aniq hujjatlashtiriladi.

---

# 12. PROMPT 03 — MA’LUMOTLAR BAZASI

```text
E-Avto uchun real PostgreSQL ma’lumotlar bazasi qatlamini amalga oshir.

1. Tasdiqlangan arxitekturaga mos ORM tanla.
2. User, Role, Permission, UserRole, StudentProfile, TeacherProfile, Course, CoursePackage, Price, Discount, Coupon, CouponRedemption, Enrollment, Order, OrderItem, Payment, PaymentEvent, Refund, TeacherGroup, GroupMembership, Lesson, ScheduleSlot, AttendanceSession, AttendanceRecord, VideoAsset, FileAsset, Test, Question, AnswerOption, TestAttempt, TestAnswer, Notification, Page, NewsArticle, FaqItem, SiteSetting va AuditLog modellarini yarat.
3. Modellar orasidagi relation, foreign key, unique constraint va indekslarni qo‘sh.
4. Pul miqdori uchun floating-point ishlatma.
5. Buyurtmada xarid paytidagi narx va valyutani snapshot sifatida saqla.
6. Davomatda bir sessiya va o‘quvchi uchun bitta joriy qayd bo‘lishini ta’minla.
7. Payment eventlar uchun provider event ID yoki idempotency kalitidan foydalan.
8. Migratsiyalarni yarat.
9. Development uchun xavfsiz seed yaratilishi mumkin; productionda oldindan ma’lum parol bilan admin yaratma.
10. Default admin kerak bo‘lsa, credential environment orqali xavfsiz berilsin va birinchi kirishda parol almashtirish tartibi hujjatlashtirilsin.
11. DB service/repository qatlamlarini yarating.
12. Migration va model testlarini yoz.

Natijada schema, migratsiya va seed buyruqlarini READMEga yoz. Ma’lumotlarni yo‘qotishi mumkin bo‘lgan migratsiya oldidan ogohlantir.
```

---

# 13. PROMPT 04 — LOGIN, REGISTER VA ROLLAR

```text
E-Avto uchun xavfsiz authentication va authorization modulini amalga oshir.

Funksiyalar:
- Register.
- Login/logout.
- Profilni ko‘rish va yangilash.
- Parolni unutdim va reset token orqali tiklash.
- Kerak bo‘lsa email/telefon tasdiqlash.
- Session boshqaruvi.
- Rate limiting va brute-force himoyasi.
- Server-side validatsiya.
- Password hashing.
- Cookie ishlatilsa HttpOnly, Secure va SameSite sozlamalari.
- CSRF, XSS, session fixation va open redirect xavflarini ko‘rib chiq.

Role/permission:
- guest faqat ochiq sahifalarni ko‘radi.
- student faqat o‘z ma’lumotlariga kira oladi.
- teacher faqat o‘ziga biriktirilgan guruh va o‘quvchilarni boshqaradi.
- finance to‘lovlarni ruxsat doirasida ko‘radi.
- admin faqat o‘ziga berilgan boshqaruv huquqlariga ega.
- superadmin yuqori darajadagi ruxsatlarni boshqaradi.

Foydalanuvchi register formasida admin rolini tanlay olmasin. Har bir server endpointida authentication va authorization tekshirilsin. Frontendda menyuni yashirish yetarli emas.

Testlar:
- ruxsatsiz user admin endpointiga kira olmaydi.
- student boshqa student IDsi orqali ma’lumot ololmaydi.
- teacher begona guruhni boshqara olmaydi.
- role escalation ishlamaydi.
- password reset token muddati va bir martalik ishlatilishi tekshiriladi.

Xatolarni tuzatib, test natijalarini yoz.
```

---

# 14. PROMPT 05 — OCHIQ SAYT VA CMS

```text
E-Avto ochiq saytini real database bilan bog‘la.

Sahifalar:
- Bosh sahifa.
- Kurslar ro‘yxati va kurs tafsiloti.
- Narxlar.
- O‘qituvchilar.
- Biz haqimizda.
- Aloqa.
- FAQ.
- Yangiliklar va yangilik tafsiloti.
- Maxfiylik siyosati.
- Foydalanish shartlari.

Admin quyidagilarni kodga tegmasdan o‘zgartira olsin:
- Sarlavha va matnlar.
- Rasm va media.
- SEO title/description.
- Slug.
- Publish/draft status.
- Bosh sahifadagi banner va bloklar.
- Aloqa ma’lumotlari.
- FAQ va yangiliklar.

Talablar:
1. Draft kontent ommaga ko‘rinmasin.
2. Slug unikal bo‘lsin.
3. Kontakt formasi serverda validatsiya qilinsin va spam himoyasi bo‘lsin.
4. Rich text sanitizatsiya qilinsin.
5. SEO metadata, sitemap va robots qoidalarini sozla.
6. Loading, empty, error va success holatlari bo‘lsin.
7. Admin kontentni saqlagach, ochiq sahifada yangi ma’lumot aks etsin.
8. Qotib qolgan demo ma’lumotlar production sahifalarida qolmasin.

Testlarni yoz va ishga tushir.
```

---

# 15. PROMPT 06 — KURSLAR, PAKETLAR, NARXLAR VA CHEGIRMALAR

```text
E-Avto kurs va narxlar modulini to‘liq amalga oshir.

Admin imkoniyatlari:
- Kurs yaratish/tahrirlash/nashr qilish/yashirish/arxivlash.
- Nom, slug, tavsif, rasm, davomiylik va darslar tarkibi.
- Bir kursga bir nechta paket.
- Narx, valyuta, amal qilish davri va faol holat.
- Chegirma foiz yoki belgilangan summa sifatida.
- Promo-kodlar: amal qilish muddati, foydalanish limiti, minimal buyurtma va qo‘llanish qoidalari.
- Kursga yozilish shartlari.

Biznes qoidalari:
- Xarid paytidagi narx order item ichida saqlansin.
- Keyinchalik narx o‘zgarsa, oldingi buyurtma summasi o‘zgarmasin.
- Narx va chegirma serverda qayta hisoblanadi.
- Brauzer yuborgan summaga ishonilmaydi.
- Promo-kod parallel so‘rovlarda limitdan ortiq ishlatilmasin.
- Admin o‘zgarishlari audit logga yozilsin.
- Demo narxlar “namuna” deb belgilansin; haqiqiy narxni loyiha egasi/admin belgilaydi.

Testlar:
- narxni soxtalashtirish mumkin emas.
- expired coupon ishlamaydi.
- limit tugagan promo-kod qayta ishlamaydi.
- oldingi buyurtma snapshoti saqlanadi.
```

---

# 16. PROMPT 07 — BUYURTMA VA TO‘LOVLAR

```text
E-Avto uchun xavfsiz buyurtma va to‘lov jarayonini yarat.

To‘lov oqimi:
1. O‘quvchi kurs/paket tanlaydi.
2. Server joriy narx, kurs holati, chegirma va foydalanuvchi huquqini tekshiradi.
3. Server order va order item yaratadi.
4. Server provider payment session/invoice yaratadi.
5. Foydalanuvchi provider talab qilgan to‘lov jarayonidan o‘tadi.
6. Browserdagi success URL to‘lovni tasdiqlash uchun yetarli bo‘lmasin.
7. Faqat imzosi tekshirilgan server callback/webhook yoki provider status verification to‘lovni tasdiqlasin.
8. Takroriy callback idempotent qayta ishlansin.
9. Tasdiqlangan to‘lovdan keyingina enrollment/entitlement yaratiladi.
10. Failed, cancelled, expired, paid, refunded va partially refunded holatlari boshqarilsin.
11. Refund provider imkoniyatiga mos va ruxsat bilan bajarilsin.
12. Provider event ID, transaction ID, summa, valyuta va timestamp saqlansin.
13. Karta raqami, CVV yoki boshqa maxfiy karta ma’lumotlarini saqlama.
14. Admin qo‘lda status o‘zgartirsa, sabab va actor audit logga yozilsin.
15. Provider credentiallari `.env`da server-side bo‘lsin; kodga yozilmasin.

Payme/Click yoki tanlangan provayderning amaldagi rasmiy merchant/API hujjatlarini tekshir. Credential yoki sandbox mavjud bo‘lmasa, PaymentProvider interface va test mock yarat; real integratsiya tayyor deb da’vo qilma.

Testlarda:
- imzosi noto‘g‘ri callback rad qilinadi.
- bir callback qayta kelsa ikki marta order/enrollment yaratilmaydi.
- browser success URL yolg‘iz o‘zi paid status bera olmaydi.
- kursga kirish faqat tasdiqlangan to‘lovdan keyin beriladi.
```

## 16.1. Tavsiya etiladigan ichki payment statuslari

- `pending`
- `requires_action`
- `paid`
- `failed`
- `cancelled`
- `expired`
- `refunded`
- `partially_refunded`

Providerning o‘z statuslarini ichki standartga xaritalash kerak.

---

# 17. PROMPT 08 — O‘QUVCHI KABINETI

```text
E-Avto o‘quvchi kabinetini real database bilan ishlaydigan qilib yarat.

Dashboard:
- Faol kurslar.
- Keyingi dars.
- Test natijalari.
- Progress.
- Davomat statistikasi.
- Buyurtma va to‘lovlar.
- Yangi bildirishnomalar.

Kurs sahifasi:
- Modullar va darslar.
- Darsning ochiq/yopiq holati.
- Video/material.
- Darsni tugatish belgilari, agar kurs qoidasi ruxsat bersa.
- Testlar va topshiriqlarga havolalar.

Xavfsizlik:
- O‘quvchi faqat o‘z ma’lumotlarini ko‘rsin.
- Kursga kirish serverda Enrollment/Payment holatlari orqali tekshirilsin.
- Frontend tugmasini yashirishning o‘zi yetarli emas.
- Boshqa o‘quvchining IDsi bilan ma’lumot olishga qarshi test yoz.
- Bo‘sh holatlarda tushunarli xabar ko‘rsat.
- Fake progress yoki soxta payment status ishlatma.

Mobil dizayn va accessibility talablariga rioya qil.
```

---

# 18. PROMPT 09 — O‘QITUVCHI, GURUHLAR VA JADVAL

```text
E-Avto o‘qituvchi kabineti, guruh va jadval modulini yarat.

Admin:
- O‘qituvchi yaratish yoki mavjud foydalanuvchiga teacher rolini berish.
- O‘qituvchi profilini va faol holatini boshqarish.
- Guruh yaratish, nomi, kursi, boshlanish/tugash sanasi va sig‘imini belgilash.
- O‘qituvchini guruhga tayinlash.
- O‘quvchilarni guruhga qo‘shish/chiqarish.
- Dars vaqti, davomiyligi, xona yoki onlayn havola.
- Jadval to‘qnashuvlarini tekshirish.
- Guruhni arxivlash.

O‘qituvchi:
- Faqat o‘ziga biriktirilgan guruhlarni ko‘rsin.
- Guruhdagi o‘quvchilar va jadvalni ko‘rsin.
- Ruxsat doirasida dars mavzusi va holatini belgilasin.
- Ruxsatsiz to‘lovlar, kurs narxi yoki boshqa guruhni boshqarmasin.

Qo‘shimcha:
- Sana, vaqt va timezone qoidalarini hujjatlashtir.
- Takroriy darslarni qo‘llab-quvvatla.
- Guruh sig‘imi va duplicate membershipni tekshir.
- Jadval o‘zgarsa, bildirishnoma yuborish imkonini tayyorla.
- Authorization va jadval to‘qnashuvlari uchun test yoz.
```

---

# 19. PROMPT 10 — DAVOMAT TIZIMI

```text
E-Avto uchun to‘liq davomat tizimini yarat.

Statuslar:
- present — qatnashdi.
- absent — kelmadi.
- late — kechikdi.
- excused — uzrli sabab.
- online — masofadan qatnashdi, faqat tegishli darslar uchun.

Oqim:
1. Vakolatli o‘qituvchi yoki admin dars sessiyasini yaratadi.
2. Sessiyaga tegishli guruh a’zolari olinadi.
3. Har bir o‘quvchi uchun davomat belgilanadi.
4. Saqlashdan oldin o‘zgarishlar ko‘rsatiladi.
5. Tasdiqlangach DBga yoziladi.
6. O‘quvchi kabinetidagi davomat yangilanadi.
7. Keyingi tahrir faqat ruxsatli shaxs tomonidan bajariladi.
8. Tahrir sababi, actor, oldingi va yangi qiymat audit logga yoziladi.
9. Bir sessiyada bir o‘quvchi uchun bitta joriy attendance record bo‘lsin.
10. O‘qituvchi boshqa guruh davomatini belgilay olmasin.
11. Kelmagan o‘quvchiga bildirishnoma yuborish sozlamasi bo‘lsin.
12. Hisobotda jami dars, qatnashdi, kelmadi, kechikdi va uzrli holatlar ko‘rinsin.
13. Bekor qilingan darslar davomat foizining maxrajiga kiritilmasin.
14. CSV/Excel eksporti faqat ruxsatli rollarga berilsin.

Davomat yaratish, tahrirlash, ruxsat va hisob-kitob uchun test yoz.
```

---

# 20. PROMPT 11 — VIDEO VA FAYLLAR XAVFSIZLIGI

```text
E-Avto video va kurs materiallari uchun private media tizimini yarat.

1. Himoyalangan videolar public/static papkada saqlanmasin.
2. Private object storage yoki autentifikatsiyalangan media serverdan foydalan.
3. Har bir media so‘rovida login, kursga yozilganlik, payment/enrollment holati va video ruxsatini serverda tekshir.
4. Qisqa muddatli signed URL yoki token ishlat.
5. URL muddati va ruxsat doirasini minimal qil.
6. Doimiy public video URLlarini HTMLga joylashtirma.
7. Upload paytida fayl hajmi, MIME, haqiqiy format va ruxsat etilgan kengaytmani tekshir.
8. Xavfsiz bo‘lsa antivirus/malware scan qo‘sh.
9. Admin video yuklash, almashtirish, arxivlash va kursga biriktirish imkoniga ega bo‘lsin.
10. CDN cache private kontentni boshqa foydalanuvchilarga bermasligi kerak.
11. Media access logda zarur minimum metadata saqlansin.
12. Kerak bo‘lsa watermark qo‘sh.
13. Ruxsatsiz foydalanuvchi video/faylni API orqali ololmasligini test qil.

Muhim cheklov: brauzerga ko‘rsatilgan video yoki rasmni mutlaq nusxalashdan himoya qilishning iloji yo‘q. Private storage, qisqa muddatli token, watermark va kerak bo‘lsa litsenziyalangan DRM noqonuniy ko‘chirishni kamaytiradi, ammo 100% kafolat bermaydi. Bu cheklovni hujjatlashtir.
```

---

# 21. PROMPT 12 — TESTLAR VA IMTIHON MODULI

```text
E-Avto haydovchilik nazariy test modulini yarat.

Admin:
- Kategoriya yaratish.
- Savol va javob variantlarini kiritish.
- To‘g‘ri javob va izoh.
- Rasmli savollar.
- Testga savollar soni, vaqt limiti, o‘tish bali va urinishlar soni.
- Savollarni import/eksport qilish.
- Draft/published status.
- Savol tahriri tarixini kerakli darajada saqlash.

O‘quvchi:
- Ruxsat etilgan testni boshlash.
- Vaqt chegarasi bo‘lsa timer.
- Javoblarni saqlash.
- Yakunlash va natijani ko‘rish.
- Qayta topshirish qoidasi.

Xavfsizlik:
- To‘g‘ri javoblar test yakunlanmaguncha clientga yuborilmasin.
- Test urinishining egasi serverda tekshirilsin.
- Ball serverda hisoblanadi.
- Timer faqat browser soatiga tayanmasin.
- Takroriy submit ikki marta natija yaratmasin.
- Javob kalitlari server response yoki frontend bundle ichida oshkor bo‘lmasin.

Unit, integration va E2E testlar yoz.
```

---

# 22. PROMPT 13 — TO‘LIQ ADMIN PANEL

```text
E-Avto uchun to‘liq admin panel yarat. Administrator asosiy biznes ma’lumotlari va sayt kontentini kod o‘zgartirmasdan boshqara olishi kerak.

Bo‘limlar:
- Dashboard.
- Foydalanuvchilar.
- Rollar va ruxsatlar.
- Kurslar va paketlar.
- Narxlar, chegirmalar va promo-kodlar.
- Buyurtmalar, to‘lovlar va refund.
- O‘qituvchilar.
- Guruhlar va a’zolik.
- Jadval va darslar.
- Davomat.
- Video va fayllar.
- Testlar va savollar banki.
- Sahifalar, yangiliklar va FAQ.
- Media kutubxonasi.
- Bildirishnomalar va shablonlar.
- Hisobotlar.
- Audit jurnali.
- Sayt sozlamalari: nom, logo, favicon, kontaktlar, ijtimoiy tarmoqlar, brend ranglari.
- Integratsiya holati.

UI:
- Search, filter, sort va pagination.
- Validatsiyalangan formalar.
- Xavfli amal oldidan confirmation.
- Loading/empty/error/success holatlari.
- Mobil qurilmada ishlash.
- Ruxsatga qarab menyu ko‘rinishi.

Xavfsizlik:
- Faqat menyuni yashirish yetarli emas; server endpointida permission tekshir.
- Admin o‘ziga superadmin rolini mustaqil bera olmasin.
- Muhim o‘zgarishlar audit logga yozilsin.
- Payment secret yoki auth tokenlar UI orqali ko‘rsatilmasin.
- Delete o‘rniga kerakli holatlarda archive/soft delete ishlat.
```

---

# 23. PROMPT 14 — BILDIRISHNOMALAR

```text
E-Avto bildirishnomalar modulini yarat.

Kanallar:
- Sayt ichidagi notification.
- Email, agar provider sozlangan bo‘lsa.
- SMS/messenjer faqat keyinchalik provider ulanganida.

Hodisalar:
- Ro‘yxatdan o‘tish va tasdiqlash.
- To‘lov natijasi.
- Kursga kirish huquqi.
- Yangi dars yoki jadval o‘zgarishi.
- Davomat.
- Test natijasi.
- Parolni tiklash.
- Admin e’loni.

Talablar:
- O‘qilgan/o‘qilmagan holati.
- Foydalanuvchi notification preference.
- Rate limit va duplicate notificationdan himoya.
- Maxfiy ma’lumotlarni xabarga qo‘shmaslik.
- Provider xatosini loglash, secretlarni loglamaslik.
- Provider sozlanmagan bo‘lsa “yuborildi” deb ko‘rsatmaslik.
- Email template’lar xavfsiz sanitizatsiya qilinsin.
- Yetkazish xatolari va qayta urinishlar uchun test yoz.
```

---

# 24. PROMPT 15 — HISOBOTLAR VA AUDIT JURNALI

```text
E-Avto uchun hisobotlar va audit jurnalini yarat.

Hisobotlar:
- Foydalanuvchilar soni.
- Faol kurslar va enrollments.
- Buyurtmalar.
- To‘lovlar statusi.
- Sana oralig‘i bo‘yicha tushum.
- Refundlar alohida hisoblanishi.
- Guruhlar bo‘yicha o‘quvchilar.
- O‘qituvchi darslari va yuklamasi.
- Davomat statistikasi.
- Test natijalari va progress.

Talablar:
- Sana oralig‘i, kurs, guruh va status filtrlari.
- Ruxsatga qarab ma’lumot cheklovi.
- CSV eksport; kerak bo‘lsa xavfsiz Excel eksporti.
- Katta datasetlarda pagination yoki background job.
- Audit log: actor, action, entity, entity ID, vaqt, before/after summary.
- Parol, token, karta ma’lumoti va secretlar audit logga yozilmasin.
- Tushum faqat provider tomonidan tasdiqlangan to‘lovlardan hisoblanadi; refundlar to‘g‘ri ayriladi yoki alohida ko‘rsatiladi.
- Hisob-kitoblar uchun test yoz.
```

---

# 25. PROMPT 16 — XAVFSIZLIK AUDITI

```text
E-Avto loyihasiga xavfsizlik auditi o‘tkaz va aniqlangan muammolarni tuzat.

Tekshir:
- Authentication va authorization.
- Role escalation.
- IDOR/BOLA: boshqa foydalanuvchi IDsi bilan ma’lumot olish.
- CSRF, XSS, SQL injection va open redirect.
- Rate limiting va brute-force.
- Fayl upload tekshiruvlari.
- Private media access control.
- Signed URL muddati va cache policy.
- Secret management va `.env`.
- Production errorlarda stack trace/secret oshkor bo‘lishi.
- CORS, CSP, security headers va cookie sozlamalari.
- Payment callback signature, idempotency va replay attack.
- Promo-code va order race condition.
- Admin endpointlari.
- Audit log.
- Backup/restore.
- Dependency va lockfile holati.

Har bir muammoni Critical/High/Medium/Low deb tasnifla. Ta’siri va tuzatish usulini yoz. Critical/High muammolar qolgan bo‘lsa, loyihani productionga tayyor deb belgilama. Secretlarni chiqarma. Tuzatishlar uchun test yoz va testlarni qayta ishga tushir.
```

---

# 26. PROMPT 17 — TESTLASH VA QABUL QILISH

```text
E-Avto release oldidan to‘liq tekshir.

1. Lint, typecheck, unit, integration va E2E testlarni ishga tushir.
2. Quyidagi oqimlarni tekshir:
   - Mehmon kurslarni ko‘radi.
   - Foydalanuvchi ro‘yxatdan o‘tadi va login qiladi.
   - O‘quvchi o‘z kabinetiga kira oladi.
   - O‘quvchi boshqa foydalanuvchining ma’lumotini ololmaydi.
   - O‘quvchi kursga buyurtma yaratadi.
   - To‘lov faqat server tomonidan tasdiqlangach enrollment yaratiladi.
   - Takroriy callback ikki marta enrollment yaratmaydi.
   - Admin kurs narxini o‘zgartiradi.
   - O‘qituvchi faqat o‘z guruhining davomatini belgilaydi.
   - O‘quvchi o‘z davomatini ko‘radi.
   - Test balli serverda hisoblanadi.
   - Ruxsatsiz foydalanuvchi private videoni ocholmaydi.
   - Admin kontentni o‘zgartiradi va saytda yangi qiymat ko‘rinadi.
3. Telefon, planshet va desktop viewportlarini tekshir.
4. Loading, empty, error, success va validation holatlarini tekshir.
5. Console/hydration xatolari va broken linklarni tekshir.
6. Testda haqiqiy pul yoki production ma’lumotlaridan foydalanma.
7. O‘tmagan testni o‘tdi deb ko‘rsatma.
8. Yakunda release checklist, qolgan xatolar va production blockerlarni yoz.

Muammolarni tuzat, testlarni qayta ishga tushir va natijani aniq hisobot qil.
```

---

# 27. PROMPT 18 — HOSTINGGA CHIQARISH

```text
E-Avto loyihasini production deployment uchun tayyorla. Mening ruxsatimsiz real hostingga kirmagin, production ma’lumotlarini o‘chirma va real to‘lovlarni ishga tushirma.

Tayyorla:
- Production build.
- Environment variables ro‘yxati va `.env.example`.
- Database migration tartibi.
- Production seed siyosati.
- HTTPS/domain konfiguratsiyasi.
- PostgreSQL backup/restore yo‘riqnomasi.
- Private media storage sozlamalari.
- Payment provider credentiallarini xavfsiz kiritish tartibi.
- Error monitoring va logging tavsiyasi.
- Health check endpoint.
- Rollback rejasi.
- Deployment README.

Secretlarni repositoryga kiritma. Hosting/provider ma’lumoti yetishmasa, kerakli ma’lumotlarni sanab ber. Real payment uchun providerning rasmiy tekshiruvi va sandbox testlari bajarilmaguncha production payment tayyor deb yozma.
```

---

# 28. HAR BIR BOSQICH UCHUN UMUMIY TEKSHIRUV PROMPTI

Har katta bosqichdan so‘ng quyidagi promptni yuboring:

```text
Hozirgi bosqichni yakunlashdan oldin audit qil.

1. Yaratilgan yoki o‘zgargan fayllarni sanab ber.
2. Qaysi funksiyalar haqiqiy DB/backend bilan ishlashini, qaysilari mock/demo ekanini ko‘rsat.
3. Lint, typecheck, unit va kerakli integration testlarni ishga tushir.
4. Xatolarni tuzat va testlarni qayta ishga tushir.
5. Server-side authorization va ownership tekshiruvlarini tekshir.
6. `.env.example`, README va tegishli docs fayllarini yangila.
7. Qo‘lda bajariladigan qadamlar va kerakli provider credentiallarini nomma-nom ayt, lekin maxfiy qiymatlarni so‘rama.
8. Ulanmagan integratsiyalarni ochiq sanab ber.
9. Keyingi bosqichga o‘tishga to‘sqinlik qiladigan muammolarni yoz.
10. Ishlamagan testni muvaffaqiyatli deb ko‘rsatma.
```

---

# 29. XATOLARNI TUZATISH PROMPTI

AI noto‘g‘ri ishlayotgan bo‘lsa yoki xatolar paydo bo‘lsa:

```text
To‘xta. Yangi funksiya qo‘shma. Avval mavjud kod va xatoni tekshir.

- Xatoni qayta ishlab ko‘r va sababini top.
- Ishlayotgan funksiyalarni sababsiz qayta yozma.
- Faqat UI maketini real funksiya deb ko‘rsatma.
- Demo ma’lumotni production ma’lumotdek taqdim etma.
- Frontend tekshiruvini server-side authorization o‘rniga ishlatma.
- To‘lovni browser success sahifasi bilan tasdiqlama.
- Secret yoki parolni kodga qo‘shma.
- Minimal va test qilinadigan tuzatish kirit.
- Tegishli testlarni yoz va ishga tushir.
- Xatolar qolsa, aniq fayl, sabab va keyingi qadamni ko‘rsat.
- Tashqi credential kerak bo‘lsa, xavfsiz interface/mock bilan cheklan va real integratsiya hali ulanmaganini ayt.
```

---

# 30. ISHLAB CHIQISH KETMA-KETLIGI

| Tartib | Bosqich | Keyingisiga o‘tish sharti |
|---:|---|---|
| 1 | Audit va arxitektura | Reja, rollar va DB modeli aniq |
| 2 | Poydevor va dizayn | Build, lint, typecheck ishlaydi |
| 3 | Database | Migratsiya va seed ishlaydi |
| 4 | Auth va rollar | Login va permission testlari o‘tadi |
| 5 | Ochiq sayt/CMS | Admin kontenti saytda aks etadi |
| 6 | Kurslar/narxlar | Kurs va narxlar DBdan boshqariladi |
| 7 | Buyurtma/to‘lov | Sandbox va callback testlari o‘tadi |
| 8 | O‘quvchi kabineti | Enrollment ruxsati serverda tekshiriladi |
| 9 | O‘qituvchi/guruh/jadval | Teacher ownership testlari o‘tadi |
| 10 | Davomat | Belgilash, tahrir tarixi va hisobot ishlaydi |
| 11 | Private media | Ruxsatsiz foydalanuvchi video ololmaydi |
| 12 | Testlar | Javob va ball serverda tekshiriladi |
| 13 | Admin panel | Muhim ma’lumotlar kodsiz boshqariladi |
| 14 | Bildirishnomalar/hisobotlar | Ruxsat va hisob-kitob testlari o‘tadi |
| 15 | Xavfsizlik va E2E | Critical/High xatolar yopilgan |
| 16 | Production | Backup, env, monitoring va rollback tayyor |

---

# 31. PRODUCTIONGA TAYYORLIK CHECKLISTI

## Ochiq sayt
- [ ] Barcha zarur sahifalar ishlaydi.
- [ ] Sayt telefon, planshet va kompyuterga mos.
- [ ] Admin kontenti saytda yangilanadi.
- [ ] Light/dark mode ishlaydi.
- [ ] SEO metadata va sitemap sozlangan.

## Login va xavfsizlik
- [ ] Register/login/logout ishlaydi.
- [ ] Parolni tiklash xavfsiz.
- [ ] Role/permission serverda tekshiriladi.
- [ ] O‘quvchilar bir-birining ma’lumotini ko‘ra olmaydi.
- [ ] Teacher faqat o‘z guruhlariga kira oladi.
- [ ] Admin endpointlari himoyalangan.
- [ ] Secretlar repositoryga kiritilmagan.

## Kurs va to‘lov
- [ ] Kurs, paket, narx va chegirma admin paneldan boshqariladi.
- [ ] Narx serverda qayta hisoblanadi.
- [ ] Buyurtma va to‘lov holatlari saqlanadi.
- [ ] To‘lov provider callback imzosi tekshiriladi.
- [ ] Takroriy callback ikki marta hisoblanmaydi.
- [ ] Kursga kirish faqat tasdiqlangan to‘lov/huquq bilan beriladi.
- [ ] Refund qoidalari hujjatlashtirilgan.

## O‘qituvchi va davomat
- [ ] O‘qituvchi faqat o‘z guruhlarini ko‘radi.
- [ ] Admin guruh va jadvalni boshqaradi.
- [ ] Davomatni faqat vakolatli shaxs belgilaydi.
- [ ] Tahrirlar audit logga yoziladi.
- [ ] O‘quvchi o‘z davomatini ko‘radi.
- [ ] Hisobot foizlari test bilan tekshirilgan.

## Video va test
- [ ] Private video public papkada emas.
- [ ] Ruxsatsiz foydalanuvchi media endpointidan fayl ololmaydi.
- [ ] Test javoblari oldindan oshkor bo‘lmaydi.
- [ ] Ball serverda hisoblanadi.
- [ ] Test urinishlari takroriy submitdan himoyalangan.

## Ishga tushirish
- [ ] Production build muvaffaqiyatli.
- [ ] Migration tartibi hujjatlashtirilgan.
- [ ] `.env.example` to‘liq.
- [ ] Backup/restore tartibi sinovdan o‘tgan.
- [ ] Monitoring va rollback rejasi bor.
- [ ] Ulanmagan integratsiyalar ochiq ko‘rsatilgan.
- [ ] Privacy/terms hujjatlari loyiha talablariga mos ko‘rib chiqilgan.

---

# 32. LOYIHA EGASI BELGILAYDIGAN BIZNES QARORLARI

AI quyidagilarni o‘zi taxmin qilib productionga qo‘ymasligi kerak:

1. Kurslarning haqiqiy narxi va valyutasi.
2. To‘lov provayderi: Payme, Click yoki boshqa xizmat.
3. Qaysi to‘lov usullari qo‘llab-quvvatlanadi.
4. To‘lovdan keyin kursga kirish avtomatik beriladimi.
5. Refund va bekor qilish siyosati.
6. Kurs davomiyligi, paket tarkibi va dars soni.
7. Davomatni kim tahrirlay oladi.
8. Davomat foizi qanday hisoblanadi.
9. Test uchun vaqt, urinishlar va o‘tish bali.
10. Video/fayllar saqlanadigan hosting.
11. Email/SMS provider.
12. Domen, hosting va production DB.
13. Yakuniy logo, ranglar va brend nomi.
14. Maxfiylik siyosati, foydalanuvchi roziligi va ma’lumotlarni saqlash muddati.
15. Foydalanuvchilarni o‘chirish yoki arxivlash siyosati.

---

# 33. AI CODING VOSITASIDA AMALIY ISHNI BOSHLASH

## 33.1. Agar hali kod yo‘q bo‘lsa

1. Kompyuterda loyiha papkasini yarating: `e-avto`.
2. Uni Cursor, VS Code + AI coding agent yoki boshqa tanlangan vositada oching.
3. Terminal va fayllarga kirish huquqini faqat ishonchli vositaga bering.
4. Avval **Prompt 01**ni yuboring.
5. Rejani ko‘rib chiqing.
6. Keyin Prompt 02, undan keyin Prompt 03 va qolganlarini tartib bilan yuboring.
7. Har bosqichda umumiy tekshiruv promptidan foydalaning.
8. Har katta bosqichdan keyin Git commit yoki zaxira nusxa yarating.

## 33.2. Agar loyiha allaqachon mavjud bo‘lsa

1. Avval kodni Git orqali zaxiralang.
2. Prompt 01 bilan mavjud repository auditini qildiring.
3. AI mavjud kodni sababsiz qayta yozmasin.
4. Bitta modulni yakunlab, test qiling.
5. Keyingi modulga o‘ting.

## 33.3. Har promptdan keyin AIga aytiladigan qisqa talab

```text
Faqat reja bilan cheklanma: shu bosqichda kerakli fayllarni haqiqiy kod bilan yarat yoki yangila. Mavjud funksiyalarni saqla. Testlarni ishga tushir, xatolarni tuzat, o‘zgargan fayllarni sanab ber va qaysi integratsiyalar hali ulanmaganini ochiq yoz. Hozirgi bosqich tugamaguncha keyingi katta bosqichga o‘tma.
```

## 33.4. Git orqali zaxiralash

Git ishlatilayotgan bo‘lsa, katta bosqichlardan keyin commit yarating. Masalan:

```bash
git status
git add .
git commit -m "Complete project foundation"
```

Agar Git hali sozlanmagan bo‘lsa, avval repositoryni to‘g‘ri boshlang. Maxfiy `.env` faylini commit qilmang; `.gitignore` ichida himoyalang.

## 33.5. Development server

Framework va package manager tanloviga qarab, AI READMEga to‘g‘ri buyruqlarni yozishi kerak. Next.js loyihasida odatda quyidagilar ishlatiladi, lekin package manager va loyiha sozlamasini tekshiring:

```bash
npm install
npm run dev
```

Boshqa terminalda test va build buyruqlari:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Bu buyruqlarning barchasi har bir loyihada avtomatik mavjud bo‘lmasligi mumkin; AI `package.json`ga mos scriptlarni sozlashi kerak.

---

# 34. YAKUNIY QOIDALAR

1. Promptlarni 01 dan 18 gacha ketma-ket bajaring.
2. Har bosqichdan keyin test qiling.
3. Real to‘lovni dastlab sandboxda tekshiring.
4. API key, database password va secretlarni chatga yoki repositoryga joylamang.
5. Private videolarni ochiq `public/` papkada saqlamang.
6. Frontendda tugmani yashirish xavfsizlik o‘rnini bosa olmaydi; server ham ruxsatni tekshirishi kerak.
7. To‘lovni browserdagi success sahifasi bilan tasdiqlamang.
8. AI bajarmagan integratsiyani tayyor deb qabul qilmang.
9. Productiondan oldin backup, restore, monitoring va rollback rejasini tayyorlang.
10. Haqiqiy foydalanuvchilarni jalb qilishdan oldin maxfiylik, foydalanish shartlari va tegishli qonuniy talablarni ko‘rib chiqing.

**Muvaffaqiyat mezoni:** E-Avto faqat chiroyli sahifalardan iborat bo‘lmasligi kerak. U real database, xavfsiz autentifikatsiya, server-side permission, to‘g‘ri payment flow, o‘quvchi va o‘qituvchi kabinetlari, davomat, testlar, boshqariladigan kontent va tekshirilgan deploymentga ega bo‘lishi kerak.
