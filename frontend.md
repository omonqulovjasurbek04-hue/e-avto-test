Albatta. Quyidagi prompt **faqat E-Avto Test frontend** uchun. Backend umuman yozilmaydi — faqat keyinchalik API ulashga tayyor, professional va scalable frontend yaratiladi.

# 🚗 E-AVTO TEST — FRONTEND MASTER PROMPT

# E-AVTO TEST — FRONTEND ONLY

Sen 10+ yillik tajribaga ega Senior Frontend Developer va UI/UX Engineer sifatida ishlaysan.

Menga **E-Avto Test** nomli zamonaviy, professional, tezkor va responsive avtomobil nazariyasi/test platformasining faqat FRONTEND qismini yarat.

MUHIM:

* Backend yaratma.
* Database yaratma.
* Server-side kod yozma.
* API backend yaratma.
* Frontend backendga keyinchalik ulanishi uchun service layer tayyor bo‘lsin.
* Hozircha barcha ma'lumotlar mock/local data orqali ishlasin.
* Keyinchalik real REST API ulash oson bo‘lsin.

---

# 1. LOYIHA MAQSADI

E-Avto Test — foydalanuvchi avtomobil haydash nazariyasini o‘rganadigan platforma.

Asosiy flow:

Bosh sahifa
↓
Kurs
↓
Mavzu
↓
Video dars
↓
Test
↓
Natija
↓
Xatolarni ko‘rish
↓
Qayta test

Foydalanuvchi quyidagilarni qila olishi kerak:

* kurslarni ko‘rish;
* mavzularni ko‘rish;
* video darslarni ko‘rish;
* test boshlash;
* test ishlash;
* timer bilan ishlash;
* natijani ko‘rish;
* xatolarni ko‘rish;
* testni qayta ishlash;
* progressni kuzatish;
* test tarixini ko‘rish;
* profilni boshqarish;
* reytingni ko‘rish.

---

# 2. TEXNOLOGIYALAR

Frontend uchun quyidagi texnologiyalardan foydalan:

## Core

React
TypeScript
Vite

## Styling

Tailwind CSS

## Routing

React Router DOM

## HTTP/API

Axios

## Form

React Hook Form

## Validation

Zod
@hookform/resolvers

## Icons

Lucide React

## State Management

Zustand

## Animation

Framer Motion

## Charts

Recharts

## Notifications

Sonner

## Utilities

date-fns

---

# 3. TEXNOLOGIYA FOIZLARI

Frontend:

React              30%
TypeScript         20%
Tailwind CSS       15%
Vite               10%
React Router        5%
Zustand              5%
Axios                5%
React Hook Form      3%
Zod                  2%
Framer Motion        2%
Recharts             1%
Lucide/Sonner        2%

Jami: 100%

Texnologiyalarni keraksiz joyda ishlatma.

---

# 4. O‘RNATISH

Frontend yarat:

npm create vite@latest frontend -- --template react-ts

Keyin:

cd frontend

npm install

Kerakli paketlarni o‘rnat:

npm install react-router-dom axios zustand lucide-react framer-motion recharts sonner date-fns react-hook-form zod @hookform/resolvers

Tailwind CSS'ni loyihaning o‘rnatilayotgan versiyasiga mos rasmiy usul bilan sozla.

Development:

npm run dev

Production build:

npm run build

Preview:

npm run preview

---

# 5. ASOSIY PAPKA STRUKTURASI

frontend/

├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│
├── src/
│   │
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── common/
│   │   ├── navigation/
│   │   ├── course/
│   │   ├── lesson/
│   │   ├── video/
│   │   ├── test/
│   │   ├── result/
│   │   ├── profile/
│   │   └── leaderboard/
│   │
│   ├── pages/
│   │   ├── public/
│   │   ├── auth/
│   │   ├── student/
│   │   └── errors/
│   │
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── StudentLayout.tsx
│   │
│   ├── routes/
│   │   ├── AppRoutes.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── routeConfig.ts
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── course.service.ts
│   │   ├── lesson.service.ts
│   │   ├── test.service.ts
│   │   ├── result.service.ts
│   │   └── user.service.ts
│   │
│   ├── store/
│   │   ├── auth.store.ts
│   │   ├── test.store.ts
│   │   └── ui.store.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTest.ts
│   │   ├── useTimer.ts
│   │   └── useDebounce.ts
│   │
│   ├── data/
│   │   ├── mockUsers.ts
│   │   ├── mockCourses.ts
│   │   ├── mockLessons.ts
│   │   ├── mockQuestions.ts
│   │   └── mockResults.ts
│   │
│   ├── types/
│   │   ├── user.ts
│   │   ├── course.ts
│   │   ├── lesson.ts
│   │   ├── question.ts
│   │   ├── test.ts
│   │   └── result.ts
│   │
│   ├── utils/
│   │   ├── formatTime.ts
│   │   ├── formatDate.ts
│   │   ├── calculateProgress.ts
│   │   └── cn.ts
│   │
│   ├── constants/
│   │   ├── routes.ts
│   │   ├── categories.ts
│   │   └── config.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md

