Ha. Bu loyiha uchun eng yaxshi usul — **bitta AI'ga hamma ishni berish emas**, balki Gemini, Claude Code/Anthropic, ChatGPT/Codex va GitHub'ni vazifalarga bo‘lib ishlatish. Shunda prompt kamroq ketadi, kod takrorlanmaydi va har bir AI o‘ziga tegishli ishni bajaradi.

Quyida **E-Avto Test AI Development System** uchun tayyor struktura va master prompt bor.

---

# 1. AI'larni vazifaga bo‘lish

| AI / Tool           | Asosiy vazifa                          | Tavsiya |
| ------------------- | -------------------------------------- | ------: |
| **Claude Code**     | Asosiy coding, refactor, debugging     |   ⭐⭐⭐⭐⭐ |
| **ChatGPT / Codex** | Arxitektura, tekshiruv, integration    |   ⭐⭐⭐⭐⭐ |
| **Gemini CLI**      | Research, documentation, ikkinchi fikr |    ⭐⭐⭐⭐ |
| **GitHub**          | Code, Issues, PR, version control      |   ⭐⭐⭐⭐⭐ |
| **GitHub Skills**   | Git/GitHub workflow                    |    ⭐⭐⭐⭐ |

**Muhim:** bir xil faylni bir vaqtning o‘zida 2–3 ta AI'ga yozdirmang.

Masalan:

```text
Claude → frontend kod
Codex → backend kod
Gemini → research/documentation
GitHub → version control
```

Keyin:

```text
Codex → Claude yozgan frontendni review
Claude → Codex yozgan backendni review
```

---

# 2. Loyiha uchun AI papka strukturasi

Loyihaning root qismida:

```text
e-avto-test/
│
├── frontend/
├── backend/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   └── ai/
│
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
│
├── .ai/
│   ├── PROJECT.md
│   ├── ARCHITECTURE.md
│   ├── RULES.md
│   ├── TASKS.md
│   ├── FRONTEND.md
│   ├── BACKEND.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   └── CHANGELOG.md
│
├── .gitignore
└── README.md
```

Bu juda muhim.

AI har safar butun loyihani qaytadan tushunishga urinmaydi.

U:

```text
.ai/PROJECT.md
.ai/RULES.md
.ai/ARCHITECTURE.md
.ai/TASKS.md
```

ni o‘qib ishlaydi.

Natijada **prompt tokenlari ancha kamayadi**.

---

# 3. AI uchun asosiy "Memory" fayl

`.ai/PROJECT.md`

```md
# E-AVTO TEST

## Project

E-Avto Test — avtomobil haydash nazariyasini o‘rganish va test ishlash platformasi.

## Main Features

- Video lessons
- Courses
- Lessons
- Tests
- Questions
- Timer
- Test results
- Test review
- Progress
- Test history
- Leaderboard
- User profile
- Admin management

## Architecture

Frontend:
React
TypeScript
Vite
Tailwind CSS
React Router
Zustand
Axios

Backend:
Node.js
Express
TypeScript
Prisma

Database:
PostgreSQL

Authentication:
JWT
bcrypt

Validation:
Zod

Video:
External video storage/CDN

## Repository

frontend/
backend/

## Important

Backend must never expose correct answers during an active test.

Frontend must not calculate authoritative test results.

Backend calculates final results.

Video files should not be streamed through the Node.js API server.

All secrets must use environment variables.

Do not modify unrelated files.

Do not rewrite existing architecture without approval.
```

---

# 4. AI qoidalari

`.ai/RULES.md`

