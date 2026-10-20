# Railway'ga joylash

**Narx:** 30 kun bepul (bir martalik $5 kredit), keyin Hobby **$5/oy**. Free plan ($1/oy) bu loyihaga yetmaydi:
API + PostgreSQL taxminan $3.5–4.5/oy ishlatadi.

**Tuzilma — bitta loyiha, ikkita servis:**

```
Railway loyiha "e-avto-test"
├─ Postgres            (Railway shabloni; DATABASE_URL avtomatik)
└─ e-avto-test (app)   (deploy/Dockerfile.railway: sayt + API bitta servisda, bitta domen)
     https://<nom>.up.railway.app        → sayt
     https://<nom>.up.railway.app/api/*  → API
```

`main`ga push → Railway avtomatik yangilaydi (servis sozlamasida **Wait for CI** yoqilsa — faqat GitHub CI
o'tgandan keyin). Har deployda: build → `prisma migrate deploy` + `prisma/bootstrap.ts` (kurslar, birinchi admin)
→ healthcheck `/api/health/live` → yangi versiya. Xato bo'lsa eski versiya ishlashda qoladi.

## 1. Akkaunt

<https://railway.com> → **Login** → **GitHub** bilan (o'zingiz). GitHub orqali kirish "Full Trial"ni beradi;
tasdiqlanmasa "Limited Trial" — tashqi tarmoq cheklanadi (Telegram bot ishlamasligi mumkin).

## 2. Loyiha va servislar

1. **New Project → Deploy from GitHub repo → `e-avto-test`** (GitHub ruxsatini o'zingiz berasiz).
   Railway `railway.json`ni o'qiydi va Dockerfile bilan build qiladi.
2. Loyiha ichida **+ Create → Database → PostgreSQL**.
3. App servisi → **Settings**:
   - **Networking → Generate Domain** (port so'rasa: `8080`).
   - **Source → Branch**: `main`; **Wait for CI**: yoqing.
   - **Region**: Europe (eng yaqin).

## 3. O'zgaruvchilar (App servisi → Variables → Raw Editor)

Quyidagilarni nusxalab qo'ying — bular sir emas, Railway havolalari:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=8080
CLIENT_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
PUBLIC_API_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}
VITE_API_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api
REFRESH_COOKIE_SAMESITE=strict
ENFORCE_ENROLLMENT=true
MEDIA_UPLOAD_ENABLED=false
```

Va **sirlarni o'zingiz** qo'shasiz:

| Kalit | Qiymat |
|---|---|
| `JWT_SECRET` | Kompyuteringizda: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` natijasi |
| `BOOTSTRAP_ADMIN_PHONE` | `+998901234567` ko'rinishida |
| `BOOTSTRAP_ADMIN_PASSWORD` | Yangi parol, 10+ belgi |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | Ixtiyoriy. Qo'yilsa — lokal backend'ni to'xtating (bitta token faqat bitta joyda) |

**Deploy** tugmasi → 5–8 daqiqa.

## 4. Tekshirish

- `https://<domen>/` — sayt, kurslar ro'yxati
- `https://<domen>/api/health` — `"status":"ok"`, `"database":"reachable"`
- Admin telefon/parol bilan kirish → `/admin`. Keyin `BOOTSTRAP_ADMIN_PASSWORD`ni o'chiring, 2FA yoqing.

## 5. Kundalik

| Vazifa | Qanday |
|---|---|
| Yangilash | `main`ga push |
| Loglar | Servis → Deployments → View logs |
| Orqaga qaytarish | Deployments → oldingi deploy → **Rollback** (Trial/Free: 24 soat ichida) |
| Baza nusxasi | Postgres → Backups (Hobby'da) yoki `deploy/backup.sh` |
| Xarajat | Workspace → Usage |