---

# 6. SAHIFALAR

To‘liq quyidagi sahifalarni yarat.

## PUBLIC PAGES

/

Home

/courses

Courses

/courses/:courseId

Course Details

/about

About

/contact

Contact

/faq

FAQ

---

# 7. AUTH PAGES

/login

Login

/register

Register

/forgot-password

Forgot Password

/reset-password

Reset Password

---

# 8. STUDENT PAGES

/dashboard

Dashboard

/lessons

Lessons

/lessons/:lessonId

Lesson Details

/lessons/:lessonId/video

Video Lesson

/tests

Tests

/tests/:testId

Test Page

/tests/:testId/result

Test Result

/tests/:testId/review

Test Review

/history

Test History

/progress

My Progress

/leaderboard

Leaderboard

/profile

Profile

/settings

Settings

---

# 9. ERROR PAGES

/404

Not Found

403

Forbidden

500

Server Error

Network Error state

---

# 10. HOME PAGE

Home sahifasi professional landing page bo‘lsin.

Hero:

E-AVTO TEST

"Haydovchilik imtihoniga
ishonch bilan tayyorlaning."

Buttons:

"Testni boshlash"

"Kurslarni ko‘rish"

Hero ichida avtomobil/road visual ishlat.

---

# 11. HOME SECTIONS

Hero

Features

Popular Courses

How It Works

Statistics

Why E-Avto Test

Testimonials

FAQ

CTA

Footer

---

# 12. FEATURES

Feature cards:

🎬 Video darslar

📝 Real testlar

⏱ Timer

📊 Natijalar

📈 Progress

🏆 Reyting

---

# 13. COURSES PAGE

Courses sahifasida:

Search

Category filter

Difficulty filter

Sort

Course cards

Har bir card:

Image

Title

Description

Lessons count

Progress

Difficulty

Button

---

# 14. COURSE DETAILS

Course:

Title

Description

Progress

Lessons

Completed lessons

Remaining lessons

Course progress bar

Har bir lesson:

Number

Title

Duration

Video icon

Completed status

Lock status

Start button

---

# 15. LESSON PAGE

Lesson:

Title

Video

Description

Duration

Learning objectives

Previous lesson

Next lesson

"Testni boshlash" button

---

# 16. VIDEO PLAYER

Custom VideoPlayer component yarat.

Features:

Play/Pause

Volume

Mute

Progress bar

Current time

Duration

Fullscreen

Playback speed

0.75x

1x

1.25x

1.5x

2x

Responsive design.

Video loading state.

Video error state.

Thumbnail.

---

# 17. TEST PAGE

Test UI professional bo‘lsin.

Header:

Test name

Question number

Progress

Timer

Main:

Question

Optional road sign image

4 answer options

Navigation

Footer:

Previous

Next

Finish

---

# 18. QUESTION COMPONENT

QuestionCard:

Question text

Image

Option A

Option B

Option C

Option D

Selected state

Disabled state

Correct state

Wrong state

Har bir variant keyboard bilan ham tanlanishi mumkin.

---

# 19. TIMER

Timer:

20:00

19:59

19:58

...

Timer tugaganda test avtomatik submit bo‘lsin.

Agar vaqt 5 daqiqadan kam qolsa warning state.

1 daqiqadan kam qolsa danger state.

Timer test state bilan Zustand orqali boshqarilsin.

---

# 20. TEST NAVIGATION

Question navigator:

1
2
3
4
5
...

Rang/state:

Unanswered

Answered

Current

Marked

---

# 21. TEST RESULT

Natija:

Score

Percentage

Correct

Wrong

Skipped

Time spent

Status

Masalan:

17 / 20

85%

Correct: 17
Wrong: 3
Skipped: 0

"Testdan o'tdingiz"

