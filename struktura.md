Ha. Quyidagi variantni **E-Avto Test** uchun to‘liq boshlang‘ich texnik topshiriq + o‘rnatish prompti sifatida ishlatishingiz mumkin. Men loyihani **Frontend va Backend alohida**, video + test + admin panel + PostgreSQL bilan optimal ishlaydigan qilib tuzdim.

# 🚗 E-AVTO TEST — TO‘LIQ LOYIHA STRUKTURASI

## 1. Tanlangan texnologiyalar

### Frontend

```text
React              — UI
TypeScript         — xavfsiz va tartibli kod
Vite               — tez build/dev server
Tailwind CSS       — dizayn
React Router       — routing
Axios              — Backend API bilan aloqa
Lucide React       — iconlar
React Hook Form    — formalar
Zod                — validation
```

### Backend

```text
Node.js             — backend runtime
Express.js          — REST API
TypeScript          — backend kodi
PostgreSQL          — database
Prisma              — ORM
JWT                 — authentication
bcrypt              — password hashing
Zod                 — API validation
Helmet              — security
CORS                — frontend/backend ulanishi
Morgan              — request logging
```

### Development

```text
Git
GitHub
VS Code
Node.js LTS
PostgreSQL
Postman yoki Bruno
```

---

# 2. Kompyuterga o‘rnatiladigan dasturlar

Avval quyidagilar o‘rnatiladi:

### 1️⃣ VS Code

Kod yozish uchun.

### 2️⃣ Node.js LTS

Frontend va Backend uchun.

Tekshirish:

```bash
node -v
npm -v
```

### 3️⃣ Git

Tekshirish:

```bash
git --version
```

### 4️⃣ PostgreSQL

Database uchun.

Tekshirish:

```bash
psql --version
```

### 5️⃣ Postman yoki Bruno

API test qilish uchun.

---

# 3. Loyihani yaratish

Terminal:

```bash
mkdir e-avto-test
cd e-avto-test
```

Git:

```bash
git init
```

Keyin:

```text
e-avto-test/
│
├── frontend/
│
├── backend/
│
├── README.md
├── .gitignore
└── docker-compose.yml
```

---

# 4. Frontend yaratish

Terminal:

```bash
npm create vite@latest frontend -- --template react-ts
```

Keyin:

```bash
cd frontend
npm install
```

Kerakli paketlar:

```bash
npm install react-router-dom axios lucide-react react-hook-form zod @hookform/resolvers
```

Tailwind CSS'ni loyihaning tanlangan Tailwind versiyasiga mos rasmiy o‘rnatish usuli bilan sozlang.

Keyin:

```bash
npm run dev
```

---

# 5. Backend yaratish

Root papkaga qayting:

```bash
cd ..
mkdir backend
cd backend
```

Node project:

```bash
npm init -y
```

O‘rnatish:

```bash
npm install express cors helmet morgan dotenv jsonwebtoken bcrypt zod
```

TypeScript:

```bash
npm install -D typescript tsx @types/node @types/express @types/cors @types/morgan @types/jsonwebtoken @types/bcrypt
```

TypeScript:

```bash
npx tsc --init
```

Prisma:

```bash
npm install prisma @prisma/client
```

Prisma:

```bash
npx prisma init
```

---

# 6. PostgreSQL database

Masalan:

```text
Database:
e_avto_test

User:
postgres

Password:
o'zingizning parolingiz

Port:
5432
```

Backend `.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/e_avto_test"

PORT=5000

JWT_SECRET="change_this_to_a_long_random_secret"

CLIENT_URL="http://localhost:5173"
```

**Muhim:** `.env` faylni GitHub'ga yubormang.

`.gitignore`:

```text
node_modules
.env
dist
```

---

# 7. Database strukturasi

Prisma orqali:

```text
User
Course
Lesson
Video
Question
Test
TestResult
UserAnswer
Progress
```

Bog‘lanish:

```text
User
 │
 ├── Progress
 │
 ├── TestResult
 │       │
 │       └── UserAnswer
 │
 └── Profile


Course
 │
 └── Lesson
       │
       ├── Video
       │
       └── Question
```

---

# 8. To‘liq papka strukturasi

## Root

