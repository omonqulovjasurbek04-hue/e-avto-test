# E-Avto — productionga chiqarish

> **ESLATMA (server yuklash bosqichi):** haqiqiy to‘lov provayderi (Payme / Click) hali ulanmagan — loyiha faqat `mock` bilan ishlaydi.
> Server yuklashga kelganda **avval shuni bajarish kerak** (11-bo‘lim): provayder tanlash, merchant ID/kalitlar va sandbox olish, integratsiya, sandbox testlari.
> Shu bosqichga yetganda loyiha egasi yozadi — real to‘lov integratsiyasi o‘shanda qilinadi.

**Holat:** bu hujjat va `deploy/` fayllari tayyorlangan, lekin real hostingga hech narsa o‘rnatilmagan.
Quyidagilar bu kompyuterda **haqiqatan sinalgan**: `npm run build`, kompilyatsiya qilingan serverning production rejimidagi smoke testi (13/13),
production env tekshiruvlari (10 test), birinchi superadmin skripti (kompilyatsiya qilingan holda), frontend build qo‘riqchisi.
**Sinalmagan** (bu muhitda Docker va `pg_dump` yo‘q): `deploy/Dockerfile.*`, `docker-compose.prod.yml`, nginx shabloni, `backup.sh`/`restore.sh`.
Birinchi deploydan oldin ularni staging’da ishga tushirib ko‘ring.

## 1. Arxitektura
```
Brauzer ──https──> [TLS proksi: Caddy/Traefik/nginx/Cloudflare]
                     ├─ example.uz      → web  (nginx, statik SPA + xavfsizlik headerlari)   127.0.0.1:8080
                     └─ api.example.uz  → api  (Node/Express)                                127.0.0.1:5000
                                             ├─ db     (PostgreSQL, tashqariga ochilmagan)
                                             ├─ redis  (rate limit hisoblagichlari, tashqariga ochilmagan)
                                             ├─ clamav (ixtiyoriy, `--profile antivirus`: yuklangan fayllarni tekshiradi)
                                             └─ fayllar: `media` volume yoki S3/R2 bucket (STORAGE_DRIVER)
```
Frontend va API **alohida originlarda** bo‘lishi mumkin (CORS ro‘yxati `CLIENT_URL`). `sitemap.xml` va `robots.txt` API’dan olinadi; `web` ularni proksilaydi.

## 2. Muhit o‘zgaruvchilari (`backend`)
Production’da quyidagilar **majburiy** (yo‘q yoki xavfsiz bo‘lmasa server ishga tushmaydi):