Buttons:

"Xatolarni ko‘rish"

"Qayta ishlash"

"Testlar"

---

# 22. TEST REVIEW

Har bir savol:

Question

User answer

Correct answer

Explanation

Status

Correct/Wrong

Misol:

❌ Noto‘g‘ri

Sizning javobingiz:

B

To‘g‘ri javob:

C

Izoh:

Bu belgi asosiy yo‘lni bildiradi.

---

# 23. DASHBOARD

Dashboard:

Salom, User 👋

Overall Progress

Completed Lessons

Completed Tests

Average Score

Best Score

Current Streak

Recent Tests

Continue Learning

Recommended Lessons

---

# 24. PROGRESS PAGE

Charts:

Weekly tests

Average score

Completed lessons

Learning time

Progress percentage

Recharts ishlat.

---

# 25. HISTORY

Test history:

Test name

Date

Score

Percentage

Status

Time

Review button

Filter:

All

Passed

Failed

---

# 26. LEADERBOARD

Leaderboard:

Rank

Avatar

Name

Tests

Average score

Points

Top 3 uchun maxsus UI.

---

# 27. PROFILE

Profile:

Avatar

Name

Email

Phone

Statistics

Tests completed

Average score

Best score

Lessons completed

---

# 28. SETTINGS

Settings:

Profile

Appearance

Language

Notifications

Security

Logout

Theme:

Light

Dark

System

---

# 29. NAVIGATION

Desktop Navbar:

Logo

Home

Courses

Tests

Leaderboard

About

Profile

Mobile:

Hamburger menu.

Student login bo‘lganda:

Dashboard

Courses

Tests

History

Profile

---

# 30. FOOTER

Footer:

Logo

About

Quick Links

Courses

Tests

Contact

Social icons

Copyright

Privacy Policy

Terms

---

# 31. UI COMPONENTS

Reusable components yarat:

Button

Input

Select

Modal

Dialog

Card

Badge

Avatar

Progress

Skeleton

Spinner

Tooltip

Dropdown

Tabs

Toast

Alert

Breadcrumb

Pagination

EmptyState

ErrorState

ConfirmDialog

---

# 32. DESIGN SYSTEM

Global design tokens yarat.

Colors:

Primary

Secondary

Background

Surface

Text

Muted

Success

Warning

Danger

Border

Typography:

Heading

Subtitle

Body

Caption

Button

Spacing:

4

8

12

16

24

32

48

64

80

---

# 33. RESPONSIVE

Desktop:

1440px+

Tablet:

768px–1439px

Mobile:

320px–767px

Mobile UX juda yaxshi bo‘lsin.

Test sahifasida mobile uchun:

Question

Options

Timer

Navigation

ekranga mos joylashsin.

---

# 34. DARK MODE

Dark mode professional bo‘lsin.

Theme state Zustand orqali boshqarilsin.

localStorage bilan saqlansin.

---

# 35. STATE MANAGEMENT

Zustand:

authStore

testStore

uiStore

Auth:

user

isAuthenticated

login

logout

Test:

currentQuestion

answers

timer

markedQuestions

startTest

answerQuestion

nextQuestion

previousQuestion

finishTest

UI:

theme

sidebar

modal

---

# 36. API ARCHITECTURE

Hozir backend mavjud emas.

Shuning uchun:

services/

ichida API layer yarat.

Axios instance:

api.ts

Kelajakda:

VITE_API_URL

orqali backend URL olinadigan bo‘lsin.

Hozir mock service ishlat.

Keyinchalik:

mockCourses

o‘rniga:

courseService.getCourses()

ishlatish mumkin bo‘lsin.

---

# 37. MOCK DATA

Real backend bo‘lmagani uchun demo ma'lumot yarat.

Kamida:

5 ta course

15 ta lesson

50 ta question

5 ta test result

3 ta user

Leaderboard data

yarat.

---

# 38. LOCAL STORAGE

Quyidagilarni localStorage orqali saqla:

theme

mock authentication

test progress

test answers

test history

user preferences

Backendga o'tilganda bu arxitektura oson almashtiriladigan bo‘lsin.

---

# 39. ACCESSIBILITY

WCAG prinsiplariga rioya qil.

Buttonlar keyboard bilan ishlasin.

Input labelga ega bo‘lsin.

Images alt bilan bo‘lsin.

Focus state bo‘lsin.

Color bilan birgina statusni ifodalama.

---

