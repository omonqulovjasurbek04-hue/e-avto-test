# 🚗 E-Avto Test

Onlayn avtomobil haydash nazariyasi platformasi — **video darslar**, **mavzular**,
**test topshirish**, **natija va xatolar tahlili** va **admin panel** bilan.

Loyiha ikki alohida qismdan iborat:

- `frontend/` — React + TypeScript + Vite + Tailwind CSS
- `backend/` — Node.js + Express + TypeScript + Prisma + PostgreSQL

---

## 🧰 Texnologiyalar

### Frontend
React · TypeScript · Vite · Tailwind CSS · React Router · Axios · Lucide React · React Hook Form · Zod

### Backend
Node.js · Express.js · TypeScript · PostgreSQL · Prisma (ORM) · JWT · bcryptjs · Zod · Helmet · CORS · Morgan

---

## 📁 Struktura

```
e-avto-test/
├── frontend/        # React ilovasi
├── backend/         # Express API + Prisma
├── docs/            # Hujjatlar (docs/archive — eski rejalar va promptlar)
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 📚 Hujjatlar xaritasi

| Hujjat | Nima haqida |
|---|---|
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | 18 bosqich bo‘yicha holat: nima tayyor, nima yo‘q, qarorlar |
| [TASKS.md](TASKS.md) | Qisqa vazifalar ro‘yxati va egasi hal qiladigan masalalar |
| [installation.md](installation.md) | Dev muhitni o‘rnatish |
| [TESTING.md](TESTING.md) | Testlar, ularni ishga tushirish, ogohlantirishlar |
| [PERFORMANCE.md](PERFORMANCE.md) | Katta hajmda so‘rov tezligi, topilgan va tuzatilgan sekinliklar |
| [SECURITY.md](SECURITY.md) | Xavfsizlik auditi, ochiq xavflar |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Productionga chiqarish, backup, rollback |
| [api.md](api.md) / [database.md](database.md) | API va ma’lumotlar bazasi |

## 🤖 AI agentlar bilan ishlash

Agentlar uchun qoidalar [AGENTS.md](AGENTS.md), [RULES.md](RULES.md) va
[PROJECT.md](PROJECT.md) fayllarida. Eslatma: bu fayllar `skills/` katalogini
tilga oladi, ammo u repoda mavjud emas — paydo bo‘lmaguncha e'tiborsiz qoldiring.

---

## ✅ Talablar (prerequisites)

- [Node.js LTS](https://nodejs.org/) (18+)
- [Git](https://git-scm.com/)
- [PostgreSQL](https://www.postgresql.org/) (yoki Docker orqali)
- Paket menejeri sifatida `npm`

Tekshirish:

```bash
node -v
npm -v
psql --version
```

---

## ⚡ Tez boshlash (Docker bilan PostgreSQL)

PostgreSQL ni Docker orqali ishga tushirish uchun:

```bash
docker-compose up -d
```

Bu `e_avto_test` nomli bazani `postgres / postgres` foydalanuvchisi bilan 5432-portda yaratadi.

---

## 🛠 O‘rnatish

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # .env ichidagi DATABASE_URL ni o'z muhitingizga moslang
```

`.env` misoli:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/e_avto_test"
PORT=5000
JWT_SECRET="o'zingizga_xos_uzun_maxfiy_kalit"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

Migratsiya va seed:

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Parol qoidasi: kamida 8 belgi, harf va raqam. `JWT_SECRET` productionda kamida 32 belgili
tasodifiy qiymat bo‘lishi shart (aks holda server ishga tushmaydi). `CLIENT_URL` bir nechta
originni vergul bilan qabul qiladi.

Backend ishga tushirish (dev):

```bash
npm run dev
```

### 2. Frontend

```bash
cd ../frontend
npm install
cp .env.example .env     # VITE_API_URL="http://localhost:5000/api"
npm run dev
```

