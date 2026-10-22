# Bepul serverga joylash — Render + Neon + Cloudflare R2 ($0)

Hammasi **0 dollar**, karta shart emas. `main`ga har push → GitHub CI testlari → o'tsa, Render o'zi yangilaydi.

| Qism | Xizmat | Bepul cheklov (2026-10-22 holati) |
|---|---|---|
| Sayt (React) | Render Static Site — `https://eavto-test-uz.onrender.com` | Uxlamaydi |
| API (Express) | Render Free Web Service, Frankfurt | 15 daqiqa so'rov bo'lmasa uxlaydi, uyg'onishi ~1 daqiqa; oyiga 750 soat; disk deployda tozalanadi |
| Baza (PostgreSQL) | **Neon Free**, Frankfurt | 1 GB, oyiga 100 CU-soat, muddatsiz; 5 daqiqa ishlatilmasa uxlaydi |
| Video va fayllar | **Cloudflare R2 Free** | 10 GB saqlash, oyiga 1 mln yozish / 10 mln o'qish; chiqish trafigi bepul |

> **Kafolat yo'q.** Bepul tariflar limitlar ichida $0 turadi, lekin uzluksiz ishlash yoki SLA bermaydi; Render bepul
> web servisni ishlab turgan biznes uchun tavsiya qilmaydi. O'quvchilar doim kirishi kerak bo'lsa — pulli tarifga
> o'tish rejasi: Render Starter yoki o'z VPS (`docs/DEPLOYMENT.md`). Limitlarni oyiga bir marta tekshiring (8-bo'lim).
>
> **Render Postgres ishlatmang** — uning bepul bazasi 30 kunda o'chadi. Baza faqat Neon'da.

## Arxitektura: video Render orqali o'tmaydi

```
Brauzer ──► eavto-test-uz.onrender.com (statik sayt)
   │  /api/* ──► eavto-test-uz-api.onrender.com (API: kirish huquqini tekshiradi)
   │                 └─► Neon (baza)
   └──► R2 (video bo'laklari, poster, fayllar) — API bergan muddatli imzolangan havola bilan, to'g'ridan-to'g'ri
```

API faqat kichik pleylist (bir necha KB) beradi va har bir 4 soniyalik video bo'lagini R2'ning **muddatli imzolangan
havolasi**ga almashtiradi. Og'ir trafik R2'dan keladi (bepul), Render limitiga tushmaydi. Kurs sotib olmaganga
havola berilmaydi; havola 4 soatda eskiradi (`MEDIA_HLS_TTL_SECONDS`).

## 1. Neon — baza

1. <https://neon.com> → **Sign up** → "Continue with GitHub" (o'zingiz).
2. **Create project**: nomi `eavto`, region **AWS Europe Central 1 (Frankfurt)**, faqat "Postgres database" yoqilgan.
3. Loyiha → **Connect** → **Connection pooling o'chiq** → connection string'ni nusxa oling
   (`postgresql://...@ep-....eu-central-1.aws.neon.tech/neondb?sslmode=require`). Bu — parolli **sir**: faqat Render'ga qo'yasiz.

## 2. Cloudflare R2 — video ombori

1. <https://dash.cloudflare.com> → **R2 Object Storage** → (birinchi marta) bepul R2'ni yoqing.
2. **Create bucket**: nomi `eavto-media`, Location: **Automatic** (yoki EU). **Public access o'chiq qoladi** — bucket private.
3. Bucket → **Settings → CORS policy** → quyidagini qo'ying (pleyer bo'laklarni brauzerdan oladi):
   ```json
   [
     {
       "AllowedOrigins": ["https://eavto-test-uz.onrender.com"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["Range"],
       "ExposeHeaders": ["Content-Length", "Content-Range"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```
   (Lokal sinov uchun `http://localhost:5173`ni ham qo'shish mumkin.)
4. R2 → **Manage API tokens → Create API token**: ruxsat **Object Read & Write**, faqat `eavto-media` bucket'iga.
   Sizga **Access Key ID** va **Secret Access Key** beriladi (bir marta ko'rsatiladi) — bular **sir**.
5. R2 bosh sahifasidagi **Account ID** dan endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

## 3. Render — sayt va API

1. <https://render.com> → "GitHub" bilan kiring (o'zingiz).
2. **New → Blueprint** → `e-avto-test` repo → branch `main` → **Blueprint Path: `deploy/render.yaml`**.
3. Render so'raydigan qiymatlarni **o'zingiz** kiritasiz:

   | Kalit | Qiymat |
   |---|---|
   | `DATABASE_URL` | Neon connection string (1-bo'lim) |
   | `BOOTSTRAP_ADMIN_PHONE` | Admin telefoni, `+998901234567` ko'rinishida |
   | `BOOTSTRAP_ADMIN_PASSWORD` | Kuchli parol, 10+ belgi |
   | `TELEGRAM_BOT_TOKEN` | @BotFather'dan **yangi** token (4-bo'lim) yoki bo'sh |
   | `TELEGRAM_BOT_USERNAME` | Bot nomi, `@`siz |
   | `STORAGE_DRIVER` | `s3` (R2 tayyor bo'lsa) yoki bo'sh |
   | `S3_BUCKET` | `eavto-media` |
   | `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | R2 API token'idan |
   | `MEDIA_UPLOAD_ENABLED` | `true` (R2 bilan) yoki `false` |

   `JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, `MEDIA_SIGNING_SECRET`, `TELEGRAM_WEBHOOK_SECRET` — Render o'zi tasodifiy yaratadi.
4. **Apply** → birinchi build 5–8 daqiqa. Logda `Catalogue ...` va `Administrator ready: +99890***67` chiqishi kerak.
5. "name already taken" bo'lsa: `render.yaml`dagi `eavto-test-uz` prefiksini (hamma joyda, CORS'da ham) almashtiring.

## 4. Telegram bot — tokenni yangilang

Eski token avval terminal chiqishida ko'rinib qolgan, shuning uchun uni **bekor qiling**:
@BotFather → `/mybots` → bot → **API Token → Revoke current token** → yangi token faqat Render'ning
`TELEGRAM_BOT_TOKEN` maydoniga. Token faqat **bitta** joyda ishlasin: Render'da bo'lsa, lokal backend'ni to'xtating.

## 5. Darslarga video qo'shish (HLS, YouTube kabi)

Render bepul serverida ffmpeg yo'q, shuning uchun videoni **o'z kompyuteringizda** o'giring — natija to'g'ridan-to'g'ri
R2'ga va Neon bazasiga yoziladi. `backend/` papkasida bir martalik o'zgaruvchilar bilan (sirlarni faylga yozmang):

```bash
DATABASE_URL="<Neon string>" STORAGE_DRIVER=s3 S3_BUCKET=eavto-media S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com" S3_ACCESS_KEY_ID="..." S3_SECRET_ACCESS_KEY="..." S3_FORCE_PATH_STYLE=true npm run media:import -- --lesson <darsId> --file ../darslik/1-dars.mp4 --title "1-dars"
```

Video H.264 1080p/720p/480p/360p + poster bo'lib saqlanadi. **Hajm:** 1 daqiqa video barcha sifatlari bilan ~70–80 MB;
10 GB bepul limitga taxminan **2 soat** dars videosi sig'adi. Ko'proq kerak bo'lsa, `backend/src/lib/media/hls.ts` dagi `LADDER`dan 1080p'ni olib tashlash
yoki R2 pulli hajmiga o'tish (GB uchun ~$0.015/oy) kerak.

## 6. Tekshirish

- <https://eavto-test-uz.onrender.com> — sayt, kurslar.
- <https://eavto-test-uz.onrender.com/api/health> — `{"status":"ok","database":"reachable"}` (API uxlagan bo'lsa ~1 daqiqa).
- Admin bilan kiring → `/admin`. Keyin Render'dan `BOOTSTRAP_ADMIN_PASSWORD`ni o'chiring, 2FA yoqing.
- Video dars: brauzer Network'ida bo'laklar `r2.cloudflarestorage.com`dan kelishi kerak.

## 7. Kundalik ish

| Vazifa | Qanday |
|---|---|
| Yangilash | `main`ga push → CI yashil → Render o'zi deploy qiladi (`autoDeployTrigger: checksPass`) |
| Holat / log | Render → servis → Events / Logs |
| Orqaga qaytarish | Render → servis → Events → oldingi deploy → **Rollback** |
| Baza nusxasi | Neon → Branches (bepulda 6 soatlik tarix) + oyiga bir `pg_dump` kompyuteringizga |

## 8. $0 da qolish uchun qoidalar

- **API'ni uyg'oq ushlab turmang** (har 10 daqiqada "ping" qiluvchi xizmatlar qo'ymang): API uyg'oq tursa, uning har
  5 daqiqalik fon ishlari Neon'ni ham uyg'oq ushlaydi va 100 CU-soat oy oxirigacha tugab, baza to'xtaydi.
- Oyiga bir marta: Neon → Usage (CU-soat, GB), Cloudflare → R2 → Metrics (GB, amallar), Render → Usage (soat, trafik).
- Limit yaqinlashsa: eski videolarning 1080p nusxasini o'chiring yoki pulli tarifga o'ting — bepul xizmat limitdan
  oshganda to'xtashi mumkin.

## 9. Keyinroq — o'z serveringizga ko'chish

Foydalanuvchilar ko'paysa (uxlash va limitlar xalaqit bersa) VPS'ga o'tish uchun hammasi tayyor:
`docs/DEPLOYMENT.md` (Docker + Nginx + Cloudflare + CI/CD). Neon bazasi va R2 ombori o'sha holicha qoladi.