```text
e-avto-test/
│
├── frontend/
│
├── backend/
│
├── docs/
│   ├── api.md
│   ├── database.md
│   └── installation.md
│
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

# 9. Frontend strukturasi

```text
frontend/
│
├── public/
│   ├── logo.svg
│   └── favicon.ico
│
├── src/
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── TestTimer.tsx
│   │   ├── ProgressBar.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Courses.tsx
│   │   ├── CourseDetails.tsx
│   │   ├── Lesson.tsx
│   │   ├── Test.tsx
│   │   ├── TestResult.tsx
│   │   ├── History.tsx
│   │   ├── Profile.tsx
│   │   └── NotFound.tsx
│   │
│   ├── admin/
│   │   ├── AdminLayout.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   ├── Courses.tsx
│   │   ├── Lessons.tsx
│   │   ├── Videos.tsx
│   │   ├── Questions.tsx
│   │   ├── Tests.tsx
│   │   └── Statistics.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTest.ts
│   │   └── useCourses.ts
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── courseService.ts
│   │   ├── testService.ts
│   │   └── adminService.ts
│   │
│   ├── context/
│   │   └── AuthContext.tsx
│   │
│   ├── types/
│   │   ├── user.ts
│   │   ├── course.ts
│   │   ├── lesson.ts
│   │   └── test.ts
│   │
│   ├── utils/
│   │   ├── formatTime.ts
│   │   └── storage.ts
│   │
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   └── AuthLayout.tsx
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

# 10. Backend strukturasi

```text
backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── course.controller.ts
│   │   ├── lesson.controller.ts
│   │   ├── test.controller.ts
│   │   ├── result.controller.ts
│   │   └── admin.controller.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── course.routes.ts
│   │   ├── lesson.routes.ts
│   │   ├── test.routes.ts
│   │   ├── result.routes.ts
│   │   └── admin.routes.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── admin.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimit.middleware.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── course.service.ts
│   │   ├── lesson.service.ts
│   │   ├── test.service.ts
│   │   └── result.service.ts
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── course.validator.ts
│   │   └── test.validator.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── pagination.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── .env
├── package.json
├── tsconfig.json
└── .gitignore
```

---

# 11. Frontend va Backend qanday ulanadi?

```text
                 USER
                  │
                  ▼
             React Frontend
            localhost:5173
                  │
                Axios
                  │
                  ▼
             REST API
                  │
                  ▼
           Express Backend
            localhost:5000
                  │
                  ▼
               Prisma
                  │
                  ▼
             PostgreSQL
```

Masalan:

```text
GET /api/courses
```

Frontend kurslarni so‘raydi.

Backend:

```text
React
 ↓
GET /api/courses
 ↓
Express
 ↓
Prisma
 ↓
PostgreSQL
 ↓
JSON
 ↓
React
```

---

# 12. Authentication

Login:

```text
Email
Password
```

Backend:

```text
bcrypt
   ↓
Password tekshirish
   ↓
JWT
   ↓
Frontend
```

Role:

```text
USER
ADMIN
```

Admin route'lariga oddiy user kira olmaydi.

---

# 13. Test tizimi

Test boshlanganda:

```text
POST /api/tests/start
```

Backend:

```text
Test yaratadi
↓
Savollarni tanlaydi
↓
Test ID beradi
```

Frontend:

```text
Savol 1
Savol 2
Savol 3
...
Savol 20
```

Test tugaganda:

```text
POST /api/tests/:id/finish
```

Backend hisoblaydi:

```text
20 ta savol
17 correct
3 incorrect

85%
```

Natija database'ga yoziladi.

---

# 14. Muhim optimizatsiya

Sayt tez ishlashi uchun:

### Frontend

```text
Lazy loading
Image optimization
Code splitting
API caching
Debouncing
Pagination
Responsive design
Skeleton loading
Error handling
```

### Backend

```text
Database indexes
Pagination
Validation
Rate limiting
Caching
Central error handler
API response optimization
```

### Database

Kerakli ustunlarga index:

```text
user_id
course_id
lesson_id
test_id
created_at
```

---

# 15. Video uchun optimal yechim

Videoni:

```text
backend/uploads/
```

ichiga tashlab qo‘yish **katta loyiha uchun yaxshi emas**.

Yaxshi arxitektura:

```text
                    Video
                      │
                      ▼
              Video Storage/CDN
                      │
                      ▼
                Video URL
                      │
                      ▼
                 PostgreSQL
                      │
                      ▼
                  Backend
                      │
                      ▼
                  Frontend
```

Database'da video faylning o‘zi emas, **URL va metadata** saqlanadi.

---

# 16. Admin panel

Admin:

```text
Dashboard
│
├── Users
├── Courses
├── Lessons
├── Videos
├── Questions
├── Tests
├── Results
└── Statistics
```

Admin yangi video qo‘shadi:

