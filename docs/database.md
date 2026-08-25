# Ma'lumotlar bazasi — E-Avto Test

PostgreSQL + Prisma ORM. Asosiy modellar:

| Model | Asosiy maydonlar | Bog‘lanish |
|-------|-----------------|------------|
| `User` | `id, name, email*, passwordHash, role(USER/ADMIN)` | `Progress[]`, `Test[]` |
| `Course` | `id, title, description, thumbnail, level, order` | `Lesson[]`, `Question[]`, `Progress[]`, `Test[]` |
| `Lesson` | `id, courseId, title, description, videoUrl, thumbnail, duration, order` | `Course`, `Video?`, `Question[]` |
| `Video` | `id, lessonId*, url, title, duration` | `Lesson` (1:1) |
| `Question` | `id, courseId?, lessonId?, text, options(JSON), correctIndex, explanation, order` | `Course?`, `Lesson?`, `UserAnswer[]` |
| `Test` | `id, userId, courseId?, startedAt, finishedAt?, totalQuestions, correctAnswers, wrongAnswers, score, passed, timeSpent` | `User`, `Course?`, `UserAnswer[]` |
| `UserAnswer` | `id, testId, questionId, selectedIndex, isCorrect` | `Test`, `Question` |
| `Progress` | `id, userId, courseId, completedLessons, percent` | `User`, `Course` |

`options` maydoni `Json` tipida saqlanadi va **string[]** ko‘rinishda qaytariladi
(masalan: `["A) ...", "B) ...", "C) ...", "D) ..."]`).

## Indekslar

`Lesson.courseId`, `Question.courseId`, `Question.lessonId`, `Test.userId`,
`Test.courseId`, `UserAnswer.testId`, `UserAnswer.questionId` — tezlik uchun indekslangan.

## Migratsiya va seed

```bash
npm run prisma:migrate   # bazani yaratish
npm run prisma:seed      # admin/user + 2 kurs + darslar + ~24 savol
```
