# E-Avto Test — to‘liq texnik topshiriq, loyiha strukturasi va AI promptlar

> Versiya: 2.0  
> Asosiy til: o‘zbekcha (lotin)  
> Ushbu hujjat foydalanuvchi yuborgan texnik topshiriqdagi foydali talablarni repozitoriydagi haqiqiy kod bilan solishtirib birlashtiradi. Amaldagi holat, tavsiya etilgan kengaytmalar va keyin bajariladigan ishlar bir-biridan aniq ajratilgan. Repozitoriyda hozir Next.js emas, Vite + React frontend va Express backend ishlatiladi.

## 1. Loyiha haqida

**Nomi:** E-Avto Test  
**Yo‘nalishi:** haydovchilik nazariyasi va yo‘l harakati qoidalarini onlayn o‘rganish platformasi.  
**Maqsadi:** foydalanuvchiga mavzularni o‘rganish, video dars ko‘rish, test ishlash, xatolarini tahlil qilish va o‘z o‘sishini kuzatish imkonini berish; administratorga esa o‘quv materiallari va foydalanuvchilarni boshqarish vositalarini taqdim etish.

### Asosiy foydalanuvchi oqimi

`Bosh sahifa → Kurslar → Kurs tafsiloti → Dars → Video → Test → Natija → Xatolar tahlili → Takroriy test`

O‘quvchi kabinetida qo‘shimcha oqim: `Dashboard → Progress / Tarix / Reyting / Profil / Sozlamalar`.

### Mahsulot yo‘nalishlari

- Kompyuter, planshet va telefonda qulay ishlaydigan veb-sayt.
- O‘zbek lotin interfeysi; o‘zbek kirill va rus tillari loyiha tarjimalariga mos ravishda qo‘llab-quvvatlanadi.
- Savollar toifa va mavzular bo‘yicha topiladi, rasmli vaziyatlar bilan o‘rganiladi.
- Mashq va vaqtli imtihon, javob izohi, test tarixi, xato tahlili va progress.
- Kelajakda qoidalar/yo‘l belgilari kutubxonasi, video katalogi, to‘lovlar, mobil ilova yoki Telegram integratsiyasi qo‘shilishi mumkin.
- Sayt statistikasi haqiqiy ma’lumotga asoslanadi; tasdiqlanmagan foydalanuvchi soni yoki reytinglar o‘ylab topilmaydi.

## 2. Dasturlash tillari va texnologiyalar

| Qism | Til / texnologiya | Vazifasi |
|---|---|---|
| Frontend | TypeScript | Brauzer ilovasining asosiy kodi va tiplari |
| UI | React 18 | Komponentlar va sahifalar |
| Uslublar | CSS, Tailwind CSS | Layout, responsive dizayn, light/dark mavzu |
| HTML | `frontend/index.html` | Ilovaning boshlang‘ich hujjati |
| Build/dev | Vite | Lokal server va production yig‘ish |
| Backend | TypeScript, Node.js, Express | REST API va server logikasi |
| Baza | PostgreSQL | Foydalanuvchi va o‘quv ma’lumotlarini saqlash |
| ORM | Prisma | Baza sxemasi va so‘rovlar |
| Validatsiya/xavfsizlik | Zod, JWT, bcryptjs, Helmet, CORS, express-rate-limit | Kiritmalar, autentifikatsiya, parol xeshi va HTTP himoyasi |

Frontenddagi qo‘shimcha kutubxonalar: React Router DOM, Zustand, Axios, React Hook Form, Zod, Lucide React, Framer Motion, Recharts, Sonner, date-fns, clsx va tailwind-merge.

> Texnologiyalar uchun foiz ko‘rsatkichlari berilmagan: loyiha kodidan til ulushini ishonchli foizga aylantirib bo‘lmaydi.

## 3. Repozitoriy tarkibi

```text
e-avto-test/
├── frontend/                  # React + TypeScript foydalanuvchi interfeysi
│   ├── public/                 # Statik fayllar, logo va demo video
│   └── src/
│       ├── components/         # UI, navigatsiya, kurs, dars, test komponentlari
│       ├── config/             # Frontend muhit sozlamalari
│       ├── constants/          # Yo‘llar, kategoriyalar va konfiguratsiya
│       ├── data/               # Demo/mock ma’lumotlar
│       ├── hooks/              # Qayta ishlatiladigan React hooklar
│       ├── i18n/ locales/      # Til sozlamalari va tarjimalar
│       ├── layouts/            # Ommaviy, auth, talaba, admin layoutlari
│       ├── pages/              # Sahifalar: public, auth, student, errors
│       ├── routes/             # Marshrutlar va himoyalangan route
│       ├── services/           # Axios va API servis qatlamlari
│       ├── store/              # Zustand global holatlari
│       ├── types/              # TypeScript turlari
│       └── utils/              # Formatlash va yordamchi funksiyalar
├── backend/                   # Express REST API
│   ├── prisma/                 # PostgreSQL schema, seed
│   └── src/
│       ├── config/             # Env va Prisma ulanishi
│       ├── controllers/        # HTTP request/response boshqaruvi
│       ├── middleware/         # Auth, admin, rate limit, xato handler
│       ├── routes/             # API marshrutlari
│       ├── services/           # Biznes logikasi
│       ├── utils/              # JWT, pagination, API javobi va boshqalar
│       └── validators/         # Zod sxemalari
├── docs/                       # Loyiha hujjatlari
└── docker-compose.yml          # Lokal PostgreSQL xizmati
```