```text
Mavzu:
Yo'l belgilari

Video:
[Upload / URL]

Tartib:
1

[Saqlash]
```

Yangi savol:

```text
Savol:
Qaysi belgi...

A) ...
B) ...
C) ...
D) ...

To'g'ri javob:
C

Mavzu:
Yo'l belgilari
```

---

# 17. AI uchun tayyor MASTER PROMPT

Quyidagi promptni Claude, ChatGPT, Cursor yoki boshqa coding AI'ga berishingiz mumkin:

# E-AVTO TEST — FULL STACK WEB APPLICATION

Sen senior full-stack developer sifatida ishlaysan.

Menga zamonaviy, tezkor, responsive va production-ready **E-Avto Test** web platformasini yaratib ber.

## 1. LOYIHA MAQSADI

Platforma foydalanuvchilarga avtomobil haydash nazariyasi bo‘yicha:

* video darslarni ko‘rish;
* mavzularni o‘rganish;
* test topshirish;
* vaqt bilan ishlash;
* natijani ko‘rish;
* xatolarini ko‘rish;
* testni qayta topshirish;
* o‘z progressini kuzatish

imkonini bersin.

Admin esa:

* userlarni;
* kurslarni;
* mavzularni;
* videolarni;
* savollarni;
* testlarni;
* natijalarni;
* statistikani

boshqara olsin.

---

# 2. TEXNOLOGIYALAR

## Frontend

React
TypeScript
Vite
Tailwind CSS
React Router
Axios
Lucide React
React Hook Form
Zod

## Backend

Node.js
Express.js
TypeScript
PostgreSQL
Prisma ORM
JWT
bcrypt
Zod
Helmet
CORS
Morgan

## Development

Git
GitHub
VS Code

---

# 3. MUHIM TALAB

Frontend va Backend alohida papkalarda bo‘lsin.

Struktura:

e-avto-test/

frontend/
backend/
docs/
README.md
.gitignore
docker-compose.yml

Frontend Backend bilan REST API orqali ishlasin.

---

# 4. FRONTEND

Frontend quyidagi sahifalarga ega bo‘lsin:

Home
Login
Register
Dashboard
Courses
CourseDetails
Lesson
Test
TestResult
History
Profile
NotFound

Admin:

AdminDashboard
Users
Courses
Lessons
Videos
Questions
Tests
Results
Statistics

---

# 5. DESIGN

Dizayn:

* zamonaviy;
* professional;
* minimal;
* mobile-first;
* responsive;
* desktop/tablet/mobile;
* accessibility'ga mos;
* keyboard navigation;
* loading state;
* empty state;
* error state;
* skeleton loading.

Avtomobil va yo‘l mavzusiga mos professional visual style ishlat.

Ortiqcha animatsiya ishlatma.

---

# 6. VIDEO DARS

Har bir Lesson video bilan bog‘langan bo‘lsin.

Lesson:

title
description
videoUrl
thumbnail
duration
order

Video player:

* play/pause;
* volume;
* fullscreen;
* progress;
* duration;
* responsive;
* loading;
* error state.

Video fayllarni backend server ichida saqlama.

Database'da video URL va metadata saqla.

---

# 7. TEST TIZIMI

Test quyidagilarga ega bo‘lsin:

* savollar;
* 4 ta variant;
* to‘g‘ri javob;
* timer;
* progress;
* oldingi/keyingi;
* testni tugatish;
* natija.

Misol:

20 ta savol
20 daqiqa.

Test vaqt tugaganda avtomatik yakunlansin.

User javoblarini backendga yubor.

To‘g‘ri javoblarni frontendga test vaqtida oshkor qilma.

Natijani backend hisoblasin.

---

# 8. NATIJA

Test tugagach:

Total questions
Correct answers
Wrong answers
Percentage
Time spent
Passed/Failed

ko‘rsatilsin.

Shuningdek:

"Xatolarni ko‘rish"

funksiyasi bo‘lsin.

---

# 9. AUTHENTICATION

Register:

name
email
password

Login:

email
password

Password bcrypt bilan hash qilinsin.

JWT authentication ishlat.

Role:

USER
ADMIN

Admin endpointlari himoyalangan bo‘lsin.

---

# 10. DATABASE

Prisma schema yarat.

Models:

User
Course
Lesson
Video
Question
Test
TestResult
UserAnswer
Progress

Relationshiplarni to‘g‘ri tashkil qil.

Kerakli database indexlarni qo‘sh.

Migration va seed system yarat.

---

# 11. BACKEND API