| O‘zgaruvchi | Talab |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://…` |
| `JWT_SECRET` | ≥ 32 belgi, tasodifiy (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `CLIENT_URL` | sayt originlari, vergul bilan, **faqat https**, `localhost`/wildcard yo‘q |
| `PAYMENT_PROVIDER` | bo‘sh qoldiring (`mock` production’da taqiqlangan) |
| `MEDIA_SIGNING_SECRET` | ≥ 32 belgi — faqat `MEDIA_UPLOAD_ENABLED=true` bo‘lsa |
| `PUBLIC_API_ORIGIN` | API’ning https origini, **`/api` siz** (`https://api.example.uz`) — CMS rasm havolalari uchun |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | faqat `STORAGE_DRIVER=s3` bo‘lsa |
| `METRICS_TOKEN` | ≥ 24 belgi — faqat o‘rnatilgan bo‘lsa |

Ixtiyoriy: `PORT` (5000), `ACCESS_TOKEN_TTL` (15m), `REFRESH_TOKEN_TTL_DAYS` (30), `REFRESH_COOKIE_SAMESITE` (strict; API boshqa saytda bo‘lsa `none`), `TOTP_ENCRYPTION_KEY` (tavsiya: tasodifiy 32+ belgi), `ENFORCE_ENROLLMENT` (production’da `true` tavsiya), `ORDER_TTL_MINUTES` (60),
`SMTP_*`, `MAIL_FROM`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `MEDIA_*`, `MAX_VIDEO_MB`, `MAX_FILE_MB`, `MAX_IMAGE_MB` (5),
`REDIS_URL` (compose o‘zi beradi; bo‘sh = har jarayon o‘z xotirasida hisoblaydi), `STORAGE_DRIVER` (`local`/`s3`), `S3_REGION`, `S3_ENDPOINT` (R2: `https://<account>.r2.cloudflarestorage.com`), `S3_FORCE_PATH_STYLE` (MinIO uchun `true`),
`CLAMAV_HOST`/`CLAMAV_PORT`/`CLAMAV_TIMEOUT_MS`, `SENTRY_DSN`/`SENTRY_ENVIRONMENT`/`SENTRY_TRACES_SAMPLE_RATE`, `METRICS_TOKEN`.
To‘liq ro‘yxat: `backend/.env.example` (test `config.test.ts` uni koddan farq qilsa yiqiladi).

**Frontend** (build vaqtida): `VITE_API_URL=https://api.example.uz/api`. Build bu qiymat https bo‘lmasa yoki `VITE_USE_MOCK=true` bo‘lsa **to‘xtaydi**.

## 3. Birinchi ishga tushirish (Docker)
```bash
cp deploy/.env.production.example deploy/.env.production      # barcha qiymatlarni almashtiring; faylni commit qilmang
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production up -d --build
```
Tartib: `db` (sog‘lom bo‘lguncha) → `migrate` (bir martalik `prisma migrate deploy`) → `api` → `web`.

Birinchi administrator (seed production’da bloklangan):
```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production run --rm \
  -e BOOTSTRAP_EMAIL=owner@example.uz -e BOOTSTRAP_PASSWORD='<12+ belgi, katta/kichik harf, raqam>' \
  api node dist/scripts/createSuperadmin.js
```
Skript faqat superadmin **yo‘q** bo‘lganda ishlaydi (keyin rad etadi), natijani auditga yozadi. Kirgach parolni profil sahifasidan almashtiring.
Keyingi adminlar superadmin tomonidan admin paneldan (auditli) beriladi.

## 4. Qo‘lda (Docker’siz)
```bash
cd backend && npm ci && npx prisma generate && npm run build
DATABASE_URL=… npx prisma migrate deploy
NODE_ENV=production node dist/server.js        # process manager (systemd/pm2) ostida
cd ../frontend && VITE_API_URL=https://api.example.uz/api npm ci && npm run build   # dist/ ni statik hostingga
```
`dist/` papkasini nginx/Caddy/CDN beradi; SPA uchun noma’lum yo‘llar `index.html` ga qaytishi kerak (`deploy/nginx.conf.template` ga qarang).

## 5. Domen va HTTPS
Konteynerlar faqat `127.0.0.1` da tinglaydi; TLS’ni oldingi qatlam tugatadi. Caddy namunasi (sertifikat avtomatik):
```
example.uz     { reverse_proxy 127.0.0.1:8080 }
api.example.uz { reverse_proxy 127.0.0.1:5000 }
```
Production’da Express `trust proxy` yoqilgan (rate limit haqiqiy IP’ni ko‘radi) — API’ni **faqat** ishonchli proksi orqali ochiq qoldiring.
DNS: `example.uz` va `api.example.uz` A yozuvlari. Cloudflare ishlatilsa, "Full (strict)" rejimi.

## 6. Migratsiyalar
- Faqat `prisma migrate deploy` (ilgari yozilgan migratsiyalarni qo‘llaydi). `migrate dev` / `migrate reset` / `db push` production’da **hech qachon**.
- Har migratsiyani deploydan oldin o‘qing: `DROP`, `ALTER … TYPE`, `NOT NULL` qo‘shish ma’lumot yo‘qotishi yoki bloklashi mumkin.
- Migratsiya **ilovadan oldin** qo‘llanadi, shuning uchun u joriy (eski) kod bilan ham ishlashi kerak: avval ustun qo‘shing (nullable/default), kod chiqqach eskisini olib tashlang (expand → contract).

## 7. Backup va tiklash
```bash
DATABASE_URL=postgresql://… deploy/backup.sh /srv/backups          # eavto-YYYYmmdd-HHMMSS.dump, oxirgi 14 tasi saqlanadi
DATABASE_URL=<scratch> CONFIRM_RESTORE=yes deploy/restore.sh /srv/backups/eavto-….dump
```
- Kunlik cron + **har deploydan oldin** qo‘lda backup. Nusxani boshqa serverga/obyekt omboriga ko‘chiring (bir mashinadagi backup — backup emas).
- **Tiklashni oldindan sinang:** scratch bazaga tiklab, `npm run smoke` va admin panelni tekshiring. Sinalmagan backup — ishonchsiz backup.
- Private media yoqilgan bo‘lsa, `media` volume’ni ham zaxiralang (bazada faqat kalitlar bor).

## 8. Tekshiruv (deploydan keyin)
```bash
cd backend && SMOKE_DATABASE_URL=<bo‘sh scratch baza, migratsiyalar qo‘llangan> npm run smoke   # kompilyatsiya qilingan serverni production rejimida tekshiradi
curl -fsS https://api.example.uz/api/health        # readiness: bazaga ulanish
curl -fsS https://api.example.uz/api/health/live   # liveness: jarayon tirik
curl -sI https://example.uz | grep -iE "content-security|strict-transport"
```

## 9. Monitoring va loglar
- Health: `/api/health/live` (jarayon), `/api/health` (baza). Uptime monitor (UptimeRobot/Better Stack) ikkalasiga ham.
- Loglar `stdout`ga (morgan `combined`, token/sirlar yashiriladi). Konteyner log drayveri yoki `journald` → markaziy joyga yig‘ing; saqlash muddatini belgilang.
- Ogohlantirishlar tavsiyasi: `5xx` ulushi, `/api/health` yiqilishi, disk (`pgdata`, `media`), backup yoshi > 26 soat, `payment.rejected` audit yozuvlari, to‘lov webhook xatolari.
- **Xato kuzatuvchisi:** `SENTRY_DSN` (Sentry yoki o‘z serveringizdagi GlitchTip). Faqat 500 xatolar, ishlov berilmagan rejection/exception yuboriladi; cookie, header, body, query va IP yuborilmaydi (faqat foydalanuvchi id). Haqiqiy Sentry loyihasi bilan **sinalmagan** — ulagach bitta sinov xatosini tekshiring.
- **Metrikalar:** `METRICS_TOKEN` o‘rnatilsa `GET /api/metrics` (Prometheus formati, `Authorization: Bearer <token>`): so‘rovlar soni va kechikish (route shabloni bo‘yicha, id’siz), 5xx soni, xotira, `app_database_up`, `app_redis_up`. Token bo‘lmasa endpoint 404. Prometheus/Grafana Agent misoli:
  ```yaml
  scrape_configs:
    - job_name: eavto-api
      scheme: https
      metrics_path: /api/metrics
      authorization: { credentials: "<METRICS_TOKEN>" }
      static_configs: [{ targets: ["api.example.uz"] }]
  ```
- **Bir nechta API nusxasi:** rate limit hisoblagichlari Redis’da (`REDIS_URL`), shuning uchun cheklovlar barcha nusxalar uchun umumiy. Redis ishlamay qolsa so‘rovlar cheklovsiz o‘tkaziladi (sayt to‘xtamaydi), tizim sahifasi `rateLimit: error` ko‘rsatadi.
- **Antivirus:** `--profile antivirus` + `CLAMAV_HOST=clamav`. Har bir yuklangan fayl (video, material, CMS rasm) saqlanishdan oldin skanerlanadi; virus topilsa 422 va `media.rejected_malware` audit yozuvi, skaner javob bermasa 503 (fayl saqlanmaydi). Haqiqiy clamd bilan **sinalmagan** (testlarda protokolni taqlid qiluvchi server).
- **S3/R2:** bucket **yopiq** bo‘lsin (public access yo‘q). Fayllar baribir API orqali, ruxsat tekshirilgandan keyin beriladi. Haqiqiy bucket bilan **sinalmagan** (testlarda S3 protokolini taqlid qiluvchi server).

## 10. Rollback rejasi
1. Deploydan oldin: backup + joriy image teglarini yozib qo‘ying (`git rev-parse HEAD`).
2. Faqat kod muammosi (migratsiya yo‘q yoki orqaga mos): oldingi teg bilan qayta ishga tushiring — `git checkout <eski>` → `docker compose … up -d --build api web`.
3. Migratsiya orqaga mos emas yoki ma’lumot buzilgan: `api`ni to‘xtating → backup’dan tiklang (7-bo‘lim) → eski kodni ishga tushiring. Prisma migratsiyalari faqat oldinga yuradi; "down" yo‘q.
4. Rollbackdan keyin tekshiruv (8-bo‘lim) va sabab tahlili.

## 11. Real to‘lovni yoqishdan oldin (hozir yoqilmagan)
- Provayderning rasmiy merchant hujjatini o‘qing (imzo sxemasi, callback formati, takrorlash/timestamp qoidalari, test muhiti) — hozirgi `mock` imzo sxemasi faqat namuna.
- `PaymentProvider` interfeysini real provayder uchun amalga oshiring; imzoni constant-time tekshirish, summa/valyuta mosligi, idempotentlik (`PaymentEvent`) saqlansin.
- Sandbox’da to‘liq sinang (muvaffaqiyat, bekor, takroriy callback, noto‘g‘ri imzo, summa o‘zgartirilgan). Test kalitlari va jonli kalitlar alohida.
- Faqat shundan keyin `PAYMENT_PROVIDER` ni sozlang. Refund jarayoni hozircha qo‘lda (kodda yo‘q).

## 12. Chiqishdan oldingi ro‘yxat
- [ ] `deploy/.env.production` to‘ldirilgan, repoda emas; sirlar yangi tasodifiy qiymatlar
- [ ] DNS + HTTPS ishlaydi; `CLIENT_URL` aniq originlar
- [ ] Migratsiyalar qo‘llangan; birinchi superadmin yaratilgan; `BOOTSTRAP_*` muhitdan o‘chirilgan
- [ ] `npm run smoke` o‘tgan; `/api/health` 200; CSP/HSTS headerlari ko‘rinadi
- [ ] Backup avtomatlashtirilgan **va tiklash sinalgan**
- [ ] Monitoring/ogohlantirishlar sozlangan
- [ ] Maxfiylik va foydalanish shartlari (CMS’da `privacy`, `terms`) huquqshunos ko‘rigidan o‘tgan
- [ ] Haqiqiy narxlar kiritilgan (`namuna` belgisi yo‘q), kurs/savol kontenti tekshirilgan
- [ ] Biznes qarorlari (`IMPLEMENTATION_PLAN.md`): davomat formulasi, refund siyosati, test qoidalari