## 4. Sayt sahifalari va marshrutlar

### Ommaviy sahifalar

| Yo‘l | Sahifa | Mazmuni |
|---|---|---|
| `/` | Bosh sahifa | Platforma tanishtiruvi, afzalliklar, kurslar, chaqiriq va footer |
| `/courses` | Kurslar | Kurslarni ko‘rish va tanlash |
| `/courses/:courseId` | Kurs tafsiloti | Kurs tavsifi va darslar |
| `/about` | Biz haqimizda | Loyiha va maqsad haqida |
| `/contact` | Aloqa | Bog‘lanish ma’lumotlari/formasi |
| `/faq` | Ko‘p so‘raladigan savollar | FAQ |

### Kirish va hisob sahifalari

| Yo‘l | Sahifa | Mazmuni |
|---|---|---|
| `/login` | Kirish | Hisobga kirish |
| `/register` | Ro‘yxatdan o‘tish | Yangi hisob ochish |
| `/forgot-password` | Parolni unutdim | Parol tiklashni boshlash |
| `/reset-password` | Parolni tiklash | Tiklash tokeni bilan yangi parol kiritish |

### Himoyalangan o‘quvchi sahifalari

| Yo‘l | Sahifa | Mazmuni |
|---|---|---|
| `/dashboard` | Dashboard | O‘quvchi holati, statistika va davom ettirish |
| `/lessons` | Darslar | Darslar ro‘yxati |
| `/lessons/:lessonId` | Dars tafsiloti | Dars tavsifi va o‘rganish maqsadlari |
| `/lessons/:lessonId/video` | Video dars | Video va darsni davom ettirish |
| `/tests` | Testlar | Test tanlash/boshlash |
| `/tests/:testId` | Test ishlash | Savollar, variantlar, timer va navigatsiya |
| `/tests/:testId/result` | Test natijasi | Ball, to‘g‘ri/noto‘g‘ri va holat |
| `/tests/:testId/review` | Xatolar tahlili | Javoblar va izohlarni ko‘rish |
| `/history` | Test tarixi | Oldingi urinishlar |
| `/progress` | O‘sish | Dars/test statistikasi va grafiklar |
| `/leaderboard` | Reyting | Foydalanuvchilar reytingi |
| `/profile` | Profil | Shaxsiy ma’lumot va statistika |
| `/settings` | Sozlamalar | Mavzu, til, xavfsizlik va bildirishnoma sozlamalari |

### Xatolik sahifalari

| Yo‘l | Sahifa | Izoh |
|---|---|---|
| `/403` | Ruxsat yo‘q | Himoyalangan bo‘limga huquqsiz murojaat |
| `/500` | Server xatosi | Serverdagi xatolik holati |
| Noma’lum yo‘l | Topilmadi | Catch-all 404 sahifa |

Network error alohida marshrut emas; API yoki tarmoq xatosi sahifa ichidagi holat sifatida ko‘rsatilishi mumkin.

### Bosh sahifaning tavsiya etilgan tartibi

1. Header: logo, asosiy havolalar, til va mavzu boshqaruvi, kirish/profil, mobil menyu.
2. Hero: “Haydovchilik imtihoniga ishonch bilan tayyorlaning”, qisqa tushuntirish, “Testni boshlash” va “Qoidalarni o‘rganish” amallari.
3. Tezkor kirish: haydovchilik toifalari, mavzu testi, imtihon rejimi, yo‘l belgilari.
4. Platforma imkoniyatlari: rasmli savollar, timer, xato tahlili, tarix va videodarslar.
5. Login qilgan foydalanuvchiga “O‘rganishni davom ettirish” bloki.
6. Haqiqiy kontent va raqamlarga tayangan ommabop kurslar/statistika.
7. Footer: aloqa, maxfiylik, foydalanish shartlari va mavjud ijtimoiy tarmoqlar.

### Admin panel

Admin layout va backend admin API mavjud. `AdminLayout` menyusida quyidagi bo‘limlar nazarda tutilgan:

| Yo‘l | Bo‘lim | Holat/maqsad |
|---|---|---|
| `/admin` | Dashboard/statistika | Backendda `/api/admin/statistics` endpointi mavjud |
| `/admin/courses` | Kurslar va modullar | Kurs yaratish, ko‘rish, tahrirlash va o‘chirish API mavjud |
| `/admin/questions` | Savollar banki | Savol yaratish, ko‘rish, tahrirlash va o‘chirish API mavjud |
| `/admin/users` | Foydalanuvchilar | Foydalanuvchilar ro‘yxati API mavjud |

**Amaldagi holat:** `/admin`, `/admin/courses`, `/admin/questions`, `/admin/users` sahifalari `AdminRoute` ostida ulangan va backend admin API bilan ishlaydi. Darslar CRUD’i uchun API bor, UI hali yo‘q. Frontenddagi rol tekshiruvi faqat interfeys uchun; ruxsatni backend (`authMiddleware`, `adminMiddleware`, rol har so‘rovda bazadan tekshiriladi) hal qiladi.