```md
# AI DEVELOPMENT RULES

1. Before changing code, inspect the existing project.

2. Never delete working functionality without reason.

3. Never rewrite the entire project for a small task.

4. Keep frontend and backend separate.

5. Use TypeScript strict mode.

6. Avoid any.

7. Keep business logic outside UI components.

8. Use services for API calls.

9. Use Zustand only where global state is actually needed.

10. Do not duplicate components.

11. Backend validation is mandatory.

12. Never trust frontend validation.

13. Never expose correct answers during an active test.

14. Backend is the authority for test results.

15. Never store passwords as plaintext.

16. Never hardcode secrets.

17. Never commit .env.

18. Never store large videos inside the backend server.

19. Use pagination for large lists.

20. Avoid N+1 database queries.

21. Add database indexes where appropriate.

22. Use reusable components.

23. Keep API response format consistent.

24. Add loading, error and empty states.

25. Mobile responsive design is required.

26. Do not add unnecessary dependencies.

27. Before installing a package, check whether an existing dependency can solve the problem.

28. Run lint/typecheck/build after significant changes.

29. Fix errors instead of hiding them.

30. Update documentation when architecture changes.

31. Create a Git commit after completing a logical task.

32. Do not mix unrelated tasks in one commit.
```

---

# 5. Vazifalarni boshqarish

`.ai/TASKS.md`

```md
# E-AVTO TEST TASK BOARD

## PHASE 1 — FOUNDATION

[ ] Project structure
[ ] Git configuration
[ ] Frontend setup
[ ] Backend setup
[ ] PostgreSQL
[ ] Prisma
[ ] Environment configuration

## PHASE 2 — AUTH

[ ] Register
[ ] Login
[ ] JWT
[ ] Password hashing
[ ] Protected routes
[ ] User profile

## PHASE 3 — COURSES

[ ] Course model
[ ] Course API
[ ] Course frontend
[ ] Course details

## PHASE 4 — LESSONS

[ ] Lesson model
[ ] Lesson API
[ ] Lesson frontend

## PHASE 5 — VIDEO

[ ] Video model
[ ] Video storage
[ ] Video player
[ ] Progress tracking

## PHASE 6 — TEST

[ ] Test model
[ ] Questions
[ ] Start attempt
[ ] Timer
[ ] Answers
[ ] Finish test
[ ] Result calculation
[ ] Review

## PHASE 7 — USER

[ ] Dashboard
[ ] History
[ ] Progress
[ ] Statistics
[ ] Leaderboard
[ ] Profile

## PHASE 8 — ADMIN

[ ] Admin auth
[ ] User management
[ ] Course management
[ ] Lesson management
[ ] Question management
[ ] Test management
[ ] Statistics

## PHASE 9 — SECURITY

[ ] Helmet
[ ] CORS
[ ] Rate limit
[ ] Validation
[ ] Error handling
[ ] Security review

## PHASE 10 — DEPLOYMENT

[ ] Frontend deployment
[ ] Backend deployment
[ ] PostgreSQL deployment
[ ] Video storage
[ ] Environment variables
[ ] HTTPS
[ ] Production testing
```

---

# 6. Claude Code uchun

Claude Code'ni **asosiy coding agent** sifatida ishlatish ma'qul.

Unga birinchi beriladigan prompt:

```text
You are the primary implementation agent for the E-Avto Test project.

Before doing anything:

1. Read:
   .ai/PROJECT.md
   .ai/RULES.md
   .ai/ARCHITECTURE.md
   .ai/TASKS.md

2. Inspect the existing repository.

3. Do not rewrite existing code unnecessarily.

4. Work only on the assigned task.

5. Before changing files, explain the implementation plan briefly.

6. Implement the task.

7. Run the relevant checks.

8. Fix errors.

9. Update TASKS.md.

10. Update documentation if necessary.

11. Summarize:
   - files changed
   - functionality added
   - tests/checks run
   - remaining issues

Do not start another task automatically.
```

### Claude uchun asosiy qoida:

**Claude = Developer**

```text
Task
 ↓
Inspect
 ↓
Plan
 ↓
Code
 ↓
Test
 ↓
Fix
 ↓
Commit
```

---

# 7. ChatGPT / Codex uchun

ChatGPT/Codex'ni **architect + reviewer + integration engineer** sifatida ishlat.

Prompt:

