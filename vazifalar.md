# 🚗 E-Avto Test — Vazifalar Ro'yxati (Task Tracker)

Barcha asosiy bosqichlar to'liq ishlab chiqildi va muvaffaqiyatli sinovdan o'tkazildi.

---

## 📌 Bosqichlar va Holatlar

### 🏗️ 1-BOSQICH: AI Boshqaruvi va Kontekst Tizimi
- [x] Loyiha strukturasini tahlil qilish
- [x] `.ai/` papkasini shakllantirish (`PROJECT.md`, `RULES.md`, `TASKS.md`, `ARCHITECTURE.md`)
- [x] `AGENTS.md` ko'rsatmalarini yangilash

---

### 🎨 2-BOSQICH: Frontend Asosi, Turlar va Dizayn Tizimi
- [x] **Types**: `user.ts`, `course.ts`, `lesson.ts`, `question.ts`, `test.ts`, `result.ts`, `api.ts`
- [x] **Utils**: `cn.ts`, `formatTime.ts`, `formatDate.ts`, `calculateProgress.ts`, `storage.ts`
- [x] **Store (Zustand)**: `auth.store.ts`, `test.store.ts`, `ui.store.tsx` (Dark/Light tema, Sidebar)
- [x] **Services**: `api.ts` (Axios interceptor), `auth.service.ts`, `course.service.ts`, `lesson.service.ts`, `test.service.ts`, `result.service.ts`, `user.service.ts`, `admin.service.ts`
- [x] **Mock Data**: Realistik YHQ savollari, variantlar, tushuntirishlar, darslar va kurslar banki
- [x] **UI Components**: `Button`, `Card`, `Badge`, `Modal`, `Input`, `Select`, `Progress`, `Spinner`, `Tabs`, `Alert`, `Table`

---

