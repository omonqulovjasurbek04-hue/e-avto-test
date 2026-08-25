Albatta. Quyidagi prompt **faqat E-Avto Test Backend** uchun. U frontenddan alohida ishlaydi va keyinchalik React frontend bilan REST API orqali ulanadi.

# 🚗 E-AVTO TEST — BACKEND ONLY

Sen 10+ yillik tajribaga ega Senior Backend Developer va Software Architect sifatida ishlaysan.

Menga **E-Avto Test** platformasi uchun professional, xavfsiz, tezkor, scalable va production-ready BACKEND yarat.

MUHIM:

* Frontend yaratma.
* React yaratma.
* Tailwind yaratma.
* UI yaratma.
* Backend alohida loyiha bo‘lsin.
* REST API orqali ishlasin.
* PostgreSQL database ishlat.
* Frontend keyinchalik ushbu API'ga ulanadi.

---

# 1. LOYIHA MAQSADI

Backend quyidagi imkoniyatlarni ta'minlashi kerak:

* User registration
* Login
* Logout
* Authentication
* User profile
* Courses
* Lessons
* Videos
* Questions
* Tests
* Test timer logic
* Answers
* Test results
* Test history
* Progress
* Leaderboard
* Statistics
* Admin panel API
* Search
* Filtering
* Pagination
* Security
* Validation

---

# 2. TEXNOLOGIYALAR

## Core

Node.js LTS
Express.js
TypeScript

## Database

PostgreSQL
Prisma ORM

## Authentication

JWT
bcrypt

## Validation

Zod

## Security

Helmet
CORS
express-rate-limit

## Logging

Morgan

## Environment

dotenv

## Development

tsx
nodemon yoki tsx watch

---

# 3. TEXNOLOGIYA FOIZLARI

Node.js             25%
Express.js           25%
TypeScript           15%
PostgreSQL           15%
Prisma               8%
JWT                   5%
Zod                   3%
Security packages     4%

Jami: 100%

---

# 4. O‘RNATISH

Backend papka:

backend/

```bash
mkdir backend
cd backend
npm init -y
```

Asosiy paketlar:

```bash
npm install express cors helmet morgan dotenv jsonwebtoken bcrypt express-rate-limit zod
```

Prisma:

```bash
npm install prisma @prisma/client
```

Development:

```bash
npm install -D typescript tsx @types/node @types/express @types/cors @types/morgan @types/jsonwebtoken @types/bcrypt
```

TypeScript:

```bash
npx tsc --init
```

Prisma:

```bash
npx prisma init
```

---

# 5. PAPKA STRUKTURASI

backend/

├── src/
│
│   ├── config/
│   │   ├── env.ts
│   │   └── database.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── course.controller.ts
│   │   ├── lesson.controller.ts
│   │   ├── video.controller.ts
│   │   ├── test.controller.ts
│   │   ├── result.controller.ts
│   │   ├── progress.controller.ts
│   │   ├── leaderboard.controller.ts
│   │   └── admin.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── course.service.ts
│   │   ├── lesson.service.ts
│   │   ├── video.service.ts
│   │   ├── test.service.ts
│   │   ├── result.service.ts
│   │   ├── progress.service.ts
│   │   └── leaderboard.service.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── course.routes.ts
│   │   ├── lesson.routes.ts
│   │   ├── video.routes.ts
│   │   ├── test.routes.ts
│   │   ├── result.routes.ts
│   │   ├── progress.routes.ts
│   │   ├── leaderboard.routes.ts
│   │   └── admin.routes.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── admin.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimit.middleware.ts
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   ├── course.validator.ts
│   │   ├── lesson.validator.ts
│   │   ├── question.validator.ts
│   │   └── test.validator.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── pagination.ts
│   │   ├── response.ts
│   │   └── errors.ts
│   │
│   ├── types/
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── course.ts
│   │   ├── lesson.ts
│   │   └── test.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md

---

# 6. DATABASE

PostgreSQL ishlat.

Database:

e_avto_test

Port:

5432

Backend .env:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/e_avto_test"

PORT=5000

NODE_ENV=development

JWT_SECRET="CHANGE_THIS_SECRET"

JWT_EXPIRES_IN="7d"

