# E-Avto Test — agent yo‘riqnomasi

## Skilllar

Agar repoda `skills/` katalogi bo‘lsa (hozir yo‘q), har qanday ishni boshlashdan oldin
vazifaga mos `SKILL.md` faylini oxirigacha o‘qing. Skillni ko‘rmasdan uning ko‘rsatmalarini
taxmin qilmang; bog‘langan `references/`dan faqat ayni ish uchun keraklisini
o‘qing. Vazifalar xaritasi `skills/PROJECT_SKILLS.md`da.

## Majburiy ish jarayoni

1. Talabga mos skill(lar)ni tanlang.
2. Frontend va backend o‘zgarishi bo‘lsa, `fullstack-guardian`ni o‘qing.
3. Auth, JWT, rol, input, CORS yoki ma’lumot egasi tekshiruvlarida
   `secure-code-guardian`ni ham o‘qing.
4. API kontrakti, TypeScript turlari, servis, sahifa va backend endpointini
   birga yangilang; production API’ni mock ma’lumot bilan aralashtirmang.
5. Koddan keyin tegishli typecheck/build/testni ishga tushiring. Boshqa jarayon
   ayni fayllarni o‘zgartirayotgan bo‘lsa, ularni ustidan yozmang.
6. API, migratsiya yoki environment o‘zgaruvchisini `README.md` va `docs/`da
   hujjatlashtiring.

## Loyiha qoidalari

- `frontend/` — React + TypeScript + Vite + Tailwind.
- `backend/` — Express + TypeScript + Prisma + PostgreSQL.
- Biznes qoidalar controller yoki route ichida emas, service qatlamida bo‘lsin.
- Endpointlar `{ success, data }` / `{ success, message, errors }` formatidan chiqmasin.
- Video faylini Node serverga yuklamang: faqat storage/CDN URL ishlating.
- Maxfiy kalit, token va parolni commit, log yoki API javobiga kiritmang.
- Schema o‘zgarsa Prisma client va migratsiya holatini tekshiring.