```text
You are the architecture and code-review agent for E-Avto Test.

Read:

.ai/PROJECT.md
.ai/RULES.md
.ai/ARCHITECTURE.md
.ai/TASKS.md

Your responsibilities:

1. Review architecture.
2. Review frontend/backend integration.
3. Review API contracts.
4. Detect security problems.
5. Detect performance problems.
6. Detect database problems.
7. Detect duplicated code.
8. Detect incorrect TypeScript.
9. Detect broken routes.
10. Detect API mismatch.

Do not rewrite the project automatically.

First report:

CRITICAL
HIGH
MEDIUM
LOW

Then provide exact fixes.

If code changes are requested, modify only the required files.

Never change architecture without explaining why.
```

---

# 8. Gemini uchun

Gemini'ni **research/documentation/second opinion** sifatida ishlat.

Prompt:

```text
You are the research and documentation agent for E-Avto Test.

Read:

.ai/PROJECT.md
.ai/RULES.md
.ai/ARCHITECTURE.md

Your responsibilities:

- Research current official documentation.
- Check framework recommendations.
- Check deployment options.
- Check security practices.
- Check database optimization techniques.
- Compare suitable free hosting options.
- Check current package/documentation changes.

Do not modify production code unless explicitly requested.

Return:

1. Recommendation
2. Reason
3. Advantages
4. Disadvantages
5. Free-tier limitations
6. Implementation steps
7. Risks

Prefer official documentation and current sources.
```

---

# 9. GitHub'ni qanday ishlatish

GitHub:

```text
Repository
Issues
Projects
Pull Requests
Actions
```

uchun ishlatiladi.

Vazifalarni:

```text
Issue #1
Setup project

Issue #2
Authentication

Issue #3
Courses API

Issue #4
Test system

Issue #5
Video system
```

qilib ajrat.

AI'ga:

```text
Implement Issue #4.
```

desang, u butun loyihani qaytadan tushunishga kamroq vaqt/token sarflaydi.

---

# 10. GitHub Skills

GitHub'ning **Skills** repositorylari interaktiv GitHub o‘rganish mashqlaridir. Ularni loyiha kodiga dependency sifatida yuklash shart emas.

Masalan:

```text
skills/
```

ichida quyidagilar kerak bo‘lishi mumkin:

```text
introduction-to-github
communicate-using-markdown
github-pages
review-pull-requests
```

Lekin **E-Avto Test uchun barcha Skills'ni yuklab olish shart emas**.

Asosiy maqsad — AI coding workflow.

---

# 11. Claude Skills

Claude uchun ham hamma skillni o‘rnatish shart emas.

E-Avto Test uchun kerak bo‘ladigan skill kategoriyalari:

```text
frontend development
backend development
database
API
testing
security
deployment
Git/GitHub
documentation
```

Agar Claude Code ishlatayotgan bo‘lsang, loyihaning `.ai/` qoidalari hamda Claude Code'ning loyiha instructions fayli orqali doimiy kontekst berish eng samarali usullardan biri.

---

# 12. ChatGPT/Codex uchun

Loyihaga:

```text
AGENTS.md
```

qo‘shish juda foydali.

Root:

```text
e-avto-test/
│
├── AGENTS.md
├── frontend/
├── backend/
├── .ai/
└── docs/
```

`AGENTS.md`:

```md
# E-AVTO TEST — AGENT INSTRUCTIONS

## Project

E-Avto Test.

## Read First

.ai/PROJECT.md
.ai/RULES.md
.ai/ARCHITECTURE.md
.ai/TASKS.md

## Repository

frontend/
backend/

## Frontend

React
TypeScript
Vite
Tailwind
Zustand
Axios

## Backend

Node.js
Express
TypeScript
Prisma

## Database

PostgreSQL

## Rules

Do not rewrite unrelated code.

Do not expose test answers.

Do not trust frontend calculations.

Backend calculates results.

Do not store videos on API server.

Do not commit secrets.

Use environment variables.

Use pagination.

Use validation.

Run tests/build after changes.

Update documentation when needed.

Only perform the requested task.
```

Bu fayl AI coding agentlar uchun juda qulay.

---

# 13. Vazifani AI'lar orasida bo‘lish

Masalan **Test System**:

### Claude