Quyidagi endpointlarni yarat:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

GET /api/courses
GET /api/courses/:id

GET /api/lessons/:id

POST /api/tests/start
POST /api/tests/:id/answer
POST /api/tests/:id/finish

GET /api/results
GET /api/results/:id

GET /api/profile
PUT /api/profile

Admin:

GET /api/admin/users
GET /api/admin/courses
POST /api/admin/courses
PUT /api/admin/courses/:id
DELETE /api/admin/courses/:id

GET /api/admin/questions
POST /api/admin/questions
PUT /api/admin/questions/:id
DELETE /api/admin/questions/:id

GET /api/admin/statistics

---

# 12. SECURITY

Quyidagilarni ishlat:

Helmet
CORS
JWT
bcrypt
Zod validation
Rate limiting
Central error handling

SQL injectionga qarshi himoya.

Frontend validation bilan cheklanma.

Backend validation ham bo‘lsin.

Admin authorizationni backendda tekshir.

---

# 13. PERFORMANCE

Frontend:

lazy loading
code splitting
optimized images
pagination
debouncing
API error handling
loading states

Backend:

database indexes
pagination
efficient Prisma queries
rate limiting
proper HTTP status codes

---

# 14. ERROR HANDLING

API standart formatdan foydalansin:

{
"success": false,
"message": "Error message",
"errors": []
}

Success:

{
"success": true,
"data": {}
}

---

# 15. ENVIRONMENT

Frontend:

VITE_API_URL=[http://localhost:5000/api](http://localhost:5000/api)

Backend:

DATABASE_URL=
PORT=5000
JWT_SECRET=
CLIENT_URL=[http://localhost:5173](http://localhost:5173)

.env fayllarni GitHubga yuborma.

.env.example yarat.

---

# 16. INSTALLATION

Loyihani yangi kompyuterda ishga tushirish uchun:

1. Node.js LTS o‘rnatish
2. Git o‘rnatish
3. PostgreSQL o‘rnatish
4. Repository clone qilish
5. frontend npm install
6. backend npm install
7. .env yaratish
8. PostgreSQL database yaratish
9. Prisma migration ishlatish
10. Prisma seed ishlatish
11. Frontend ishga tushirish
12. Backend ishga tushirish

README.md ichida barcha commandlarni aniq yoz.

---

# 17. NPM SCRIPTS

Frontend:

npm run dev
npm run build
npm run preview

Backend:

npm run dev
npm run build
npm run start
npm run prisma:migrate
npm run prisma:generate
npm run prisma:seed

---

# 18. CODE QUALITY

Kod:

* TypeScript;
* modular;
* reusable;
* clean;
* readable;
* scalable

bo‘lsin.

Duplicate code yozma.

Business logicni controller ichiga to‘liq tiqib qo‘yma.

Controller → Service → Prisma arxitekturasidan foydalan.

---

# 19. PAPKA STRUKTURASI

frontend/src:

components/
pages/
layouts/
hooks/
services/
context/
types/
utils/
admin/

backend/src:

config/
controllers/
routes/
services/
middleware/
validators/
utils/

backend/prisma:

schema.prisma
seed.ts

---

# 20. FINAL TALAB

Loyihani yaratayotganda:

1. Avval project structure yarat.
2. Keyin dependencies o‘rnat.
3. Keyin database schema yarat.
4. Keyin authentication yarat.
5. Keyin Courses/Lessons.
6. Keyin Video system.
7. Keyin Test system.
8. Keyin Results.
9. Keyin Admin panel.
10. Keyin security.
11. Keyin optimization.
12. Keyin README va installation documentation.

Har bir bosqichdan keyin xatolarni tekshir.

Loyiha ishlamaydigan placeholder kodlar bilan tugatilmasin.

Fake API va fake authenticationni production implementation o‘rniga ishlatma.

Frontend va backend haqiqiy REST API orqali ishlasin.

Yakuniy loyiha `npm install` va README'dagi installation bosqichlaridan keyin lokal kompyuterda to‘liq ishga tushadigan holatda bo‘lsin.

## Eng muhim tavsiya

Loyihani birdaniga 100% yozdirishdan ko‘ra **12 bosqichda** qurish ancha ishonchli:

**1. Setup → 2. Database → 3. Auth → 4. Courses → 5. Video → 6. Test → 7. Results → 8. Profile → 9. Admin → 10. Security → 11. Optimization → 12. Deploy.**

Shunda xato chiqsa, aynan qaysi qismda ekanini topish oson bo‘ladi.