### Keyinchalik qo‘shish mumkin bo‘lgan ommaviy sahifalar

Quyidagilar yuborilgan texnik topshiriqdan olingan, ammo hozirgi route xaritasida yo‘q. Ularni MVP doirasiga kiritishdan oldin kontent va API ehtiyojini aniqlang:

- `/categories`, `/categories/:slug` — test toifalari;
- `/rules`, `/rules/:slug` — yo‘l qoidalari kutubxonasi;
- `/road-signs`, `/road-signs/:slug` — yo‘l belgilari katalogi;
- `/videos`, `/videos/:slug` — video darslar katalogi;
- `/privacy`, `/terms` — maxfiylik siyosati va foydalanish shartlari;
- `/pricing` — faqat pullik tariflar joriy qilinsa.

### Keyinchalik qo‘shish mumkin bo‘lgan o‘quvchi funksiyalari

Saqlangan savollar/bookmark, noto‘g‘ri javoblarni qayta ishlash, mavzuli va imtihon rejimlari, sessiyalar va xavfsizlik sozlamalari foydali kengaytmalardir. Bular hozirgi API/schema’dan farq qilishi mumkin; model, API va UI birgalikda rejalashtirilsin.

### Keyinchalik qo‘shish mumkin bo‘lgan admin bo‘limlari

Kategoriya/mavzu, media kutubxonasi, rollar va ruxsatlar, hisobotlar, audit log, sayt sozlamalari, backup va xavfsizlik dashboardi. Ularning hammasi hozir amalga oshirilgan deb qabul qilinmasin. Admin amallari backendda tekshirilsin va muhim o‘zgarishlar audit qilinsin.

## 5. Asosiy funksional talablar

### O‘quvchi funksiyalari

- Ro‘yxatdan o‘tish, kirish va profil ma’lumotlarini ko‘rish/tahrirlash.
- Kurs va darslarni ko‘rish, darsning videosini ochish.
- Testni boshlash, savollarga javob berish, oldingi/keyingi savolga o‘tish.
- Belgilangan vaqt tugaganda testni yakunlash; natija va o‘tish holatini server hisoblaydi.
- Test natijasini ko‘rish, javoblar va xatolar tahlilini ochish, testni takrorlash.
- Dars va kurs progressi, urinishlar tarixi, shaxsiy statistika va reytingni ko‘rish.
- Profil, ko‘rinish mavzusi va tilni sozlash.

### Test jarayoni uchun talablar

- Savollar va variantlar klaviatura bilan ham tanlansin.
- Savol raqamlari javobsiz/javoblangan/joriy/belgilangan holatlarni ko‘rsatsin.
- Timer ogohlantirish chegaralari: 5 daqiqa qolganda warning, 1 daqiqada danger.
- Vaqt tugaganda yakunlash oqimi ishga tushsin.
- To‘g‘ri javoblar test davomida mijozga oshkor qilinmasin; yakuniy ball serverda hisoblanadi.

### Kelajakda kengaytirish mumkin bo‘lgan test funksiyalari

- Erkin mashq, mavzu bo‘yicha mashq, imtihon rejimi, noto‘g‘ri javoblarni qayta ishlash, saqlangan savollar va rasmli vaziyatlar.
- Testni saqlab keyin davom ettirish; javoblar va vaqt server bilan ishonchli sinxronlansin.
- Savollar ketma-ketligini tasodifiy tanlash, ammo bitta urinish ichida savol tartibi barqaror qolishi.
- Mavzu kesimida xatolar statistikasini ko‘rsatish.
- Mehmon test ishlay olishi yoki ro‘yxatdan o‘tishi kerakligini mahsulot talabi belgilaydi; tarix va profil uchun hisob talab qilinishi mumkin.

### Admin funksiyalari

- Faqat admin rolidagi akkauntga kirish.
- Kurslar va savollarni boshqarish (CRUD).
- Foydalanuvchilar ro‘yxatini ko‘rish.
- Umumiy statistika ko‘rsatkichlarini ko‘rish.
- Ma’lumotlarni o‘zgartirishda validatsiya, tasdiqlash va xato holatlarini taqdim etish.

## 6. Ranglar va dizayn tizimi

### Amaldagi ranglar

- **Brand/primary:** ko‘k palitra; Tailwind’da `brand-500 #3b82f6`, asosiy tugma holatlarida `brand-600 #2563eb`.
- **Accent:** sariq-to‘q sariq; `accent-500 #f59e0b`. Admin menyusi sariq accentdan foydalanadi.
- **Yorug‘ mavzu:** sahifa foni `slate-50`, matn `slate-800`, kartalar oq.
- **Qorong‘i mavzu:** sahifa foni `slate-950`, kartalar `slate-900`, matn `slate-100`; chegaralar `slate-800` atrofida.
- **Semantik ranglar:** success — yashil, warning — sariq, danger — qizil; holatni faqat rang bilan bildirmasdan matn/ikonka ham berish.

### Mavzu xatti-harakati

- Tailwind `darkMode: "class"`; qorong‘i ko‘rinish `html.dark` klassi bilan yoqiladi.
- UI store mavzuni `light` yoki `dark` sifatida boshqaradi, tanlov localStorage’da saqlanadi.
- Sozlamalar yoki header orqali mavzu almashtirish tugmasi bo‘lsin.
- System mavzusi hozirgi store turida yo‘q; qo‘shilsa `prefers-color-scheme`ni tinglash va tanlovni saqlash kerak.