Frontend **doim haqiqiy API** bilan ishlaydi. Backendsiz demo uchun `.env` ga
`VITE_USE_MOCK=true` qo‘ying (natija brauzerda hisoblanadi, ma'lumotlar saqlanmaydi);
production build’da bu o‘zgaruvchini yoqmang.

Frontend `http://localhost:5173`, backend esa `http://localhost:5000/api` manzilida ishlaydi.

---

## 👤 Demo hisoblar (faqat lokal seed)

| Rol   | Email            | Parol     |
|-------|------------------|-----------|
| Admin | admin@eavto.uz   | admin123  |
| User  | user@eavto.uz    | user123   |

Admin panel: `/admin` (dashboard, kurslar, savollar, foydalanuvchilar). Ruxsat serverda har
so‘rovda tekshiriladi. Parollarni `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` bilan o‘zgartiring;
seed productionda ishlamaydi.

---

## 🔌 API xulosa (qisqacha)

Barcha javoblar bir xil formatda:

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Xatolik", "errors": [] }
```

| Metod | Yo‘l | Izoh |
|-------|------|------|
| POST  | `/api/auth/register` | Ro‘yxatdan o‘tish |
| POST  | `/api/auth/login`     | Kirish |
| GET   | `/api/auth/me`        | Joriy foydalanuvchi |
| GET   | `/api/courses`        | Kurslar ro‘yxati |
| GET   | `/api/courses/:id`    | Kurs + darslar |
| GET   | `/api/lessons/:id`    | Dars + video + savollar |
| POST  | `/api/tests/start`    | Test boshlash |
| POST  | `/api/tests/:id/answer` | Javob yuborish |
| POST  | `/api/tests/:id/finish` | Test yakunlash (natija hisobi) |
| GET   | `/api/results`        | Foydalanuvchi natijalari |
| GET   | `/api/results/:id`    | Bitta natija + xatolar tahlili |
| GET   | `/api/profile`        | Profil progressi |
| PUT   | `/api/profile`        | Profilni tahrirlash |
| GET/PUT | `/api/progress/*` | Dars va kurs progressi |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password` | Parolni tiklash (email provayderi ulanmagan) |
| GET | `/api/statistics` | Shaxsiy statistika |
| GET | `/api/leaderboard` | Reyting |
| GET | `/api/health` | API va baza holati |
| GET/POST/PUT/DELETE | `/api/admin/*` | Faqat admin (kurslar, savollar, statistika, foydalanuvchilar) |

Batafsil: [api.md](api.md). Ma'lumotlar modeli: [database.md](database.md).

---

## 🧪 Testlar

Backend uchun integratsiya testlari haqiqiy PostgreSQL talab qiladi (alohida bo'sh baza oling, **dev bazangizni ishlatmang**):

```bash
cd backend
DATABASE_URL=<test-baza-url> npx prisma migrate deploy
TEST_DATABASE_URL=<test-baza-url> npm test
```

`TEST_DATABASE_URL` berilmasa testlar o'tkazib yuboriladi. Testlar ro'yxatdan o'tish, rollar, test oqimi (baholash,
vaqt chegarasi, idempotentlik), tokenlarni bekor qilish, Telegram kirishi va tozalash ishini qamrab oladi.

## 📜 NPM skriptlari

**Backend**
```bash
npm run dev            # tsx watch (dev server)
npm run build          # tsc -> dist
npm run start          # node dist/server.js
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run typecheck      # tsc --noEmit
npm test               # vitest (TEST_DATABASE_URL kerak)
```

**Frontend**
```bash
npm run dev
npm run build
npm run preview
npm run typecheck
```

---

## 🔒 Xavfsizlik

Helmet · CORS · JWT · bcryptjs · Zod validatsiya · rate limiting ·
markaziy xato handler (production’da ichki xatolar yashiriladi).

- Test javoblari, ball va vaqt chegarasi serverda; test davomida to‘g‘ri javob mijozga berilmaydi.
- Admin ruxsati har so‘rovda bazadan tekshiriladi.
- Token bekor qilinadi: parol almashtirilsa/tiklansa, "hamma joydan chiqish" bosilsa yoki foydalanuvchi bloklansa (`tokenVersion`).
- Parolni tiklash havolasi SMTP (`SMTP_*`) sozlangan bo‘lsa email bilan yuboriladi; aks holda faqat development konsoliga chiqadi.
- Ishlatilmagan tugallanmagan testlar va eskirgan bir martalik yozuvlar har 6 soatda avtomatik tozalanadi.
- Hozircha yo‘q: 2FA, refresh token, audit log. Token `Authorization`
  sarlavhasida (cookie yo‘q, shuning uchun CSRF yuzasi yo‘q), lekin XSS dan himoya muhim.

---

## 🚀 Production

Frontend `npm run build` bilan statik fayllarga aylantiriladi (`dist/`).
Backend `npm run build && npm run start` orqali ishga tushiriladi.
`JWT_SECRET` va `DATABASE_URL` muhit o‘zgaruvchilari orqali berilishi shart.
