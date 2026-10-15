Ha. E-Avto Test uchun **frontend + backend + database + video + server/deploy** qismini bir-biriga to‘g‘ri bog‘lash juda muhim. Ayniqsa video bo‘lgani uchun serverni videolar bilan to‘ldirib yubormaslik kerak.

Men quyidagi arxitekturani tavsiya qilaman:

```text
                    E-AVTO TEST
                         │
             ┌───────────┴───────────┐
             │                       │
        FRONTEND                  BACKEND
        React/Vite               Node/Express
             │                       │
             │       HTTPS API       │
             └──────────►────────────┘
                                     │
                                  Prisma
                                     │
                                PostgreSQL
                                     │
                              Video Storage
```

## 1. Eng optimal bepul boshlang‘ich server

| Qism     | Tavsiya                                   | Vazifasi             |
| -------- | ----------------------------------------- | -------------------- |
| Frontend | **Vercel**                                | React frontend       |
| Backend  | **Render** yoki **Railway**               | Node.js API          |
| Database | **Neon** yoki **Supabase**                | PostgreSQL           |
| Video    | **Cloudinary** yoki alohida video storage | Video                |
| Git      | **GitHub**                                | Kod                  |
| Domain   | Ixtiyoriy                                 | `e-avtotest.uz` kabi |

**Muhim:** "tekin" hostinglarda limitlar bo‘ladi. Ayniqsa backend server, database, video storage va trafik bo‘yicha bepul tariflar vaqt o'tishi bilan o‘zgarishi mumkin. Shuning uchun deployment promptida provider konfiguratsiyasini environment variables orqali boshqaradigan qilib qurish kerak.

---

# 2. Frontend va Backend qanday bog‘lanadi?

Frontend `.env`:

```env
VITE_API_URL=https://YOUR-BACKEND-DOMAIN/api
```

Masalan:

```text
https://e-avto-api.example.com/api
```

Axios:

```text
React
 ↓
Axios
 ↓
https://e-avto-api.example.com/api
 ↓
Express
 ↓
Controller
 ↓
Service
 ↓
Prisma
 ↓
PostgreSQL
```

Masalan login:

```text
POST /api/auth/login
```

Frontend yuboradi:

```json
{
  "email": "user@example.com",
  "password": "********"
}
```

Backend:

```text
Express
 ↓
Validation
 ↓
Auth Service
 ↓
Database
 ↓
JWT
 ↓
Frontend
```

---

# 3. Eng muhim masala — CORS

Backend `.env`:

```env
CLIENT_URL=https://YOUR-FRONTEND-DOMAIN
```

Backend faqat shu frontendga ruxsat bersin.

Development:

```env
CLIENT_URL=http://localhost:5173
```

Production:

```env
CLIENT_URL=https://your-frontend-domain.com
```

`*` qilib hamma saytga ochib qo‘yish production uchun yaxshi emas.

---

# 4. Server "qotib qolmasligi" uchun

Bu yerda eng katta xato — **videolarni Node.js server orqali tarqatish**.

❌ Bunday qilma:

```text
React
 ↓
Node.js
 ↓
5 GB video
 ↓
User
```

Agar 100 ta odam video ko‘rsa:

```text
Node.js
████████████████████
CPU/RAM/Network yuklanadi
```

Yaxshisi:

```text
React
  │
  ├──────────────► Node.js API
  │
  └──────────────► Video CDN/Storage
                         │
                         ▼
                       Video
```

Backend faqat:

```text
videoUrl
title
duration
thumbnail
```

kabi ma'lumotlarni beradi.

---

# 5. Backendni optimallashtirish

Quyidagilar bo‘lishi kerak:

```text
Helmet
CORS
Rate Limit
Zod Validation
JWT
bcrypt
Central Error Handler
Pagination
Database Index
Prisma optimization
Compression
Health Check
Logging
```

### API'ni ortiqcha yuklamaslik

Masalan:

```text
GET /api/questions
```

bilan 10 000 ta savolni birdan yuborma.

Buning o‘rniga:

```text
?page=1
&limit=20
```

ishlat.

---

# 6. Database optimizatsiyasi

Indexlar:

```text
users.email

courses.slug

lessons.courseId

questions.lessonId

tests.lessonId

testAttempts.userId

testAttempts.testId

progress.userId

progress.lessonId
```