### UI/UX qo‘llanmasi

- Inter/system sans shriftlaridan foydalanish.
- O‘qilishi oson sarlavha, tana matni va yordamchi matn ierarxiyasi.
- Asosiy konteyner `max-w-7xl`, mobil/desktopda mos padding.
- Kartalar yumaloq burchakli, nozik chegara va yengil soya bilan.
- 320px mobil, 768px planshet, 1440px+ desktop ko‘rinishlarini qo‘llab-quvvatlash.
- Focus holatlari, label, alt matn, keyboard navigatsiya va kontrastni ta’minlash.
- Yuklanish, bo‘sh ro‘yxat, xato va muvaffaqiyat holatlarini izchil ko‘rsatish.
- Animatsiyalar qisqa va maqsadli; test ishlashiga xalaqit bermasin.

## 7. Backend, API va ma’lumotlar

### Arxitektura

`Browser (React) → REST/JSON API (Express) → Prisma ORM → PostgreSQL`

Backend qatlamlari: routes → middleware/validators → controllers → services → Prisma. Biznes qoidalar service qatlamida saqlanadi.

### API yo‘nalishlari

| Endpointlar | Vazifasi | Auth |
|---|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Hisob va joriy foydalanuvchi | Amallariga qarab |
| `GET /api/courses`, `GET /api/courses/:id` | Kurslar | Ommaviy |
| `GET /api/lessons/:id` | Dars va video ma’lumoti | Route implementatsiyasiga qarab |
| `POST /api/tests/start`, `POST /api/tests/:id/answer`, `POST /api/tests/:id/finish` | Test jarayoni | Ha |
| `GET /api/results`, `GET /api/results/:id` | Natija va tahlil | Ha |
| `GET/PUT /api/profile`, `GET /api/statistics`, `GET /api/leaderboard` | Profil va statistika | Profil/statistika uchun ha; reyting ommaviy |
| `GET /api/progress`, `GET/PUT /api/progress/:lessonId` | Progress | Ha |
| `GET /api/health` | API va baza holati | Yo‘q |
| `/api/admin/*` | Admin foydalanuvchi/kurs/savol/statistika | Admin |

Javob formati: `{ "success": true, "data": ... }` yoki `{ "success": false, "message": "...", "errors": [...] }`.

### Prisma modellari

- `User`: email, ism, telefon, password hash, role (`USER`/`ADMIN`), avatar.
- `Course`: nom, tavsif, thumbnail, daraja, tartib, nashr holati.
- `Lesson`: kurs, matn/tavsif, video URL, thumbnail, davomiylik, tartib va nashr holati.
- `Video`: dars bilan bog‘langan media URL va davomiylik.
- `Question`: savol, rasm URL, izoh, qiyinlik, JSON variantlar, to‘g‘ri javob indeksi.
- `Test`: egasi, kurs, savollar soni, to‘g‘ri/noto‘g‘ri, ball, o‘tish holati, vaqt.
- `UserAnswer`: tanlangan indeks va to‘g‘rilik.
- `Progress` va `LessonProgress`: kurs/dars bo‘yicha o‘zlashtirish.

Video fayllari backendga yuklanmaydi; baza faqat tashqi storage/CDN URL saqlaydi.

## 8. Lokal ishga tushirish

### Talablar

- Node.js 18+ va npm
- PostgreSQL yoki Docker

### 1) Ma’lumotlar bazasi

Repo ildizida:

```bash
docker-compose up -d
```

### 2) Backend

```bash
cd backend
npm install
```

`backend/.env` yarating:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/e_avto_test"
PORT=5000
JWT_SECRET="uzun_va_tasodifiy_maxfiy_kalit"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### 3) Frontend

```bash
cd frontend
npm install
```

`frontend/.env` ichida:

```env
VITE_API_URL="http://localhost:5000/api"
```

```bash
npm run dev
```

Frontend odatda `http://localhost:5173`, API esa `http://localhost:5000/api`da ishlaydi.

> Seed hisoblari faqat lokal demo uchun mo‘ljallangan. Ishlab chiqarish muhitida namunaviy parollarni ishlatmang va kuchli sirlarni `.env`/secret manager orqali bering.

## 9. Ishlab chiqish ketma-ketligi

1. Talablar va foydalanuvchi oqimlarini tasdiqlash.
2. Repozitoriy, mavjud kod, hujjat va AGENTS yo‘riqnomalarini o‘rganish.
3. Ma’lumotlar modeli va API kontraktini belgilash.
4. PostgreSQL, Prisma sxemasi, migratsiya va seedni tayyorlash.
5. Backend validatsiya, auth, role middleware, service va controllerlarini qurish.
6. Design tokens, light/dark mavzu va umumiy layoutlarni tayyorlash.
7. Ommaviy sahifalar va auth oqimini ulash.
8. Kurs/dars/video oqimini API bilan ulash.
9. Test, timer, serverda baholash, natija va review oqimini ulash.
10. O‘quvchi dashboard, progress, tarix, reyting va profilni ulash.
11. Admin marshrutlari, sahifalari va CRUD amallarini backend bilan bog‘lash.
12. Responsive, accessibility, yuklanish/xato/bo‘sh holatlarini yakunlash.
13. Tegishli typecheck/build/testlarni bajarish va hujjatni yangilash.