CLIENT_URL="http://localhost:5173"
```

Productionda secretlarni environment variables orqali ber.

---

# 7. DATABASE MODELS

Prisma orqali quyidagi modellarni yarat.

## User

Fields:

id
name
email
password
avatar
phone
role
isActive
createdAt
updatedAt

Role:

USER
ADMIN

Email unique bo‘lsin.

---

# 8. Course

Fields:

id
title
slug
description
thumbnail
difficulty
isPublished
createdAt
updatedAt

Relationship:

Course → Lessons

---

# 9. Lesson

Fields:

id
courseId
title
slug
description
content
duration
order
isPublished
createdAt
updatedAt

Relationship:

Lesson → Course

Lesson → Video

Lesson → Questions

---

# 10. Video

Fields:

id
lessonId
title
videoUrl
thumbnail
duration
provider
createdAt
updatedAt

Video faylini database ichiga saqlama.

Faqat URL va metadata saqla.

---

# 11. Question

Fields:

id
lessonId
question
image
optionA
optionB
optionC
optionD
correctAnswer
explanation
difficulty
createdAt
updatedAt

MUHIM:

CorrectAnswer test vaqtida frontendga yuborilmasin.

---

# 12. Test

Fields:

id
title
description
lessonId
questionCount
duration
passPercentage
isPublished
createdAt
updatedAt

---

# 13. TestAttempt

Test topshirishni alohida attempt sifatida saqla.

Fields:

id
userId
testId
startedAt
finishedAt
score
correctAnswers
wrongAnswers
skippedAnswers
percentage
timeSpent
status

Status:

IN_PROGRESS
COMPLETED
EXPIRED

---

# 14. UserAnswer

Fields:

id
attemptId
questionId
selectedAnswer
isCorrect
createdAt

---

# 15. Progress

Fields:

id
userId
lessonId
isCompleted
progress
lastWatchedAt
completedAt

User va Lesson kombinatsiyasi unique bo‘lsin.

---

# 16. AUTHENTICATION

Register:

POST /api/auth/register

Body:

name
email
password

Password:

bcrypt bilan hash qilinsin.

Login:

POST /api/auth/login

Body:

email
password

Login muvaffaqiyatli bo‘lsa JWT qaytar.

Me:

GET /api/auth/me

Logout uchun server-side session bo‘lmasa, frontend tokenni o‘chiradi; agar refresh-token mexanizmi qo‘shilsa, uni alohida xavfsiz endpoint orqali boshqar.

---

# 17. USER API

GET /api/users/me

PUT /api/users/me

GET /api/users/me/progress

GET /api/users/me/history

GET /api/users/me/statistics

User faqat o‘z ma'lumotlarini ko‘ra olsin.

---

# 18. COURSE API

GET /api/courses

GET /api/courses/:id

POST /api/admin/courses

PUT /api/admin/courses/:id

DELETE /api/admin/courses/:id

Query:

?page=1
&limit=10
&search=
&difficulty=
&sort=

Pagination ishlat.

---

# 19. LESSON API

GET /api/courses/:courseId/lessons

GET /api/lessons/:id

POST /api/admin/lessons

PUT /api/admin/lessons/:id

DELETE /api/admin/lessons/:id

---

# 20. VIDEO API

GET /api/lessons/:lessonId/video

Admin:

POST /api/admin/videos

PUT /api/admin/videos/:id

DELETE /api/admin/videos/:id

Video backend serverda saqlanmasin.

Video storage provider bilan URL orqali ishlashga tayyor architecture yarat.

---

# 21. TEST API

Test boshlash:

POST /api/tests/:testId/start

Backend:

1. Userni tekshir.
2. Testni tekshir.
3. Test mavjudligini tekshir.
4. Test published ekanligini tekshir.
5. Attempt yarat.
6. Savollarni tanla.
7. CorrectAnswerni frontendga yuborma.
8. Attempt ID qaytar.

---

# 22. TEST SAVOLLARI

GET /api/tests/:testId/questions

Response:

id
question
image
optionA
optionB
optionC
optionD

Lekin:

correctAnswer

hech qachon test jarayonida yuborilmasin.

---

# 23. ANSWER API

POST /api/tests/attempts/:attemptId/answers

Body:

questionId
selectedAnswer

Backend:

* attempt userga tegishlimi;
* attempt active ekanmi;
* question testga tegishlimi;
* javob validmi;

tekshirsin.

---

# 24. FINISH TEST

POST /api/tests/attempts/:attemptId/finish

Backend:

1. Attemptni top.
2. Userni tekshir.
3. Test vaqtini tekshir.
4. Barcha javoblarni tekshir.
5. Correct javoblarni database'dan ol.
6. Score hisobla.
7. Percentage hisobla.
8. Passed/Failed aniqlash.
9. Attemptni COMPLETED qil.
10. Result qaytar.

---

# 25. TEST RESULT

GET /api/results/:attemptId

Response:

score
percentage
correct
wrong
skipped
timeSpent
status

Review uchun:

GET /api/results/:attemptId/review

Response:

question
selectedAnswer
correctAnswer
isCorrect
explanation

---

# 26. TIMER SECURITY

Timer frontendga ishonib qolmasin.

Test boshlanganda:

startedAt

database'da saqlansin.

Test duration database'dan olinadi.

Finish vaqtida backend:

currentTime - startedAt

orqali vaqtni tekshiradi.

Frontend timer faqat UI uchun ishlasin.

Bu juda muhim.

---

# 27. PROGRESS

GET /api/progress

GET /api/progress/:lessonId

PUT /api/progress/:lessonId

Progress:

0–100%

Video ko‘rilishi bilan progress yangilanadi.

Lesson tugaganda:

isCompleted = true

---

# 28. LEADERBOARD

GET /api/leaderboard

Ko‘rsat:

rank
name
avatar
points
tests
averageScore

Pagination qo‘llash mumkin.

---

# 29. STATISTICS

GET /api/statistics

User statistics:

totalTests
averageScore
bestScore
passedTests
failedTests
completedLessons
learningTime

Admin statistics:

totalUsers
activeUsers
totalCourses
totalLessons
totalTests
totalAttempts
averageScore

---

# 30. ADMIN API

Admin middleware yarat.

Faqat role=ADMIN foydalana olsin.

Endpoints:

GET /api/admin/users

GET /api/admin/users/:id

PATCH /api/admin/users/:id/status

GET /api/admin/courses

POST /api/admin/courses

PUT /api/admin/courses/:id

DELETE /api/admin/courses/:id

GET /api/admin/lessons

POST /api/admin/lessons

PUT /api/admin/lessons/:id

DELETE /api/admin/lessons/:id

GET /api/admin/videos

POST /api/admin/videos

PUT /api/admin/videos/:id

DELETE /api/admin/videos/:id

GET /api/admin/questions

POST /api/admin/questions

PUT /api/admin/questions/:id

DELETE /api/admin/questions/:id

GET /api/admin/tests

POST /api/admin/tests

PUT /api/admin/tests/:id

DELETE /api/admin/tests/:id

GET /api/admin/statistics

---

# 31. VALIDATION

Barcha requestlar Zod bilan validate qilinsin.

Masalan Register:

name:
minimum 2 characters

email:
valid email

password:
minimum 8 characters

Frontend validationga ishonma.

Backend validation majburiy.

---

# 32. ERROR HANDLING

Global error middleware yarat.

Response:

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": []
}
```

