# Testlash

| Qatlam | Qayerda | Soni | Buyruq |
|---|---|---:|---|
| Backend unit + integratsiya (haqiqiy PostgreSQL) | `backend/tests` | 190 | `cd backend` → `DATABASE_URL=$U TEST_DATABASE_URL=$U npx vitest run` |
| E2E (haqiqiy brauzer: Microsoft Edge) | `e2e/tests` (desktop 36 + telefon 6) | 42 | `cd e2e` → `npx playwright test` |
| Production smoke (kompilyatsiya qilingan server) | `backend/scripts/prod-smoke.mjs` | 13 | `npm run build` → `SMOKE_DATABASE_URL=<scratch> npm run smoke` |
| Lint (ESLint) | backend, frontend | — | `npm run lint` |
| Samaradorlik (katta hajm) | `backend/scripts/perf-*` | — | `docs/PERFORMANCE.md` |
| Typecheck | backend, frontend | — | `npx tsc --noEmit` |

`$U` — alohida test bazasi, masalan `postgresql://postgres:postgres@localhost:5432/e_avto_test_ci?schema=public`
(avval `npx prisma migrate deploy`). Test bazasi ishlash bazasidan **boshqa** bo‘lishi shart.

## Muhim eslatmalar
- Kompyuterda boshqa loyiha uchun global `DATABASE_URL` bo‘lishi mumkin. Dev rejimida `backend/.env` ustun (`src/config/env.ts`), lekin
  `prisma migrate` / `prisma db seed` / `vitest` buyruqlariga `DATABASE_URL` ni inline berish kerak.
- `TEST_DATABASE_URL` berilmasa DB testlari o‘tkazib yuboriladi (yashil, lekin hech narsa tekshirilmagan!). CI da shu o‘zgaruvchi shart.
- E2E o‘zi backend (5055-port, `NODE_ENV=test`, mock to‘lov) va frontend (5173) ni ishga tushiradi, `e_avto_test_e2e` bazasidan foydalanadi:
  `CREATE DATABASE e_avto_test_e2e;` va `DATABASE_URL=<e2e> npx prisma migrate deploy` bir marta kerak. Har ishga tushirishda yangi ma’lumot yaratadi.
- E2E real Payme/Click ni tekshirmaydi: provayder callback’i imzolangan so‘rov bilan taqlid qilinadi.

## Lokal PostgreSQL (Docker yo‘q bo‘lsa)
`docker compose up -d` (docker-compose.yml) yoki Windows’da npm paketi `embedded-postgres` (faqat sinov uchun, loyiha tashqarisida).

## Qoplanmagan
Frontend komponent testlari, yuklama testi, xavfsizlik skaneri (dependency audit), vizual regressiya, mobil brauzerlar.

## Eslatmalar (tajribadan)
- Salbiy tekshiruv (“X ko‘rinmasin”) yolg‘iz o‘zi yetarli emas: matndagi bo‘sh joy turi (oddiy / NBSP) farq qilsa, test soxta o‘tadi. Har doim ijobiy tekshiruv bilan juftlang (masalan, ekrandagi son = API’dagi son).
- Telefon testi (`--project=mobile`) sahifa gorizontal aylanmasligini tekshiradi; bu orqali menyu tugmasi ekrandan chiqib ketgan xato topilgan.
- Yaroqsiz “video” bilan `<video>` darhol xato holatiga o‘tadi, shuning uchun streaming serverga so‘rov va javob orqali tekshiriladi, element holati orqali emas.
- Qobiqdan `node -e` bilan fayl tahrirlashda teskari chiziqlar (`\`) o‘zgarib ketishi mumkin; murakkab tahrirlar uchun fayl yozish/Edit vositasidan foydalaning.