Bu qidiruvlarni tezlashtiradi.

---

# 7. Test serverni qotirmasligi

User 20 ta savolni ishlayotganida har bir bosishda database'ga ortiqcha request yuborma.

❌

```text
Savol 1 → API
Savol 2 → API
Savol 3 → API
...
Savol 20 → API
```

Yaxshiroq:

```text
Start Test
     ↓
20 questions
     ↓
Frontend state
     ↓
User ishlaydi
     ↓
Finish Test
     ↓
Backend calculate
```

Lekin xavfsizlik uchun backend test attempt va vaqtni nazorat qiladi.

---

# 8. Test natijasini Frontend hisoblamasin

Frontend:

```text
17/20
```

deb o‘zi qaror qilmasin.

Backend:

```text
User answers
       ↓
Database correct answers
       ↓
Compare
       ↓
Score
       ↓
Percentage
       ↓
Passed / Failed
```

Frontend faqat natijani ko‘rsatadi.

---

# 9. Server uchun health check

Backend:

```text
GET /api/health
```

javob:

```json
{
  "success": true,
  "status": "ok",
  "service": "e-avto-test-api"
}
```

Deployment platformasi serverni tekshirish uchun bundan foydalanishi mumkin.

---

# 10. Frontend build

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
```

Vercel/hostingga `dist` build avtomatik chiqarilishi mumkin.

---

# 11. Backend production

Backendda:

```text
NODE_ENV=production
PORT=...
DATABASE_URL=...
JWT_SECRET=...
CLIENT_URL=...
```

bo‘ladi.

Portni hosting beradi, shuning uchun:

```ts
const PORT = process.env.PORT || 5000;
```

ishlat.

`localhost:5000` ga productionda qattiq bog‘lab qo‘yma.

---

# 12. GitHub orqali deployment

Eng qulay usul:

```text
VS Code
   ↓
Git
   ↓
GitHub
   ↓
Vercel ──────► Frontend
   │
   └── Backend hosting ──► Node.js
                              │
                              ▼
                          PostgreSQL
