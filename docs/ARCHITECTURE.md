# E-AVTO TEST ARCHITECTURE

```text
+-------------------------------------------------------------+
|                      CLIENT (BROWSER)                       |
|  React 18 + TypeScript + Vite + Tailwind CSS + Lucide React |
|  Zustand (Global State) + React Router v6 + Axios Client     |
+------------------------------+------------------------------+
                               |
                               | REST API (JSON)
                               v
+-------------------------------------------------------------+
|                     BACKEND (API SERVER)                    |
|  Node.js + Express + TypeScript                             |
|  Middlewares: Auth (JWT), Admin, RateLimit, Helmet, CORS     |
|  Validators: Zod schemas                                    |
|  Services: Business Logic (Auth, Course, Test, Result, User)|
|  Controllers: HTTP req/res handlers                         |
+------------------------------+------------------------------+
                               |
                               | Prisma ORM
                               v
+-------------------------------------------------------------+
|                     DATABASE (PostgreSQL)                   |
|  Tables: User, Course, Lesson, Video, Question, Test,       |
|          UserAnswer, Progress, LessonProgress, PasswordReset|
+-------------------------------------------------------------+
```

## Security Invariants
- Passwords hashed with `bcryptjs` (min 10 salt rounds).
- JWT stored in localStorage and sent in the Authorization header (no cookies, so no CSRF surface; XSS must be prevented).
- Test answers evaluated only on server side.
- Media hosted on external CDN/Object Storage (URLs in database).
