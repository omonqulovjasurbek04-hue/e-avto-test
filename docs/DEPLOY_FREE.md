# Bepul serverga joylash — Render + Neon Object Storage ($0)

Hammasi **0 dollar**, karta shart emas. `main`ga har push → GitHub CI testlari → o'tsa, Render o'zi yangilaydi. Batafsil ketma-ketlik va qayta ishlatish prompti: [GitHub → Render deploy yo'riqnomasi](GITHUB_RENDER_DEPLOY_UZ.md).

| Qism | Xizmat | Bepul cheklov (2026-10-22 holati) |
|---|---|---|
| Sayt (React) | Render Static Site — `https://eavto-test-uz.onrender.com` | Uxlamaydi |
| API (Express) | Render Free Web Service, Frankfurt | 15 daqiqa so'rov bo'lmasa uxlaydi, uyg'onishi ~1 daqiqa; oyiga 750 soat; disk deployda tozalanadi |
| Baza (PostgreSQL) | **Neon Free**, Frankfurt | 1 GB, oyiga 100 CU-soat, muddatsiz; 5 daqiqa ishlatilmasa uxlaydi |
| Video va fayllar | **Neon Object Storage Free** | Har Neon loyihasiga 5 GB S3-compatible object storage |

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
   └──► Neon Object Storage (video/fayl) — API bergan muddatli imzolangan havola bilan, to'g'ridan-to'g'ri
```

API faqat kichik pleylist (bir necha KB) beradi va har bir 4 soniyalik video bo'lagini Neon Object Storage'ning **muddatli imzolangan
havolasi**ga almashtiradi. Og'ir trafik Neon Object Storage'dan keladi, Render API limitiga tushmaydi. Kurs sotib olmaganga
havola berilmaydi; havola 4 soatda eskiradi (`MEDIA_HLS_TTL_SECONDS`).

## 1. Neon — baza

1. <https://neon.com> → **Sign up** → "Continue with GitHub" (o'zingiz).
2. **Create project**: nomi `eavto`, region **AWS Europe Central 1 (Frankfurt)**, faqat "Postgres database" yoqilgan.
3. Loyiha → **Connect** → **Connection pooling o'chiq** → connection string'ni nusxa oling
   (`postgresql://...@ep-....eu-central-1.aws.neon.tech/neondb?sslmode=require`). Bu — parolli **sir**: faqat Render'ga qo'yasiz.

## 2. Neon Object Storage — video ombori

1. Neon loyihasidagi ishlab turgan (`production`) branch → **Object storage** → **Create bucket**.
2. `eavto-media` nom bering va **Private** tanlang. Ommaviy bucket ishlatmang.
3. **Connect → Storage → .env** orqali S3 endpoint, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` va regionni oling.
   Secret'ni Render maxfiy Environment qiymatiga kiriting, repoga yoki chatga yozmang.
4. Neon Free rejasi har bir loyihaga 5 GB Object Storage beradi. Hozirgi deployda private bucket shu loyihaga bog'langan.

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
   | `STORAGE_DRIVER` | `s3` |
   | `S3_BUCKET` | `eavto-media` |
   | `S3_ENDPOINT` | Neon Connect oynasidagi `AWS_ENDPOINT_URL_S3` |
   | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Neon Storage credential'idan |
   | `S3_REGION` | Neon `.env` dagi `AWS_REGION` |
   | `MEDIA_UPLOAD_ENABLED` | `true` |

   `JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, `MEDIA_SIGNING_SECRET`, `TELEGRAM_WEBHOOK_SECRET` — Render o'zi tasodifiy yaratadi.
4. **Apply** → birinchi build 5–8 daqiqa. Logda `Catalogue ...` va `Administrator ready: +99890***67` chiqishi kerak.
5. "name already taken" bo'lsa: `render.yaml`dagi `eavto-test-uz` prefiksini (hamma joyda, CORS'da ham) almashtiring.

## 4a. Google orqali kirish (ixtiyoriy, bepul)

1. <https://console.cloud.google.com> → yangi loyiha → **APIs & Services → OAuth consent screen**: External, ilova nomi
   "E-Avto Test", support email — o'zingizniki. Scopes: `email`, `profile`, `openid` (qo'shimcha tekshiruv talab qilmaydi).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   **Authorized redirect URIs**: `https://eavto-test-uz-ocux.onrender.com/api/auth/google/callback`.
3. Client ID va Client secret'ni Render → `eavto-test-uz-api` → Environment → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   ga **o'zingiz** kiriting (chatga yozmang) → Save, rebuild, and deploy. Qiymatlar bo'sh bo'lsa, tugma ko'rinmaydi.
4. Consent screen "Testing" holatida faqat siz qo'shgan test foydalanuvchilar kira oladi — hamma uchun **Publish app**.

Lokal sinov: redirect URI `http://localhost:5000/api/auth/google/callback` ni ham qo'shing va `backend/.env` da
`GOOGLE_REDIRECT_URI` ni shu manzilga qo'ying.

## 4. Telegram bot — tokenni yangilang

Eski token avval terminal chiqishida ko'rinib qolgan, shuning uchun uni **bekor qiling**:
@BotFather → `/mybots` → bot → **API Token → Revoke current token** → yangi token faqat Render'ning
`TELEGRAM_BOT_TOKEN` maydoniga. Token faqat **bitta** joyda ishlasin: Render'da bo'lsa, lokal backend'ni to'xtating.

## 5. Darslarga video yuklash

Admin hisobida `/admin/media` sahifasini oching, **Video** turini va tegishli darsni tanlang, MP4/WebM faylni belgilang. Video
brauzerdan to'g'ridan-to'g'ri private Neon Object Storage'ga yuklanadi; Render diskida saqlanmaydi. Yangi darsliklar ham shu yo'l bilan
admin tomondan qo'shiladi. Hozirgi Neon Free Object Storage limiti 5 GB; Neon konsolida ishlatilgan joyni kuzating.

## 6. Tekshirish

- <https://eavto-test-uz.onrender.com> — sayt, kurslar.
- <https://eavto-test-uz.onrender.com/api/health> — `{"status":"ok","database":"reachable"}` (API uxlagan bo'lsa ~1 daqiqa).
- Admin bilan kiring → `/admin`. Keyin Render'dan `BOOTSTRAP_ADMIN_PASSWORD`ni o'chiring, 2FA yoqing.
- Video dars: brauzer Network'ida video so'rovlari Neon Object Storage endpointidan kelishi kerak.

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
- Oyiga bir marta: Neon → Usage (compute, database va Object Storage), Render → Usage (soat, trafik).
- Limit yaqinlashsa: eski videolarning 1080p nusxasini o'chiring yoki pulli tarifga o'ting — bepul xizmat limitdan
  oshganda to'xtashi mumkin.

## 9. Keyinroq — o'z serveringizga ko'chish

Foydalanuvchilar ko'paysa (uxlash va limitlar xalaqit bersa) VPS'ga o'tish uchun hammasi tayyor:
`docs/DEPLOYMENT.md` (Docker + Nginx + CI/CD). Neon bazasi va Object Storage o'sha holicha qoladi.
