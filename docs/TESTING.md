# Testlash

| Qatlam | Qayerda | Soni | Buyruq |
|---|---|---:|---|
| Backend unit + integratsiya (haqiqiy PostgreSQL) | `backend/tests` | 259 | `cd backend` → `DATABASE_URL=$U TEST_DATABASE_URL=$U npx vitest run` |
| E2E (haqiqiy brauzer: Microsoft Edge) | `e2e/tests` (desktop 56 + telefon 7) | 63 | `cd e2e` → `npx playwright test` |
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
- Auth: `backend/tests/auth-hardening.test.ts` (refresh rotatsiyasi, qayta ishlatishni aniqlash, cookie atributlari, email tasdiqlash, TOTP RFC 6238 vektorlari) va `e2e/tests/auth-security.spec.ts`. Email testlarida SMTP transporti almashtiriladi — real SMTP sinalmagan.
- Ikki E2E ishga tushirish bir vaqtda bo‘lmasin: portlar (5055/5173) va `e2e/test-results` umumiy.

## Infratuzilma testlari (haqiqiy servissiz)
- `infra.test.ts`: Redis rate-limit store (soxta hisoblagich, ikki ilova nusxasi bitta limitni bo‘lishadi; store xatosida so‘rov o‘tadi), ClamAV INSTREAM protokoli (soxta clamd: toza / virus / javobsiz → fail-closed), metrikalar (route shabloni, id yo‘q).
- `s3-storage.test.ts`: S3 drayveri xotiradagi soxta S3 serverga qarshi (SigV4 imzo, Range, o‘chirish, kalit himoyasi).
- `platform-extras.test.ts` (DB): CMS rasmlari + antivirus, kategoriyalar, `/api/metrics`, tizim holati.
- E2E `platform-extras.spec.ts`: kategoriya → filtr, rasm → yangilik muqovasi, brauzerda yozilgan **haqiqiy WebM** video + watermark. `dark-mode.spec.ts`: 25 sahifada matn kontrasti ≥ 3:1.
- Haqiqiy Redis, clamd, S3/R2 bucket, Sentry bilan sinalmagan.

## Lokal PostgreSQL (Docker yo‘q bo‘lsa)
**Baza kodlashi UTF8 bo‘lishi shart.** Windows’dagi o‘rnatuvchi klasterni `WIN1252` bilan yaratishi mumkin — u holda kirill/rus matnini saqlab
bo‘lmaydi (`22P05 ... has no equivalent in encoding "WIN1252"`) va ko‘p tilli CMS/shablon testlari 500 bilan yiqiladi. Tekshirish:
`SELECT datname, pg_encoding_to_char(encoding) FROM pg_database;`. Test bazalarini (`e_avto_test_ci`, `e_avto_test_e2e`) shu nomlar bilan UTF8 qilib yarating:
`CREATE DATABASE e_avto_test_ci ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0;` (keyin `prisma migrate deploy`). Bu kompyuterda ikkalasi 2026-10-16 da shunday qayta yaratilgan. Production bazasi ham UTF8 bo‘lsin (`docker-compose.yml` dagi rasmiy postgres — UTF8).
`docker compose up -d` (docker-compose.yml) yoki Windows’da npm paketi `embedded-postgres` (faqat sinov uchun, loyiha tashqarisida).

## Qoplanmagan
Frontend komponent testlari, yuklama testi, xavfsizlik skaneri (dependency audit), vizual regressiya, mobil brauzerlar.

## Eslatmalar (tajribadan)
- Salbiy tekshiruv (“X ko‘rinmasin”) yolg‘iz o‘zi yetarli emas: matndagi bo‘sh joy turi (oddiy / NBSP) farq qilsa, test soxta o‘tadi. Har doim ijobiy tekshiruv bilan juftlang (masalan, ekrandagi son = API’dagi son).
- Telefon testi (`--project=mobile`) sahifa gorizontal aylanmasligini tekshiradi; bu orqali menyu tugmasi ekrandan chiqib ketgan xato topilgan.
- Yaroqsiz “video” bilan `<video>` darhol xato holatiga o‘tadi, shuning uchun streaming serverga so‘rov va javob orqali tekshiriladi, element holati orqali emas.
- Qobiqdan `node -e` bilan fayl tahrirlashda teskari chiziqlar (`\`) o‘zgarib ketishi mumkin; murakkab tahrirlar uchun fayl yozish/Edit vositasidan foydalaning.