Success:

```json
{
  "success": true,
  "data": {}
}
```

HTTP statuslardan to‘g‘ri foydalan:

200
201
400
401
403
404
409
422
429
500

---

# 33. SECURITY

Quyidagilarni majburiy ishlat:

Helmet

CORS

Rate limiting

bcrypt

JWT

Zod validation

Environment variables

Central error handling

Database constraints

Input validation

Admin authorization

Authentication middleware

Passwordlarni hech qachon plain text saqlama.

JWT_SECRET kod ichida yozilmasin.

.env GitHubga yuborilmasin.

---

# 34. RATE LIMIT

Authentication endpointlariga alohida rate limit:

/login

/register

Password reset

Test submission

API'ni abuse qilishdan himoya qil.

---

# 35. CORS

Faqat frontend URL'ga ruxsat ber.

Development:

[http://localhost:5173](http://localhost:5173)

Production URL environment variable orqali kelishi kerak.

---

# 36. PAGINATION

List endpointlarda pagination:

?page=1
&limit=10

Response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

# 37. SEARCH

Courses:

GET /api/courses?search=belgilar

Questions:

GET /api/admin/questions?search=svetofor

Users:

GET /api/admin/users?search=ali

---

# 38. FILTER

Courses:

difficulty

published

category

Questions:

difficulty

lesson

Test:

published

lesson

---

# 39. DATABASE OPTIMIZATION

Index yarat:

User.email

Course.slug

Lesson.slug

Lesson.courseId

Question.lessonId

Test.lessonId

TestAttempt.userId

TestAttempt.testId

UserAnswer.attemptId

Progress.userId

Progress.lessonId

createdAt

---

# 40. TRANSACTIONS

Test finish vaqtida kerak bo‘lsa Prisma transaction ishlat.

Natija va attempt status bir-biriga mos saqlansin.

---

# 41. SEED DATA

prisma/seed.ts yarat.

Demo:

1 admin

3 user

5 courses

15 lessons

kamida 50 questions

5 tests

demo results

yarat.

Admin:

email:

[admin@example.com](mailto:admin@example.com)

Password:

faqat development uchun seed orqali beriladigan demo credential ishlat; productionda albatta almashtirilishi kerak.

---

# 42. NPM SCRIPTS

package.json:

dev

build

start

prisma:generate

prisma:migrate

prisma:seed

prisma:studio

---

# 43. DEVELOPMENT

Backend:

npm run dev

Default:

[http://localhost:5000](http://localhost:5000)

Health:

GET /api/health

Response:

```json
{
  "success": true,
  "message": "E-Avto Test API is running"
}
```

---

# 44. FRONTEND BILAN ULASH

Frontend:

VITE_API_URL=[http://localhost:5000/api](http://localhost:5000/api)

Backend:

CLIENT_URL=[http://localhost:5173](http://localhost:5173)

Axios orqali frontend:

GET /courses

POST /auth/login

POST /tests/:id/start

POST /tests/attempts/:id/answers

POST /tests/attempts/:id/finish

endpointlariga ulanadi.

---

# 45. ARCHITECTURE

Controller:

Request/Response

↓

Service:

Business Logic

↓

Prisma:

Database

Architecture:

Route
→ Middleware
→ Controller
→ Service
→ Prisma
→ PostgreSQL

Business logicni route ichiga yozma.

Database querylarni controller ichiga yozma.

---

# 46. RESPONSE FORMAT

Barcha API bir xil formatdan foydalansin.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error message"
}
```

---

# 47. LOGGING

Developmentda request logging.

Productionda:

* sensitive data log qilinmasin;
* password log qilinmasin;
* JWT log qilinmasin.

---

# 48. HEALTH CHECK

GET:

/api/health

Database connection holatini ham tekshiradigan alohida health/readiness endpoint architecture'ga mos bo‘lsin.

---

# 49. README

README.md ichida:

Project description

Features

Technologies

Requirements

Installation

PostgreSQL setup

Environment variables

Prisma setup

Migration

Seed

Development

Production

API endpoints

Authentication

Test system

Database structure

Security

hammasini tushunarli yoz.

---

# 50. TESTING

Backend uchun keyinchalik test yozishga qulay architecture yarat.

Muhim service'lar:

Auth

Test calculation

Test finish

Progress

Leaderboard

uchun unit/integration test qo‘shishga mos kod yoz.

---

# 51. PRODUCTION READY

Backend:

* TypeScript strict mode;
* clean architecture;
* modular;
* scalable;
* secure;
* validated;
* documented;
* optimized

bo‘lsin.

Console.log bilan production logging qilma.

Secretlarni source code ichiga yozma.

Database querylarni optimallashtir.

---

# 52. DEVELOPMENT BOSQICHLARI

Backendni quyidagi tartibda ishlab chiq:

1. Node.js project
2. TypeScript
3. Express
4. Environment configuration
5. PostgreSQL
6. Prisma
7. Database schema
8. Migration
9. Seed
10. Authentication
11. User API
12. Course API
13. Lesson API
14. Video API
15. Test API
16. Answer system
17. Result system
18. Progress
19. Leaderboard
20. Statistics
21. Admin API
22. Security
23. Validation
24. Error handling
25. Pagination
26. Search
27. Filtering
28. Optimization
29. Documentation
30. Testing

---

# 53. FINAL TALAB

Yakuniy backend quyidagi flowni to‘liq qo‘llab-quvvatlasin:

User
→ Register
→ Login
→ Course
→ Lesson
→ Video
→ Start Test
→ Answer Questions
→ Finish Test
→ Calculate Result
→ Review Errors
→ History
→ Progress
→ Leaderboard

Admin:

Login
→ Dashboard API
→ Users
→ Courses
→ Lessons
→ Videos
→ Questions
→ Tests
→ Results
→ Statistics

Backend frontenddan mustaqil ishlasin.

API RESTful bo‘lsin.

Database PostgreSQL bo‘lsin.

Prisma ORM ishlatilsin.

Authentication JWT orqali bo‘lsin.

Password bcrypt orqali hash qilinsin.

Barcha inputlar Zod bilan validate qilinsin.

Test natijasini backend hisoblasin.

Correct answer test vaqtida frontendga yuborilmasin.

Timer backend tomonidan ham tekshirilsin.

Frontendga hech qachon database password, JWT secret yoki boshqa maxfiy ma'lumot yuborilmasin.

Yakunida:

npm install

npm run prisma:generate

npm run prisma:migrate

npm run prisma:seed

npm run dev

buyruqlari bilan lokalda ishga tushadigan holatda bo‘lsin.

npm run build

xatosiz ishlasin.

Hech qanday TypeScript error, broken route yoki ishlamaydigan API qoldirma.