## 10. Loyiha papkalari va ma’lumotlar modeli

### Hozirgi repozitoriy tuzilmasi

```text
e-avto-test/
├── frontend/
│   ├── public/                     # Logo va statik media
│   └── src/
│       ├── components/             # UI, home, navigation, course, lesson, test, video
│       ├── constants/              # Route va umumiy sozlamalar
│       ├── data/                   # Demo/mock ma’lumotlar
│       ├── hooks/                  # useAuth, useTest va boshqa hooklar
│       ├── i18n/ locales/          # Til konfiguratsiyasi va tarjimalar
│       ├── layouts/                # Main, auth, student, admin layoutlar
│       ├── pages/                  # public, auth, student, errors sahifalari
│       ├── routes/                 # AppRoutes va route guardlar
│       ├── services/               # Axios API va domen servislar
│       ├── store/                  # Zustand auth, test, UI holatlari
│       ├── types/                  # Frontend ma’lumot turlari
│       └── utils/                  # Formatlash va yordamchilar
├── backend/
│   ├── prisma/                     # PostgreSQL schema va seed
│   └── src/
│       ├── config/                 # Env va database ulanishi
│       ├── controllers/            # HTTP request/response
│       ├── middleware/             # Auth, admin, rate limit, error
│       ├── routes/                 # REST endpointlar
│       ├── services/               # Biznes qoidalari
│       ├── utils/                  # JWT, pagination, response yordamchilari
│       └── validators/             # Zod tekshiruvlari
├── docs/                           # Texnik hujjatlar
└── docker-compose.yml              # Lokal PostgreSQL
```

Frontend qismlari `components/pages/services/store/types` qatlamlariga ajratilsin. Backend biznes logikasi route/controller ichida emas, service qatlamida bo‘lsin.

### Ma’lumotlar bazasi kengaytmalari

Hozirgi Prisma sxemasida `User`, `Course`, `Lesson`, `Video`, `Question`, `Test`, `UserAnswer`, `Progress`, `LessonProgress` modellari bor. Quyidagilarni faqat funksiya tasdiqlangandan keyin migratsiya bilan qo‘shish ko‘rib chiqilsin:

| Model/tushuncha | Vazifasi | Holati |
|---|---|---|
| Category / Topic | Savol va darslarni toifa/mavzuga guruhlash | Hozirgi sxemada yo‘q |
| Bookmark | Foydalanuvchining saqlagan savollari | Hozirgi sxemada yo‘q |
| TestSession | Faol/saqlangan urinish, rejim va vaqt | Hozirgi `Test` modelini tekshirib keyin qaror qilinadi |
| AnswerOption | Variantlarni alohida jadvalda saqlash | Hozir variantlar JSON; migratsiya zarurligi baholansin |
| MediaAsset | Storage provider key va metadata | Hozircha yo‘q; video URL Course/Lesson’da |
| AuditLog | Muhim admin amallari jurnali | Hozirgi sxemada yo‘q |
| Role/Permission | Kengaytirilgan RBAC | Hozir `USER`/`ADMIN` enum mavjud |

Yangi model qo‘shishdan oldin mavjud sxema/API bilan yechish mumkinligini tekshir; zaruratsiz migratsiya qilma.

## 11. Keyingi bosqich uchun master prompt

Quyidagi promptni mavjud repozitoriyda ishlaydigan AI kod agentiga berish mumkin. U loyiha qoidalari va amaldagi stekka mos; yangi frameworkga asossiz migratsiya buyurmaydi.

