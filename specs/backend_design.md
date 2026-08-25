# E-Avto Test backend dizayni

## Chegara

Bu ish faqat `backend/` uchun. API prefiksi `/api`; autentifikatsiya Bearer JWT
orqali amalga oshadi. Har bir javob mavjud loyiha formatida qaytadi:
`{ success, data, pagination? }` yoki `{ success: false, message, errors? }`.

## Resurs modeli

`User` → `TestAttempt` → `UserAnswer` ← `Question` → `Lesson` → `Course`.
`Lesson` bitta `Video`ga ega va `Progress` foydalanuvchi-dars kesimida saqlanadi.
`Test` — admin yaratadigan test shabloni; `TestAttempt` esa foydalanuvchining
bir marta topshirishi.

## Xavfsizlik qarorlari

- Zod barcha write requestlar va query parametrlarini tekshiradi.
- Foydalanuvchi faqat o‘z attempt/progress/profile ma’lumotini ko‘radi.
- Admin endpointlar JWT + `ADMIN` rolini talab qiladi.
- Test davomida `correctAnswer` hech qachon yuborilmaydi.
- Yakunlashda server `startedAt` va test `duration`ini tekshiradi; hisoblash
  Prisma transaction ichida bajariladi.
- Rate limit auth va test submission endpointlariga qo‘llanadi.

## API qoidasi

Collection endpointlar `page`, `limit`, `search`, va resursga tegishli filter
parametrlarini qabul qiladi. Limit 1–100 oralig‘ida. `slug` yoki `id` orqali
o‘qish mumkin, ammo write endpointlar UUID `id` ishlatadi.