# 40. PERFORMANCE

Quyidagilarni ishlat:

React.lazy

Suspense

dynamic imports

image lazy loading

memoization faqat kerak bo‘lganda

pagination

debounce

code splitting

Keraksiz re-renderlarni kamaytir.

---

# 41. ERROR STATES

Har bir sahifada:

Loading

Success

Empty

Error

state mavjud bo‘lsin.

Masalan Courses:

Loading:
Skeleton cards

Error:
"Kurslarni yuklashda xatolik yuz berdi"

Empty:
"Hozircha kurslar mavjud emas"

---

# 42. ANIMATIONS

Framer Motion yordamida faqat kerakli joylarda animation:

Page transition

Card hover

Modal

Dropdown

Progress

Test question transition

Result animation

Ortiqcha animation ishlatma.

Performance birinchi o‘rinda.

---

# 43. SECURITY

Frontendda:

JWT tokenni kelajakdagi API arxitekturasiga mos boshqar.

Xavfsiz route yarat.

Admin/student route'larini ajratish uchun extensible ProtectedRoute yarat.

Muhim:

Frontenddagi role tekshiruvi faqat UI uchun.

Haqiqiy authorization backendda bajariladi.

---

# 44. CODE QUALITY

TypeScript strict mode ishlat.

any ishlatishni minimumga tushir.

Reusable componentlar yarat.

Duplicate code yozma.

Componentlarni juda katta qilib yuborma.

Business logicni UI ichiga aralashtirma.

Services, hooks, store va componentsni alohida saqla.

---

# 45. NAMING

Components:

PascalCase

Button.tsx

VideoPlayer.tsx

QuestionCard.tsx

Functions:

camelCase

startTest()

finishTest()

getCourses()

Variables:

camelCase

Types:

PascalCase

User

Course

Question

TestResult

---

# 46. ENV

Frontend:

.env

VITE_API_URL=[http://localhost:5000/api](http://localhost:5000/api)

.env.example yarat.

.env GitHubga ketmasin.

---

# 47. README

README ichida:

Project description

Features

Technologies

Installation

Commands

Environment variables

Folder structure

Development

Production build

API connection

Future backend integration

hammasini yoz.

---

# 48. FINAL QUALITY

Loyiha:

* professional;
* responsive;
* scalable;
* clean;
* fast;
* accessible;
* reusable;
* backendga tayyor

bo‘lishi kerak.

Fake backend yozma.

Frontend ichida backend logikasini yaratma.

Mock data orqali demo ishlasin.

Har bir page navigation orqali ishlasin.

Hech qanday broken route qolmasin.

Hech qanday console error qolmasin.

npm run build xatosiz ishlashi kerak.

Yakunida:

npm run dev

bilan frontend to‘liq ishga tushsin.

npm run build

production build xatosiz yaratsin.

---

# 49. ISHLAB CHIQISH TARTIBI

Frontendni quyidagi ketma-ketlikda yarat:

1. Vite + React + TypeScript
2. Tailwind CSS
3. Folder structure
4. Design system
5. Routing
6. Layout
7. Navbar/Footer
8. UI components
9. Mock data
10. Home
11. Authentication pages
12. Courses
13. Course Details
14. Lesson
15. Video Player
16. Test system
17. Timer
18. Result
19. Review
20. Dashboard
21. Progress
22. History
23. Leaderboard
24. Profile
25. Settings
26. Responsive
27. Dark mode
28. Animations
29. Error states
30. Performance optimization
31. API service architecture
32. Final testing

Har bosqichdan keyin loyihani tekshir.

Bir bosqichda juda ko‘p kodni chalkashtirib yuborma.

Mavjud fayllarni keraksiz o‘chirib yuborma.

---

# 50. FINAL RESULT

Yakuniy frontend quyidagi flow bilan to‘liq ishlasin:

Home
→ Courses
→ Course Details
→ Lesson
→ Video
→ Start Test
→ Questions
→ Timer
→ Finish
→ Result
→ Review Errors
→ Retry Test

Va:

Login
→ Dashboard
→ Progress
→ History
→ Leaderboard
→ Profile
→ Settings

barchasi ishlaydigan frontend bo‘lsin.

BACKEND HOZIRCHA YO‘Q.

Barcha ma'lumotlar MOCK DATA orqali ishlasin.

Frontend keyinchalik Node.js/Express REST API backendga ulanishga tayyor arxitekturada qurilsin.