```text
Sen mavjud E-Avto repozitoriysida ishlaydigan tajribali full-stack dasturchisan. Maqsad — ishchi platformani bosqichma-bosqich yaxshilash, keraksiz qayta yozish emas.

LOYIHA MAQSADI
E-Avto Test — foydalanuvchilarga yo‘l harakati qoidalarini kurs va video darslar orqali o‘rgatadigan, vaqtli test ishlatadigan, natija/xatolar tahlili va progressni ko‘rsatadigan platforma. Admin kurslar, darslar, savollar va foydalanuvchilarni boshqaradi.

ISH BOSHLASHDAN OLDIN
1. Tegishli AGENTS.md va loyiha yo‘riqnomalarini o‘qi; topshiriqqa mos bo‘lsa ko‘rsatilgan skilllarni ham qo‘lla.
2. Mavjud sahifalar, route, komponent, API, Prisma sxemasi va docsni tekshir.
3. Mavjud arxitekturani saqla; aniq talab va migratsiya rejasi bo‘lmasa framework yoki ORMni almashtirma.
4. Hozirgi loyiha React 18 + TypeScript + Vite + Tailwind frontend, Node.js + Express + TypeScript + Prisma backend va PostgreSQL bazasidan iborat.

TEXNOLOGIYALAR
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router DOM, Zustand, Axios.
- Form/validatsiya: React Hook Form, Zod.
- UI: Lucide React, Sonner; kerakli joyda Framer Motion va Recharts.
- Backend: Express, TypeScript, Prisma, PostgreSQL, JWT, bcryptjs, Helmet, CORS, rate limit.

SAHIFALAR
Amaldagi ommaviy: /, /courses, /courses/:courseId, /about, /contact, /faq.
Amaldagi auth: /login, /register, /forgot-password, /reset-password.
Amaldagi o‘quvchi: /dashboard, /lessons, /lessons/:lessonId,
/lessons/:lessonId/video, /tests, /tests/:testId,
/tests/:testId/result, /tests/:testId/review, /history,
/progress, /leaderboard, /profile, /settings.
Xato: /403, /500 va catch-all 404.
Admin kerakli yo‘llari: /admin, /admin/courses, /admin/questions, /admin/users; ularni qo‘shishdan oldin amaldagi route holatini tekshir.
Qo‘shimcha kelajak sahifalari: /categories, /rules, /road-signs, /videos, /privacy, /terms; faqat talabga kirsa ishlab chiq.
Har bir maxfiy route tegishli layout va role guard bilan ishlasin. Admin uchun frontend guard UX vazifasini bajaradi; haqiqiy ruxsat serverda tekshirilsin.

ASOSIY O‘QUVCHI OQIMI
Bosh sahifa → kurs → dars → video → test → savollar/timer → yakunlash → natija → xatolar tahlili → qayta ishlash.
Dashboardda progress, yakunlangan darslar/testlar, o‘rtacha va eng yaxshi natija, oxirgi testlar va davom ettirish ko‘rsatilsin.
Progress sahifasida tegishli statistikalar va grafiklar; tarixda sana, ball, holat va ko‘rib chiqish amali; reytingda o‘rin va natijalar bo‘lsin.

TEST TALABLARI
- Savol, javob variantlari, oldingi/keyingi tugma, savol navigatori va timer ko‘rsat.
- Javob tanlash klaviaturada ham ishlasin; joriy/javoblangan/belgilangan holatlar aniq bo‘lsin.
- Vaqt tugaganda test yakunlansin; yakunlashni server hisoblasin.
- To‘g‘ri javob indekslari va baholash qoidalarini test tugamaguncha klientga yuborma.
- Natijada ball, foiz, to‘g‘ri/noto‘g‘ri/o‘tkazib yuborilgan va sarflangan vaqt ko‘rsat.
- Review sahifasida foydalanuvchi javobi, to‘g‘ri javob va izohni ko‘rsat.

ADMIN
- Mavjud backend imkoniyatlariga mos statistik dashboard, kurs CRUD, savollar banki CRUD va foydalanuvchilar ro‘yxatini taqdim et.
- Formlarni Zod bilan tekshir, xavfli amallarni tasdiqlat, yuklanish/bo‘sh/xato holatlarini ko‘rsat.
- Kategoriya/mavzu, media, rollar, audit, hisobot va sozlamalar hozir mavjud deb faraz qilma; talab tasdiqlansa service, route, controller, schema/migration, UI va docsni birgalikda yangila.

DIZAYN VA MAVZU
- Mavjud brand ranglari: ko‘k primary (#3b82f6), sariq accent (#f59e0b).
- Light: slate-50 fon, oq surface, slate-800 matn.
- Dark: slate-950 fon, slate-900 surface, slate-100 matn.
- Mavjud Tailwind class-based dark mode va localStorage mavzu saqlashini davom ettir.
- System mavzusi qo‘shilsa OS prefserensini hurmat qil.
- Inter/system sans shrift, yumaloq kartalar, aniq focus, yaxshi kontrast va semantik statuslardan foydalan.
- 320px dan 1440px+ gacha responsive dizayn qil.
- Sahifalarda loading, empty, error va success holatlarini ko‘rsat.
- Accessibility: label, alt, keyboard, focus va faqat rangga tayanmaydigan status.

API VA MA’LUMOTLAR
- Mavjud Prisma modellari: User, Course, Lesson, Video, Question, Test, UserAnswer, Progress, LessonProgress. Roles/permissions, categories/topics, bookmarks, media assets, audit logs va site settings hozirgi schema’da yo‘q; zarur bo‘lsa migratsiya bilan qo‘sh.
- API javobi { success, data } yoki { success, message, errors } formatida bo‘lsin.
- HTTP controller faqat request/response bilan shug‘ullansin; biznes logika service qatlamida bo‘lsin.
- Frontend API manzili VITE_API_URL orqali sozlansin.
- Production sahifalarida mock data bilan real API ma’lumotlarini aralashtirma.
- Video faylini Node serverga yuklama; tashqi storage/CDN URL saqla.

XAVFSIZLIK
- Parolni bcrypt orqali hashla, token va maxfiy qiymatlarni log/API javobiga chiqarmagin.
- Inputlarni Zod bilan tekshir; auth, admin rol, egasi bo‘lish va rate limitni serverda tekshir.
- Test javoblarini server baholasin.
- JWT_SECRET, DATABASE_URL va boshqa maxfiy sozlamalar faqat muhit o‘zgaruvchilarida bo‘lsin.

ISHLAB CHIQISH USULI
- O‘zgarishni kichik, mantiqiy bosqichlarga bo‘l.
- API kontrakti o‘zgarsa frontend types/service, backend endpoint va docsni sinxron yangila.
- Prisma sxemasi o‘zgarsa migration va client holatini yangila.
- Repozitoriy qoidasiga muvofiq tegishli typecheck/build/testni bajar; natijani yakunda ayt.
- README/docsni yangi sozlama, route yoki API bilan yangila.
- Ish tugagach o‘zgargan fayllar, asosiy qarorlar va tekshiruv natijalarini qisqa bayon qil.
```

