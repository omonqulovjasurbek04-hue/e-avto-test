# Samaradorlik tekshiruvi

**Usul:** alohida bazaga sintetik hajm yuklandi (`backend/scripts/perf-seed.sql`): 20 000 o‘quvchi, 30 000 buyurtma/to‘lov,
20 000 yakunlangan test (+100 000 javob), 100 000 bildirishnoma, 100 000 audit yozuvi, 1 000 savol.
Keyin `backend/scripts/perf-check.mjs` har endpoint’ni 25 marta ketma-ket va 20 ta bir vaqtda chaqirdi (Node/tsx serveri, lokal PostgreSQL 18, Windows, kod `NODE_ENV=test`).
Bu **bitta mashinadagi** o‘lchov: absolyut sonlar hosting/tarmoqqa qarab farq qiladi, lekin nisbatlar va katta og‘ishlarni ko‘rsatadi.
(~15 ms — har so‘rovdagi tayanch xarajat: token tekshiruvi uchun bazaga bitta so‘rov + HTTP.)

## Natija (yakuniy, p50 / p95 ms ketma-ket; 20 parallel p95)
| Endpoint | p50 | p95 | 20 parallel p95 |
|---|---:|---:|---:|
| `GET /courses`, `/lessons`, `/packages` (ochiq) | 15–16 | 17–19 | 11–165 |
| `GET /leaderboard` (ochiq, keshlangan) | 16 | 18 | 8 |
| `GET /public-stats` (keshlangan) | 15 | 17 | 7 |
| `GET /me/notifications`, `/me/enrollments`, `/orders`, `/statistics` | 15–16 | 19–20 | 20–25 |
| `POST /tests/start` | 16 | 27 | 65 |
| `GET /admin/users` (+qidiruv), `/admin/questions` | 16–17 | 20–28 | 18–70 |
| `GET /admin/finance/orders` (50-sahifa), `/summary` | 16–17 | 21–30 | 66–83 |
| `GET /admin/statistics` | 15 | 20 | 55 |
| `GET /admin/audit` (100-sahifa), `?action=` | 16 / 23 | 20 / 33 | 48 / 88 |

## Topilgan va tuzatilgan
| Muammo | Oldin | Keyin | Tuzatish |
|---|---|---|---|
| `GET /admin/audit` (100 000 qator, yangilari birinchi) har sahifada butun jadvalni saralardi | p50 66 ms, p95 168 ms | 16 / 20 ms | `audit_logs(createdAt DESC)` indeksi (migratsiya `audit_created_index`) |
| `GET /leaderboard` (ochiq) har so‘rovda barcha testlar bo‘yicha agregatsiya qilardi | p50 43–47 ms, 20 parallel p95 237–357 ms | 16 ms, 8 ms | 60 soniyalik xotira keshi (`LEADERBOARD_CACHE_SECONDS`), parallel so‘rovlar bitta hisobni bo‘lishadi; `public-stats` ham shu keshdan foydalanadi |

## Eslatmalar
- Kesh har instansiyada alohida (bir nechta server bo‘lsa har biri o‘zinikini saqlaydi) — ochiq reyting uchun yetarli. Testlarda o‘chirilgan (`0`).
- Yuklama testi (ko‘p foydalanuvchi bir vaqtda, uzoq muddat) o‘tkazilmagan; yuqoridagi — faqat so‘rov tezligi va katta jadvallarda indeks tekshiruvi.
- Qayta o‘lchash: scratch bazani yarating, migratsiyalarni qo‘llang, `perf-seed.sql` ni ishga tushiring, serverni ishga tushiring, `PERF_DB=<url> node scripts/perf-check.mjs`
  (skript `jsonwebtoken` bilan dev sirdan token yasaydi: serverni `JWT_SECRET` o‘rnatmasdan, `NODE_ENV=test` da ishga tushiring).
