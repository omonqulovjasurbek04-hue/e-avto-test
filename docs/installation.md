# O‘rnatish — E-Avto Test (ishlab chiqish muhiti)

Productionga chiqarish uchun `docs/DEPLOYMENT.md`; testlar uchun `docs/TESTING.md`.

## 0. Talablar
Node.js 20+, npm, PostgreSQL 16+ (Docker yoki lokal), Git. E2E uchun Microsoft Edge yoki Chrome.

## 1. PostgreSQL
Docker orqali (`docker-compose.yml` ildizda):
```bash
docker compose up -d
```
Yoki lokal PostgreSQL o‘rnating va ikkita bo‘sh baza yarating: `e_avto_test` (ishlash) va `e_avto_test_ci` (testlar).
Docker/o‘rnatuvchi bo‘lmasa, sinov uchun npm paketi `embedded-postgres` ishlaydi (loyiha tashqarisida, faqat dev).

## 2. Backend
```bash
cd backend
npm install
cp .env.example .env          # DATABASE_URL va JWT_SECRET ni to‘ldiring
npx prisma generate
npx prisma migrate deploy     # migratsiyalarni qo‘llaydi (yangi migratsiya yozishda: npm run prisma:migrate -- --name <nom>)
npm run prisma:seed           # demo ma’lumotlar (production’da bloklangan)
npm run dev                   # http://localhost:5000/api/health
```
> **Diqqat:** kompyuterda boshqa loyiha uchun global `DATABASE_URL` bo‘lsa, `prisma` va `vitest` buyruqlari uni oladi.
> Dev serverda `backend/.env` ustun (`src/config/env.ts`), lekin Prisma CLI va testlarga qiymatni o‘zingiz bering:
> `DATABASE_URL="postgresql://…/e_avto_test?schema=public" npx prisma migrate deploy`.

## 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:5000/api
npm run dev                   # http://localhost:5173
```

## 4. Birinchi kirish
Seed demo akkauntlari faqat lokal uchun: `admin@eavto.uz` / `admin123`, `user@eavto.uz` / `user123`
(`SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` bilan almashtiriladi).
Seedsiz muhitda birinchi superadmin:
```bash
BOOTSTRAP_EMAIL=owner@example.uz BOOTSTRAP_PASSWORD='<12+ belgi, katta/kichik harf, raqam>' npm run create-superadmin
```

## 5. Tekshirish
```bash
cd backend  && npm run typecheck && npm run lint
            && DATABASE_URL=<test baza> TEST_DATABASE_URL=<test baza> npm test
cd frontend && npm run typecheck && npm run lint && VITE_API_URL=https://api.example.uz/api npm run build
cd e2e      && npm install && npx playwright test     # backend + frontend’ni o‘zi ishga tushiradi (e_avto_test_e2e bazasi)
```

## 6. Foydali
- To‘lov sinovi: `PAYMENT_PROVIDER=mock` va `PAYMENT_MOCK_SECRET` (faqat dev/test; productionda taqiqlangan).
- Pullik kirishni sinash: `ENFORCE_ENROLLMENT=true`.
- Video yuklash: `MEDIA_UPLOAD_ENABLED=true` (standartda o‘chiq; `docs/SECURITY.md` ga qarang).
- Backendsiz demo: frontend `.env` ga `VITE_USE_MOCK=true` (production build’da taqiqlangan).