### 🧭 3-BOSQICH: Layouts, Navigatsiya va Routing
- [x] `MainLayout.tsx` (Navbar, Footer, Qidiruv, Foydalanuvchi menyusi)
- [x] `AuthLayout.tsx` (Chiroyli UI kartalar va avto vizual banner)
- [x] `StudentLayout.tsx` (Sidebar, Topbar, Profil holati, Dark mode)
- [x] `AdminLayout.tsx` (Admin panel qobig'i va menyusi)
- [x] `ProtectedRoute.tsx`, `AdminRoute.tsx`, `AppRoutes.tsx`
- [x] 404, 403 xatolik sahifalari

---

### 🌐 4-BOSQICH: Ommaviy va Autentifikatsiya Sahifalari
- [x] `HomePage.tsx` (Hero, Features, Popular Courses, How it works, Stats, FAQ, Testimonials, CTA)
- [x] `CoursesPage.tsx` & `CourseDetailPage.tsx` (Kurslar katalogi, qidiruv va filtrlash, syllabus)
- [x] `AboutPage.tsx`, `ContactPage.tsx`, `FaqPage.tsx`
- [x] `LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` (Zod + Hook Form + Demo hisoblar)

---

### 🎓 5-BOSQICH: Talaba Kabineti, Darslar va Video Player
- [x] `DashboardPage.tsx` (Progress ko'rsatkichlari, so'nggi testlar, streak, bilim darajasi)
- [x] `LessonsPage.tsx` & `LessonDetailPage.tsx` (Mavzular katalogi, nazariya)
- [x] `VideoLessonPage.tsx` (Video player, dars progressi, testga o'tish)

---

### ⏱️ 6-BOSQICH: Test Tizimi (Interaktiv Imtihon, Timer & Tahlil)
- [x] `TestsListPage.tsx` (Test rejimlarini tanlash: 20 talik, Mavzuli, Marafon, Xatolar bilan ishlash)
- [x] `TestActivePage.tsx` (Jonli timer, savollar matritsasi, navigatsiya, javob tanlash, tasdiqlash modali)
- [x] `TestResultPage.tsx` (Ball, foiz, o'tish holati, sarflangan vaqt)
- [x] `TestReviewPage.tsx` (Savollar tahlili, to'g'ri/noto'g'ri javoblar, YHQ moddalari izohi)
- [x] `HistoryPage.tsx` (O'tilgan testlar tarixi va jadvali)
- [x] `ProgressPage.tsx` (Recharts statistikasi va bilim darajasi grafigi)
- [x] `LeaderboardPage.tsx` (Talabalar podiumi va to'liq reyting jadvali)
- [x] `ProfilePage.tsx` (Profilni tahrirlash va parolni yangilash)

---

### ⚙️ 7-BOSQICH: Admin Boshqaruv Paneli
- [x] `AdminDashboardPage.tsx` (KPI statistikasi, faollik monitoringi)
- [x] `AdminCoursesPage.tsx` (Kurslar yaratish va boshqarish)
- [x] `AdminQuestionsPage.tsx` (Savollar banki, yangi savol qo'shish modali, to'g'ri javobni belgilash)
- [x] `AdminUsersPage.tsx` (Foydalanuvchilar ro'yxati va rollari)

---

### 🔌 8-BOSQICH: Backend Muvozanati, Xavfsizlik va Integratsiya
- [x] Backend API va Frontend turlarini sinxronlash
- [x] Test vaqtida javoblarni yashirish va serverda hisoblash xavfsizligi
- [x] Prisma model va servis qatlami tekshiruvi

---

### 🚀 9-BOSQICH: Build, Testlash va Hujjatlashtirish
- [x] Frontend `npm run build` va `npm run typecheck` (Muvaffaqiyatli yakunlandi: 0 xato)
- [x] Backend `npm run build` va `npm run typecheck` (Muvaffaqiyatli yakunlandi: 0 xato)

---

### 🤖 10-BOSQICH: Skilllardan foydalanish qoidasi

Har bir yangi vazifani boshlashdan avval mos `SKILL.md` faylini o‘qing.
Skilllar `skills/` papkasida, to‘liq yo‘riqnoma esa `skills/PROJECT_SKILLS.md`
va `AGENTS.md`da joylashgan.

| Vazifa turi | Qayerda ishlatiladi | O‘qiladigan skill |
|---|---|---|
| Frontend + backend yangi funksiya | `frontend/src/` va `backend/src/` birga o‘zgarsa | `skills/claude-skills/skills/fullstack-guardian/SKILL.md` |
| React sahifa, component, hook, Zustand yoki forma | `frontend/src/pages/`, `components/`, `hooks/`, `store/` | `skills/claude-skills/skills/react-expert/SKILL.md` |
| Responsive UI, Tailwind, dark mode, accessibility | `frontend/src/components/`, `index.css`, Tailwind config | `skills/ui-ux-pro-max-skill/cli/assets/skills/ui-styling/SKILL.md` |
| API endpoint, controller, service yoki CRUD | `backend/src/routes/`, `controllers/`, `services/`, `validators/` | `skills/claude-skills/skills/api-designer/SKILL.md` |
| JWT, login, admin rol, Zod, CORS, rate limit | `backend/src/middleware/`, `validators/`, `utils/`, auth service | `skills/claude-skills/skills/secure-code-guardian/SKILL.md` |
| Prisma model, migration, indeks yoki seed | `backend/prisma/schema.prisma`, `migrations/`, `seed.ts` | `skills/claude-skills/skills/postgres-pro/SKILL.md` va `skills/awesome-ai-agent-skills/database/database-migration/SKILL.md` |
| Query performance va database optimizatsiyasi | Prisma service querylari va `schema.prisma` indekslari | `skills/claude-skills/skills/database-optimizer/SKILL.md` |
| Unit, integration yoki E2E test | Test fayllari, login/course/test flow | `skills/awesome-ai-agent-skills/code-and-development/testing/SKILL.md`, E2E uchun `skills/claude-skills/skills/playwright-expert/SKILL.md` |
| Bug, typecheck yoki runtime xatosi | Xato chiqqan frontend/backend modul | `skills/claude-skills/skills/debugging-wizard/SKILL.md` |
| Kod va security review | Pull request yoki yakuniy o‘zgarishlar | `skills/claude-skills/skills/code-reviewer/SKILL.md`, security uchun `skills/awesome-ai-agent-skills/security/security-audit/SKILL.md` |
| Docker, CI/CD va deployment | `docker-compose.yml`, `.github/workflows/`, `.env.example`, README | `skills/awesome-ai-agent-skills/devops-and-infrastructure/docker-compose-setup/SKILL.md` va `ci-cd/SKILL.md` |

#### Har bir yangi task uchun ketma-ketlik

- [ ] Task turiga mos skillni jadvaldan tanlab, `SKILL.md`ni o‘qish.
- [ ] Agar API o‘zgarsa frontend service/type va `docs/api.md`ni ham yangilash.
- [ ] Agar database o‘zgarsa migration, `prisma generate` va `prisma validate`ni tekshirish.
- [ ] Auth yoki foydalanuvchi ma’lumoti bo‘lsa server tomondagi validation va authorizationni tekshirish.
- [ ] Yakunda `npm run typecheck`, build va tegishli testni bajarish.
