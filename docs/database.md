# Ma'lumotlar bazasi — E-Avto Test

PostgreSQL + Prisma ORM (`backend/prisma/schema.prisma`).

| Model | Asosiy maydonlar | Bog‘lanish |
|-------|-----------------|------------|
| `User` | `id, name, email*?, phone?, passwordHash?, telegramId*?, role(USER/ADMIN), isActive, tokenVersion, avatarUrl?` | `Test[]`, `Progress[]`, `LessonProgress[]`, `PasswordReset[]` |
| `Course` | `id, title, description, thumbnail?, level, order, isPublished` | `Lesson[]`, `Question[]`, `Progress[]`, `Test[]` |
| `Lesson` | `id, courseId, title, description?, content?, videoUrl?, thumbnail?, duration(soniya), order, isPublished` | `Course`, `Video?`, `Question[]`, `LessonProgress[]` |
| `Video` | `id, lessonId*, url, title?, duration` | `Lesson` (1:1) |
| `Question` | `id, courseId?, lessonId?, text, imageUrl?, explanation?, difficulty(EASY/MEDIUM/HARD), options(JSON string[]), correctIndex, order` | `Course?`, `Lesson?`, `UserAnswer[]` |
| `Test` | `id, userId, courseId?, totalQuestions, duration(soniya), correctAnswers, wrongAnswers, score, passed, timeSpent, startedAt, finishedAt?` | `User`, `Course?`, `UserAnswer[]` |
| `UserAnswer` | `id, testId, questionId, selectedIndex(-1 = javobsiz), isCorrect, optionOrder(JSON int[])` | `Test`, `Question` |
| `Progress` | `id, userId, courseId, completedLessons, percent` — `@@unique(userId, courseId)` | `User`, `Course` |
| `LessonProgress` | `id, userId, lessonId, percent, completed` — `@@unique(userId, lessonId)` | `User`, `Lesson` |
| `TelegramLogin` | `id, telegramId?, firstName?, username?, codeHash?, attempts, expiresAt, usedAt?` | — |
| `PasswordReset` | `id, userId, tokenHash*, expiresAt, usedAt?` | `User` |

## Test urinishi qanday saqlanadi

`Test` — bitta urinish. Boshlanganda har bir savol uchun `UserAnswer` (`selectedIndex = -1`) yaratiladi va `optionOrder` ga shu urinish uchun aralashgan variantlar tartibi yoziladi (`optionOrder[i]` — `i`-o‘rinda ko‘rsatilgan asl variant indeksi). Shu sabab javob indeksi mijozga ko‘rsatilgan tartibga nisbatan, baholash esa asl `correctIndex` bo‘yicha serverda bajariladi.

`finishedAt IS NULL` — urinish yakunlanmagan: u ro‘yxatlarda ko‘rinmaydi va natija/tahlil ochilmaydi. Yakunlash `updateMany(... finishedAt: null)` orqali bajariladi, shuning uchun parallel takroriy so‘rovlar ikkinchi natija yaratmaydi.

Eslatma: `wrongAnswers` — faqat noto‘g‘ri javob berilganlar; javobsizlar `totalQuestions - correctAnswers - wrongAnswers`.

## Indekslar

`Lesson.courseId`, `Question.courseId`, `Question.lessonId`, `Test.userId`, `Test.courseId`, `UserAnswer.testId`, `UserAnswer.questionId`, `PasswordReset.userId`, shuningdek `User.email`, `PasswordReset.tokenHash` va `Progress/LessonProgress` unique indekslari.

## Migratsiya va seed

Migratsiyalar `backend/prisma/migrations` da (repoga kiritilgan). Development:

```bash
npm run prisma:migrate    # yangi migratsiyalarni qo‘llaydi (sxemani o‘zgartirsangiz: -- --name <nom>)
npm run prisma:seed       # demo ma'lumotlar (faqat development)
```

Production va test bazalari: `npm run prisma:deploy` (`prisma migrate deploy`). Seed `NODE_ENV=production` bo‘lsa ishlashdan bosh tortadi (u kurs/savol jadvallarini tozalaydi). Demo parollar `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` orqali o‘zgartiriladi.

---

# Kengaytirilgan model (06–15-bosqichlar)

Yuqoridagi jadval dastlabki o‘quv modellari. Quyidagilar platforma funksiyalari uchun qo‘shilgan (to‘liq tavsif — `backend/prisma/schema.prisma`).
**Pul** hamma joyda `Int`, minor birlikda (tiyin; 1 so‘m = 100) — floating-point yo‘q. `User.role`: `USER` (o‘quvchi), `TEACHER`, `MODERATOR`, `FINANCE`, `ADMIN`, `SUPERADMIN`.

| Soha | Modellar | Muhim qoidalar |
|---|---|---|
| Profillar | `StudentProfile`, `TeacherProfile` | `userId` unique |
| Katalog | `CoursePackage`, `Price`, `Discount`, `Coupon`, `CouponRedemption` | Narx tarixi saqlanadi (`validFrom/To`); promo-kod `redeemedCount` bitta shartli UPDATE bilan oshadi (poygadan himoya) |
| Savdo | `Order`, `OrderItem`, `Payment`, `PaymentEvent`, `Refund` | `OrderItem` — xarid paytidagi narx nusxasi; `PaymentEvent` `@@unique(provider, providerEventId)` — takroriy callback no-op; `Payment` `@@unique(provider, providerPaymentId)` |
| Kirish | `Enrollment` | `@@unique(userId, courseId)`; faqat tasdiqlangan to‘lovdan keyin; to‘liq refunddan so‘ng `REVOKED` |
| O‘qitish | `TeacherGroup`, `GroupMembership`, `ScheduleSlot`, `AttendanceSession`, `AttendanceRecord` | A’zolik `@@unique(groupId, studentId)`; sessiya `slotId` unique; yozuv `@@unique(sessionId, studentId)`; vaqtlar UTC |
| Imtihon | `TestConfig` (kurs bo‘yicha), `Test.passScore`, `Question.isPublished` | Qoidalar urinish boshlanganda `Test`ga nusxalanadi |
| Media | `VideoAsset`, `FileAsset`, `MediaAccessLog` | Faqat ichki `storageKey`; ommaviy URL yo‘q |
| Xabar | `Notification`, `NotificationPreference` | `@@unique(userId, dedupeKey)` — bir hodisaga bitta xabar; `emailStatus` (`NONE/PENDING/SENT/FAILED/SKIPPED`), `inApp` |
| CMS | `Page`, `NewsArticle`, `FaqItem`, `SiteSetting`, `ContactMessage` | `slug` unique; matn yozishda tozalanadi |
| Audit | `AuditLog` | Faqat qo‘shiladi; parol/token/karta kalitlari olib tashlanadi |
| Xavfsizlik | `User.failedLogins`, `User.lockedUntil`, `User.tokenVersion` | 8 xato parol → 15 daqiqa blokirovka; `tokenVersion` sessiyalarni bekor qiladi |

Migratsiyalar: `init`, `full_platform`, `exam_config`, `account_lockout`, `notification_delivery`. Hammasi faqat qo‘shadi (ma’lumot o‘chirmaydi).