```text
Implement the backend test system.

Read .ai/TASKS.md.

Implement only:

- TestAttempt
- UserAnswer
- start test
- answer
- finish test
- result calculation
- timer validation

Do not modify frontend.
```

### Codex

Keyin:

```text
Review Claude's test backend implementation.

Check:

- security
- timer manipulation
- duplicate submissions
- database transactions
- correct answer exposure
- authorization
- performance

Do not rewrite unless necessary.
```

### Gemini

Keyin:

```text
Research current best practices for secure online exam/test systems.

Focus on:

- timer security
- answer submission
- anti-cheating architecture
- API security
- database optimization

Compare the current E-Avto implementation against these practices.
```

Shu bilan **uch AI bir-birining ishini takrorlamaydi**.

---

# 14. Eng tejamkor AI workflow

Men quyidagini tavsiya qilaman:

```text
                 PROJECT
                    │
                    ▼
              TASKS.md
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Claude     Codex     Gemini
       CODE       REVIEW    RESEARCH
          │         │         │
          └─────────┼─────────┘
                    ▼
                 GitHub
                    │
              Pull Request
                    │
                    ▼
                 TEST/CI
                    │
                    ▼
                PRODUCTION
```

---

# 15. Tokenni eng ko‘p tejaydigan qoida

AI'ga har safar:

❌

```text
Menga E-Avto Test loyihasini tushuntirib ber...
Frontend React...
Backend Node...
Database...
Test...
Video...
```

deb yozma.

Buning o‘rniga:

```text
Read .ai/PROJECT.md
Read .ai/RULES.md
Read .ai/TASKS.md

Implement TASK-024 only.
```

Shu yetadi.

---

# 16. TASK ID tizimi

`.ai/TASKS.md`ni shunday qil:

```text
TASK-001 Project setup
TASK-002 Frontend setup
TASK-003 Backend setup
TASK-004 Database
TASK-005 Authentication
TASK-006 User profile
TASK-007 Courses
TASK-008 Lessons
TASK-009 Video
TASK-010 Test questions
TASK-011 Test attempt
TASK-012 Timer
TASK-013 Test result
TASK-014 Review
TASK-015 Progress
TASK-016 History
TASK-017 Leaderboard
TASK-018 Admin
TASK-019 Security
TASK-020 Performance
TASK-021 Deployment
TASK-022 Final testing
```

AI'ga:

```text
Implement TASK-012 only.
```

deysan.

Bu juda katta **prompt/token tejaydi**.

---

# 17. Har bir AI'ga hamma narsani berma

### Claude

```text
CODE
DEBUG
REFACTOR
TEST
```

### ChatGPT/Codex

```text
ARCHITECTURE
CODE REVIEW
SECURITY
API INTEGRATION
PERFORMANCE
```

### Gemini

```text
RESEARCH
DOCUMENTATION
COMPARISON
CURRENT BEST PRACTICES
```

### GitHub

```text
VERSION CONTROL
ISSUES
PR
CI/CD
RELEASE
```

---

# 18. Yakuniy loyiha

```text
e-avto-test/
│
├── frontend/
│   └── React + TypeScript
│
├── backend/
│   └── Node + Express + TypeScript
│
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   └── ARCHITECTURE.md
│
├── .ai/
│   ├── PROJECT.md
│   ├── RULES.md
│   ├── ARCHITECTURE.md
│   ├── TASKS.md
│   ├── FRONTEND.md
│   ├── BACKEND.md
│   ├── API.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
│
├── .github/
│   ├── workflows/
│   └── pull_request_template.md
│
├── AGENTS.md
├── README.md
└── .gitignore
```

### Eng yaxshi kombinatsiya

**Claude Code → asosiy dasturchi**

**ChatGPT/Codex → arxitektor + reviewer**

**Gemini → research + documentation**

**GitHub → barcha kod va task nazorati**

Shunday tashkil qilsangiz, AI'lar bir-birining ishini takrorlamaydi, loyiha konteksti `.ai/` va `AGENTS.md` orqali saqlanadi va har bir yangi promptni uzun-uzun yozish shart bo‘lmaydi.