## 12. Media, xavfsizlik va qabul qilish mezonlari

Quyidagi talablar yuborilgan texnik topshiriqdan qo‘shilgan va media/auth funksiyalari ishlab chiqilayotganda dizayn mezoni bo‘lishi kerak. Ular bugungi kodda to‘liq mavjud degani emas.

### Media fayllar

- Video faylini Node.js serverga yuklamang; loyiha qoidasi bo‘yicha tashqi CDN/video storage URL ishlating.
- Kelajakda yopiq kontent yoki foydalanuvchi fayli kerak bo‘lsa private object storage ishlat, DB’da public URL emas provider ID/storage key va metadata saqla.
- Upload endpointda auth, admin huquqi, hajm, MIME va faylning haqiqiy mazmunini tekshir; zarur bo‘lsa zararli fayl skanerini qo‘sh.
- Signed URL/token qisqa muddatli va tegishli foydalanuvchi/resurs bilan cheklangan bo‘lsin. Player URL’ini yashirishning o‘zi himoya emas.
- Brauzerda ko‘rinadigan kontentni ko‘chirishdan 100% himoyalash mumkin deb va’da berma.

### Qo‘shimcha xavfsizlik tavsiyalari

- Cookie/session strategiyasi, CSRF himoyasi va refresh/logout oqimini hozirgi JWT amalga oshirilishiga mos ravishda aniqlash.
- Egasi bo‘lish tekshiruvlari orqali IDOR’ni, login va password reset uchun rate limit orqali brute force’ni cheklash.
- Production’da HTTPS, mos CORS, CSP/security headerlar, secret manager va dependency monitoring ishlatish.
- Adminning yuqori xavfli amallarini audit qilish; minimal vakolat tamoyilini qo‘llash.
- Backup nusxasini yaratish bilan cheklanmay, tiklashni ham vaqti-vaqti bilan sinash.
- 2FA, superadmin/moderator RBAC va sessiya boshqaruvi hozir mavjud deb faraz qilinmasin; talab bo‘lsa alohida rejalashtirilsin.

### Qabul qilish mezonlari

- Marshrutlar va foydalanuvchi oqimlari kutilgan layout va role tekshiruvlari bilan ishlaydi.
- Light/dark rejim saqlanadi, sahifalar mobil va desktopda foydalanishga yaroqli.
- Admin API’ga admin bo‘lmagan foydalanuvchi kira olmaydi; frontend menyusini yashirish server authorization o‘rnini bosa olmaydi.
- Testning to‘g‘ri javobi ham, yakuniy natijasi ham server tomonidan aniqlanadi.
- Xatolik/loading/empty holatlari tushunarli; maxfiy kalitlar va stack trace javobga/logga chiqmaydi.
- Tegishli tekshiruv/build/typecheck natijalarini qayd et; bajarilmagan sinovni bajarildi deb yozma.

## 13. Bosqichma-bosqich ishlab chiqish rejasi

1. **Audit va MVP aniqlash:** mavjud kod va route’larni tasdiqlash, bo‘shliqlarni ro‘yxatlash, birinchi versiya scope’ini tanlash.
2. **Kontrakt va sxema:** faqat kerakli API/model o‘zgarishlarini belgilash; migratsiya xavfini ko‘rib chiqish.
3. **Auth va access control:** foydalanuvchi oqimi, admin ruxsati, egasi bo‘lish, rate limit va xatolar.
4. **Asosiy o‘quv oqimi:** kurs → dars → video → test → server hisoblagan natija → review.
5. **Dashboard va progress:** tarix, statistika, profil va reyting API/UI qismlarini bog‘lash.
6. **Admin MVP:** backendda mavjud kurs/savol/user/statistika imkoniyatlarini route va formalar bilan ulash.
7. **Dizayn va accessibility:** rang tokenlari, light/dark, responsive, keyboard va holatlar.
8. **Qo‘shimcha imkoniyatlar:** tasdiqlangan categories/rules/road signs/bookmark/media library talablarini alohida qo‘shish.
9. **Production tayyorgarligi:** monitoring, backup/restore, privacy/terms, xavfsizlik tekshiruvi va deploy.

## 14. AI uchun kichik qo‘shimcha promptlar

Quyidagi promptlar asosiy master promptni almashtirmaydi; tegishli ish paytida alohida beriladi.

### Arxitektura audit prompti

```text
E-Avto repozitoriysidagi amaldagi kodni audit qil. AGENTS.md va loyiha hujjatlarini o‘qi. Mavjud frontend/backend steki, ishlayotgan route’lar, API, Prisma modellari, sahifalar va yetishmayotgan imkoniyatlarni “mavjud / qisman / reja” jadvalida ko‘rsat. Next.js yoki boshqa frameworkga migratsiyani o‘z-o‘zidan taklif qilma; avval eng kam xatarli MVP ketma-ketligini ber. Kodni o‘zgartirishdan oldin xulosani bildir.
```

### UI va ranglar prompti

