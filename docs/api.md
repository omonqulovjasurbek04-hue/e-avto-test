# API hujjatlari — E-Avto Test

Bazaviy manzil: `http://localhost:5000/api`

Barcha javoblar:

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Xatolik", "errors": [] }
```

Autentizatsiya: `Authorization: Bearer <token>` sarlavhasi (himoyalangan yo‘llar uchun).

## Auth

| Metod | Yo‘l | Body | Javob |
|-------|------|------|-------|
| POST | `/api/auth/register` | `{ name, email, password }` | `{ user, token }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ user, token }` |
| GET  | `/api/auth/me` | — | `User` |

## Courses / Lessons

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/courses` | Kurslar ro‘yxati (`lessonCount` bilan) |
| GET | `/api/courses/:id` | Kurs + darslar |
| GET | `/api/lessons/:id` | Dars + `videoUrl` + savollar (javobsiz) |

## Test tizimi

| Metod | Yo‘l | Body | Izoh |
|-------|------|------|------|
| POST | `/api/tests/start` | `{ courseId?, count? }` | `{ test:{id,totalQuestions}, questions:[{id,text,options,order}] }` |
| POST | `/api/tests/:id/answer` | `{ questionId, selectedIndex }` | `{ success:true }` |
| POST | `/api/tests/:id/finish` | `{ timeSpent? }` | `TestResult` (server hisoblaydi) |

`count` odatda 20, mavjud savollar sonigacha cheklanadi. To‘g‘ri javoblar frontend’ga
berilmaydi; natija faqat `/finish` chaqirilganda hisoblanadi. O‘tish chegarasi: **70%**.

## Natijalar

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/results` | Foydalanuvchi natijalari ro‘yxati |
| GET | `/api/results/:id` | Natija + `answers[]` (to‘g‘ri/tanlangan javoblar, tahlil) |

## Profil

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/profile` | `{ progress: [{ course, pct }] }` |
| PUT | `/api/profile` | `{ name?, email? }` -> `User` |

## Progress, statistika va reyting

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/progress` | Kurslar kesimida foydalanuvchi progressi |
| GET | `/api/progress/:lessonId` | Bitta darsning progressi |
| PUT | `/api/progress/:lessonId` | `{ percent: 0..100 }` — progress faqat oshadi |
| GET | `/api/statistics` | Joriy foydalanuvchi statistikasi |
| GET | `/api/leaderboard` | Ballar bo‘yicha reyting |

## Sog‘liq tekshiruvi

`GET /api/health` API va PostgreSQL ulanishi holatini qaytaradi. Bu endpoint
autentifikatsiyasiz bo‘lib, deployment platformasining health-check’i uchun mo‘ljallangan.

## Admin (faqat `ADMIN`)

| Metod | Yo‘l | Izoh |
|-------|------|------|
| GET | `/api/admin/users` | Foydalanuvchilar |
| GET/POST/PUT/DELETE | `/api/admin/courses` | Kurslar CRUD |
| GET/POST/PUT/DELETE | `/api/admin/questions` | Savollar CRUD (`options: string[]`) |
| GET | `/api/admin/statistics` | `{ totalUsers, totalCourses, totalQuestions, totalTests, averageScore, passRate }` |
