# E-AVTO TEST

## Project
E-Avto Test — onlayn avtomobil haydash nazariyasini o'rganish, mavzulashtirilgan video darslar, YHQ qoidalari, interaktiv test topshirish (timer, xatolar tahlili), talaba statistikasi va admin boshqaruv platformasi.

## Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router DOM v6, Zustand, Axios, Lucide React, Sonner, Framer Motion, Recharts, React Hook Form, Zod.
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, JWT, bcryptjs, Zod, Helmet, CORS, Morgan, express-rate-limit.

## Repositories
- `frontend/` — Foydalanuvchi va Admin interfeysi
- `backend/` — REST API va ma'lumotlar bazasi ORM
- `docs/` — API, Ma'lumotlar bazasi va o'rnatish qo'llanmalari
- `skills/` — (hozircha repoda mavjud emas)

## Important Invariants
1. Backend test topshirilayotgan paytda to'g'ri javoblarni frontendga chiqarmasligi shart.
2. Yakuniy test natijasi, bali va o'tish holati server tomonidan hisoblanadi.
3. Video fayllar backend serverga yuklanmaydi, faqat tashqi CDN/video storage URL saqlanadi.
4. Barcha maxfiy kalitlar (JWT_SECRET, DATABASE_URL) faqat `.env` orqali boshqariladi.