```text
E-Avto’ning mavjud React + Tailwind interfeysini saqla. Light ranglar: fon #F8FAFC, karta #FFFFFF, matn #0F172A, primary #2563EB; dark ranglar: fon #0B1220, karta #111827, matn #F8FAFC, primary #60A5FA. Tokenlardan foydalan, 320px dan boshlab responsive qil, WCAG kontrast, keyboard focus, loading/empty/error holatlarini tekshir. Mavjud UI’ni sababsiz qayta yozma.
```

### Test tizimi prompti

```text
Mavjud Express/Prisma test API’ni audit qilib, test sessiyasi, javob yuborish, yakunlash, natija va review oqimini frontend bilan sinxronla. To‘g‘ri javob indeksini sessiya davomida mijozga bermagin. Ball va o‘tish holatini service qatlamida server hisoblasin. Auth, egasi bo‘lish, boshqa foydalanuvchi test ID’si, timeout va takroriy submit holatlarini qamrab ol.
```

### Media himoyasi prompti

```text
Loyiha qoidalarini saqla: video faylini Node serverga yuklama, tashqi storage/CDN URL ishlat. Agar private rasm/fayl upload talab qilinsa, provider va storage arxitekturasini avval tavsiya qil; server-side auth, role, MIME/content/size tekshiruvi va qisqa muddatli signed URL oqimini rejalashtir. Maxfiy fayl public papkaga tushmasin. Haqiqiy media provider sozlanmagan bo‘lsa, integratsiyani tayyor deb ko‘rsatma.
```

### Admin UI prompti

```text
Backendda amalda mavjud admin endpointlarni aniqlab, /admin dashboard, kurslar, savollar va foydalanuvchilar sahifalarini shu API bilan bog‘la. Serverda admin middleware majburiy qolsin. Mavjud bo‘lmagan kategoriya, media, audit, role yoki backup API uchun uydirma frontend oqimi yaratma; zarur bo‘lsa to‘liq vertikal slice (schema, migration, service, controller, route, UI, docs) rejasini yoz.
```

### Xavfsizlik auditi prompti

```text
Backend va frontenddagi auth, JWT/cookie, admin role, egasi bo‘lish/IDOR, Zod input validation, rate limit, CORS, secretlar, test javoblari va media URL oqimini ko‘rib chiq. Topilmalarni xavf darajasi, fayl/endpoint, ta’sir va tuzatish bilan bayon qil. Koddan oldin loyiha yo‘riqnomalariga amal qil. Bajarilmagan testni bajarildi deb ko‘rsatma.
```

## 15. Arxitekturani o‘zgartirish haqidagi qaror

Foydalanuvchi yuborgan manbada Next.js + App Router va Prisma yoki Drizzle tavsiya qilingan. Bu mazkur repozitoriy bilan bir xil emas. Hozirgi loyiha Vite + React Router + Express + Prisma asosida ishlaydi. Shu sabab ushbu texnik topshiriq amaldagi stekni asosiy deb oladi. Next.js’ga migratsiya alohida katta loyiha qarori: routing, API, deploy, auth, test va jamoa tajribasiga ta’sirini baholamasdan master prompt orqali migratsiya boshlanmasin.

Auth.js, Cloudflare R2/Stream, Vitest, Playwright, shadcn/ui, 2FA, kengaytirilgan RBAC, private media tokenlari, audit log va backup dashboardi manbadagi tavsiyalardir. Ular o‘rnatilgan yoki sozlangan deb tushunilmasin; xizmat tanlovi, narxi va konfiguratsiyasi joriy qilish bosqichida aniqlanadi.

## 16. Yakuniy eslatmalar

- Avval kichik MVP oqimini yakunlab, keyin qo‘shimcha sahifa va xavfsizlik imkoniyatlarini bosqichma-bosqich qo‘sh.
- Test savollarining manbasi va foydalanish huquqlarini tekshir.
- Maxfiylik siyosati, foydalanish shartlari va ma’lumotlarni saqlash muddatini biznes talablariga qarab yoz.
- Production oldidan storage/video provayderi, hosting va ularning joriy tariflarini tasdiqla.
- Backup tiklash, xavfsizlik tekshiruvi va monitoringni ishga tushirish rejasiga kirit.
- Loyiha stekini yoki ma’lumot modelini o‘zgartiradigan katta ishlarni kichik vertikal bosqichlarga ajrat.

## 17. Yakuniy mahsulot tavsifi

**E-Avto Test** — o‘zbek tilida haydovchilik nazariyasiga tayyorlaydigan moslashuvchan veb-platforma. Foydalanuvchi toifa va mavzuni tanlab qoidalarni o‘rganadi, rasmli savollarga javob beradi, vaqtli imtihon topshiradi, natija va xatolarini tahlil qiladi. Hisob egasi test tarixi, progress va profilini kuzatadi. Administrator kurs/darslar, savollar va foydalanuvchilarni boshqaradi. Sayt yorug‘/qorong‘i rejim, lotin/kirill/rus tilidagi interfeys va mobil foydalanishni qo‘llab-quvvatlaydi. Test javoblari va ruxsatlar serverda tekshiriladi. Videolar tashqi storage/CDN xizmatida saqlanadi. To‘lovlar, mobil ilova, Telegram, 2FA va kengaytirilgan analitika keyingi versiya imkoniyatlaridir.

