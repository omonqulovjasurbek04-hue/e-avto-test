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
├── docs/            # Qo'shimcha hujjatlar
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 🤖 AI skilllar bilan ishlash

Loyihaga tegishli AI skilllar `skills/` katalogiga to‘liq kiritilgan. Vazifaga
mos skillni tanlash va qo‘llash tartibi [skills/PROJECT_SKILLS.md](skills/PROJECT_SKILLS.md)
hamda [AGENTS.md](AGENTS.md) fayllarida yozilgan.

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
npm run prisma:migrate
npm run prisma:seed
```

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

Frontend `http://localhost:5173`, backend esa `http://localhost:5000/api` manzilida ishlaydi.

---

## 👤 Admin kirish ma’lumotlari (seed)

| Rol   | Email            | Parol     |
|-------|------------------|-----------|
| Admin | admin@eavto.uz   | admin123  |
| User  | user@eavto.uz    | user123   |

Admin panelga `/admin` orqali kiring.

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
| GET | `/api/statistics` | Shaxsiy statistika |
| GET | `/api/leaderboard` | Reyting |
| GET | `/api/health` | API va baza holati |
| GET/POST/PUT/DELETE | `/api/admin/*` | Faqat admin (kurslar, savollar, statistika, foydalanuvchilar) |

Batafsil: `docs/api.md`.

---

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
markaziy xato handler. Admin yo‘nalishlari server tomonida ham tekshiriladi.

---

## 🚀 Production

Frontend `npm run build` bilan statik fayllarga aylantiriladi (`dist/`).
Backend `npm run build && npm run start` orqali ishga tushiriladi.
`JWT_SECRET` va `DATABASE_URL` muhit o‘zgaruvchilari orqali berilishi shart.