```

Kodga o‘zgartirish kiritganingda:

```bash
git add .
git commit -m "update"
git push
```

Deployment avtomatik yangilanadi.

---

# 🚀 AI uchun tayyor SERVER + API INTEGRATION MASTER PROMPT

Quyidagi promptni Cursor/Claude/ChatGPT coding agentga berishingiz mumkin:

# E-AVTO TEST — FULL DEPLOYMENT & API INTEGRATION

Sen Senior Full-Stack Developer, DevOps Engineer va System Architect sifatida ishlaysan.

Menda tayyor:

frontend/
backend/

papkalari mavjud.

Frontend:
React + TypeScript + Vite + Tailwind CSS

Backend:
Node.js + Express + TypeScript + Prisma

Database:
PostgreSQL

Endi frontend va backendni to‘liq bog‘la va production deploymentga tayyorla.

---

# 1. ASOSIY MAQSAD

Quyidagi arxitekturani yarat:

Frontend
↓
HTTPS REST API
↓
Backend
↓
Prisma
↓
PostgreSQL

Video:

Frontend
↓
Video CDN/Storage

Backend video fayllarni stream qilmasin.

Backend faqat video metadata va URL bilan ishlasin.

---

# 2. FRONTEND API CONFIGURATION

Frontend `.env`:

VITE_API_URL=[http://localhost:5000/api](http://localhost:5000/api)

Production:

VITE_API_URL=[https://BACKEND-DOMAIN/api](https://BACKEND-DOMAIN/api)

Axios instance yarat:

src/services/api.ts

Base URL:

import.meta.env.VITE_API_URL

Axios interceptor yarat.

Request:

Authorization: Bearer TOKEN

headerini qo‘shish imkoniyati bo‘lsin.

401 bo‘lsa authentication state tozalansin va user login sahifasiga yo‘naltirilsin.

---

# 3. BACKEND ENVIRONMENT

Backend `.env`:

PORT=5000

NODE_ENV=development

DATABASE_URL=

JWT_SECRET=

JWT_EXPIRES_IN=7d

CLIENT_URL=[http://localhost:5173](http://localhost:5173)

Productionda:

PORT hosting tomonidan berilsin.

CLIENT_URL production frontend domain bo‘lsin.

Secretlarni source code ichiga yozma.

`.env` GitHubga yuborilmasin.

`.env.example` yarat.

---

# 4. CORS

Development:

[http://localhost:5173](http://localhost:5173)

Production:

faqat production frontend domainiga ruxsat ber.

CORS `*` ishlatmaslikka harakat qil.

Environment variable orqali boshqar.

---

# 5. API STRUCTURE

API prefix:

/api

Auth:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Courses:

GET /api/courses
GET /api/courses/:id

Lessons:

GET /api/courses/:courseId/lessons
GET /api/lessons/:id

Videos:

GET /api/lessons/:lessonId/video

Tests:

POST /api/tests/:testId/start
POST /api/tests/attempts/:attemptId/answers
POST /api/tests/attempts/:attemptId/finish

Results:

GET /api/results/:attemptId
GET /api/results/:attemptId/review

Profile:

GET /api/users/me
PUT /api/users/me

Progress:

GET /api/users/me/progress
PUT /api/progress/:lessonId

Leaderboard:

GET /api/leaderboard

Admin:

/api/admin/*

---

# 6. API RESPONSE STANDARD

Success:

{
"success": true,
"data": {}
}

Error:

{
"success": false,
"message": "Error message",
"errors": []
}

Barcha endpointlar bir xil response structure ishlatsin.

---

# 7. AUTHENTICATION

JWT authentication ishlat.

Login:

Frontend
↓
POST /auth/login
↓
Backend
↓
Database
↓
JWT
↓
Frontend

Protected API requestlarda:

Authorization: Bearer TOKEN

ishlat.

Password bcrypt bilan hash qilinsin.

---

# 8. AUTH STATE

Frontend Zustand auth store ishlatsin.

State:

user
token
isAuthenticated
login
logout
restoreSession

Refresh bo‘lganda session tiklash architecture'ga mos bo‘lsin.

Token bilan ishlashda xavfsizlikni hisobga ol.

---

# 9. VIDEO ARCHITECTURE

MUHIM:

Backend serverga katta MP4 fayllarni joylama.

Backend:

videoUrl
thumbnail
title
duration
provider

metadata qaytarsin.

Video frontenddan storage/CDN URL orqali ochilsin.

Arxitektura:

React
↓
GET /api/lessons/:id/video
↓
Backend
↓
video metadata
↓
React
↓
CDN video URL
↓
User

---

# 10. SERVER PERFORMANCE

Server qotmasligi uchun:

* video backend orqali o'tmasin;
* pagination ishlat;
* database indexlardan foydalan;
* katta JSON response yuborma;
* unnecessary database querylarni kamaytir;
* Prisma select/include'dan oqilona foydalan;
* rate limiting ishlat;
* compression ishlat;
* request timeout strategy qo‘llashga tayyor architecture yarat;
* health check yarat.

---

# 11. TEST OPTIMIZATION

Test boshlanganda:

POST /api/tests/:testId/start

Backend:

* attempt yarat;
* start time saqla;
* test duration saqla;
* savollarni qaytar;
* correct answerni qaytarmaslik.

Frontend:

* timer;
* selected answers;
* navigation

ni local state/Zustandda boshqarsin.

Test tugaganda:

POST /api/tests/attempts/:attemptId/finish

Backend:

* vaqtni tekshir;
* javoblarni tekshir;
* score hisobla;
* percentage hisobla;
* passed/failed;
* result saqla.

---

# 12. TIMER SECURITY

Frontend timerga ishonma.

Backend database'da:

startedAt

saqlasin.

Finish vaqtida:

currentTime - startedAt

hisoblab test durationdan oshganini tekshir.

Agar vaqt tugagan bo‘lsa:

status = EXPIRED

qil.

---

# 13. DATABASE PERFORMANCE

Quyidagilarga index qo‘sh:

users.email
courses.slug
lessons.courseId
questions.lessonId
tests.lessonId
testAttempts.userId
testAttempts.testId
userAnswers.attemptId
progress.userId
progress.lessonId
createdAt

N+1 querylardan qoch.

Keraksiz `include` ishlatma.

Faqat kerakli fieldlarni `select` qil.

---

# 14. PAGINATION

Quyidagi API'larda pagination bo‘lsin:

courses
lessons
questions
users
results
leaderboard

Format:

?page=1&limit=20

Response:

{
"success": true,
"data": [],
"pagination": {
"page": 1,
"limit": 20,
"total": 100,
"totalPages": 5
}
}

---

# 15. RATE LIMITING

Alohida rate limit:

/auth/login
/auth/register
/password reset
/test finish

API abuse'dan himoya qil.

---

# 16. SECURITY

Helmet

CORS

Rate limiting

JWT

bcrypt

Zod

Environment variables

Input validation

Central error handling

Admin authorization

ishlat.

Password, JWT secret yoki database credentialsni response/loglarda ko‘rsatma.

---

# 17. HEALTH CHECK

Yarat:

GET /api/health

Response:

{
"success": true,
"status": "ok",
"service": "e-avto-test-api"
}

Database health check ham architecture'ga mos bo‘lsin.

---

# 18. PRODUCTION SERVER

Server `process.env.PORT` orqali port olsin.

Masalan:

const PORT = process.env.PORT || 5000;

Productionda localhostga hardcode qilma.

Server:

0.0.0.0

ga bind qilish hosting talab qilsa, shunga mos ishlasin.

---

# 19. FRONTEND PRODUCTION

Frontend build:

npm run build

Vite `dist/` yaratadi.

Production environment:

VITE_API_URL=[https://BACKEND-DOMAIN/api](https://BACKEND-DOMAIN/api)

bo‘lsin.

---

# 20. BACKEND PRODUCTION

Backend:

npm run build

keyin:

npm start

orqali ishlasin.

Productionda:

NODE_ENV=production

bo‘lsin.

---

# 21. GITHUB

Repository:

e-avto-test

Struktura:

frontend/
backend/

GitHubga yuborilmasin:

node_modules/
.env
dist/

.gitignore to‘g‘ri yarat.

---

# 22. DEPLOYMENT

Frontend uchun bepul boshlang‘ich deployment sifatida Vercel kabi platformani ishlatishga tayyorla.

Backend uchun Render/Railway kabi Node.js hostingga deploy qilishga tayyorla.

PostgreSQL uchun Neon yoki Supabase kabi managed PostgreSQL xizmatlariga ulanishga tayyorla.

Video uchun Cloudinary yoki mos video storage/CDN architecture yarat.

Muhim:

Provider-specific credentiallarni source code ichiga yozma.

Environment variables orqali boshqar.

Bepul tariflar, sleep/idle limitlari, database/storage/trafik limitlari bo‘lishi mumkinligini README'da yoz.

---

# 23. DEPLOYMENT ENV VARIABLES

Frontend:

VITE_API_URL

Backend:

NODE_ENV
PORT
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
CLIENT_URL

Video:

VIDEO_STORAGE_URL

yoki providerga mos environment variables.

---

# 24. DATABASE DEPLOYMENT

Production database uchun:

DATABASE_URL

environment variable orqali ber.

Deploydan keyin:

npx prisma generate

va production migration:

npx prisma migrate deploy

ishlat.

Developmentda:

npx prisma migrate dev

ishlat.

Productionda `migrate dev` ishlatma.

---

# 25. SEED

Development uchun:

npx prisma db seed

Production seedni avtomatik ishga tushirma, agar xavfsiz va idempotent qilinmagan bo‘lsa.

---

# 26. FRONTEND ROUTES

Production SPA routing uchun hosting konfiguratsiyasini hisobga ol.

Masalan:

/courses
/tests
/profile

to‘g‘ridan-to‘g‘ri ochilganda 404 bo‘lmasin.

---

# 27. API ERROR HANDLING

Frontend:

loading
success
error
empty

state'larini boshqarsin.

Backend:

400
401
403
404
409
422
429
500

statuslarini to‘g‘ri ishlatsin.

---

# 28. NETWORK FAILURE

Frontend internet uzilib qolsa:

"Internet connection error"

ko‘rsatsin.

Retry button bo‘lsin.

Test paytida user javoblari Zustand/local persistence orqali vaqtincha saqlanishi mumkin.

---

# 29. TEST SUBMISSION SAFETY

User "Finish Test"ni ikki marta bosib yuborsa:

duplicate result yaratma.

Backend idempotent yoki transaction-safe architecture ishlatsin.

Attempt allaqachon COMPLETED bo‘lsa:

oldingi resultni qaytar yoki aniq conflict response ber.

---

# 30. SERVER CRASH PROTECTION

Unhandled promise rejectionlarni nazorat qil.

Global error handler yarat.

Graceful shutdown:

SIGTERM
SIGINT

signal'larini boshqar.

Database connectionni to‘g‘ri yop.

Production loglarda secretlarni ko‘rsatma.

---

# 31. LOGGING

Development:

request logs

Production:

structured/minimal logs

Password, token, DATABASE_URL kabi maxfiy ma'lumotlarni log qilma.

---

# 32. DEPLOYMENT CHECKLIST

Deploydan oldin tekshir:

[ ] npm run build
[ ] TypeScript errors yo‘q
[ ] .env GitHubda yo‘q
[ ] CORS to‘g‘ri
[ ] DATABASE_URL production
[ ] JWT_SECRET production secret
[ ] CLIENT_URL production frontend
[ ] Health check ishlaydi
[ ] Prisma generate ishlaydi
[ ] Prisma migrate deploy ishlaydi
[ ] Auth ishlaydi
[ ] Courses ishlaydi
[ ] Lessons ishlaydi
[ ] Test start ishlaydi
[ ] Test finish ishlaydi
[ ] Results ishlaydi
[ ] Video URL ishlaydi
[ ] Mobile frontend ishlaydi

---

# 33. LOCAL DEVELOPMENT

Terminal 1:

cd backend
npm install
npm run dev

Terminal 2:

cd frontend
npm install
npm run dev

Frontend:

[http://localhost:5173](http://localhost:5173)

Backend:

[http://localhost:5000](http://localhost:5000)

Health:

[http://localhost:5000/api/health](http://localhost:5000/api/health)

---

# 34. FINAL ARCHITECTURE

LOCAL:

React
↓
localhost:5000/api
↓
Express
↓
Prisma
↓
PostgreSQL

PRODUCTION:

Vercel Frontend
↓
HTTPS
↓
Node.js Backend
↓
Prisma
↓
Managed PostgreSQL

Video:

Frontend
↓
Video CDN/Storage

Backend server video trafficni o‘zidan o'tkazmasin.

---

# 35. FINAL RESULT

Menga quyidagi holatda ishlaydigan production-ready architecture tayyorla:

Frontend:
React + TypeScript + Vite + Tailwind

Backend:
Node.js + Express + TypeScript

Database:
PostgreSQL + Prisma

Authentication:
JWT + bcrypt

Validation:
Zod

Security:
Helmet + CORS + Rate Limit

Deployment:
Frontend hosting + Node.js hosting + Managed PostgreSQL + Video Storage/CDN

Frontend va backend to‘liq REST API orqali bog‘langan bo‘lsin.

Barcha URL'lar environment variables orqali boshqarilsin.

Local va production konfiguratsiyasi alohida bo‘lsin.

Server video fayllarni tarqatmasin.

Database querylar optimallashtirilsin.

Test timer backend tomonidan ham tekshirilsin.

API error handling to‘liq bo‘lsin.

Health check mavjud bo‘lsin.

Graceful shutdown mavjud bo‘lsin.

Production build xatosiz ishlasin.

README ichida lokal ishga tushirish va deploymentning barcha bosqichlarini aniq tushuntir.

### 🔥 Yakuniy arxitektura

```text
                         USER
                          │
                          ▼
                  ┌──────────────┐
                  │   VERCEL     │
                  │ React/Vite   │
                  └──────┬───────┘
                         │
                       HTTPS
                         │
                         ▼
                  ┌──────────────┐
                  │   BACKEND    │
                  │ Node/Express │
                  └──────┬───────┘
                         │
                       Prisma
                         │
                         ▼
                  ┌──────────────┐
                  │ PostgreSQL   │
                  └──────────────┘


             VIDEO TRAFFIC
                  │
                  ▼
            Video Storage/CDN
                  │
                  ▼
                 USER
```

**Eng muhim qoida:** serverni qotirmaslik uchun **Node.js serverga MP4 videolarni yuklamang**. Backend API faqat ma'lumot va video URL beradi; videoni alohida storage/CDN tarqatadi. Shu arxitektura E-Avto Test'ni keyinchalik 10 ta emas, ancha ko‘p foydalanuvchiga kengaytirishni osonlashtiradi.
