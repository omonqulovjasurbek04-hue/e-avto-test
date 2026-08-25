# O‘rnatish — E-Avto Test

Batafsil ko‘rsatmalar asosiy `README.md` faylida. Qisqacha:

## 1. PostgreSQL

Docker orqali:

```bash
docker-compose up -d
```

yoki lokal PostgreSQL o‘rnatib, `e_avto_test` bazasini yarating.

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 4. Tekshirish

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/health
- Admin: `admin@eavto.uz` / `admin123`
- User: `user@eavto.uz` / `user123`
