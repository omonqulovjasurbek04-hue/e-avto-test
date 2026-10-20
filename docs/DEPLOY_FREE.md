# Bepul serverga joylash — Render + Neon

Narxi: **0 so'm**, karta kerak emas. `main`ga har push → GitHub CI testlari → o'tsa, Render saytni o'zi yangilaydi.

| Qism | Qayerda | Bepul cheklov |
|---|---|---|
| Sayt (React) | Render Static Site — `https://eavto-test-uz.onrender.com` | Uxlamaydi |
| API (Express) | Render Web Service (Frankfurt) | 15 daqiqa so'rov bo'lmasa uxlaydi; keyingi ochilish ~1 daqiqa. Oyiga 750 soat |
| Baza (PostgreSQL) | Neon (Frankfurt) | 1 GB, muddatsiz; 5 daqiqa ishlatilmasa o'zi uxlaydi va so'rovda uyg'onadi |

**Bilish kerak bo'lgan cheklovlar:** API uxlab turganda dars eslatmalari (har 5 daqiqalik ish) ham to'xtaydi;
admin yuklagan rasmlar qayta deployda o'chadi (rasmlarni tashqi havola bilan qo'ying); Telegram bot webhook
orqali ishlaydi — uxlab yotgan API'ni bot xabari uyg'otadi, birinchi javob kechikishi mumkin.

## 1. Neon — baza (5 daqiqa)

1. <https://neon.com> → **Sign up** → "Continue with GitHub" (o'zingiz kirasiz).
2. **Create project**: nomi `eavto`, Postgres 16, region **AWS Europe Central (Frankfurt)**.
3. **Connect** → "Connection string" → **pooled emas** (Pooled connection o'chiq) → nusxa oling.
   Ko'rinishi: `postgresql://...@ep-....eu-central-1.aws.neon.tech/neondb?sslmode=require`
   Bu — parol bor sir. Hech kimga yubormang, faqat 2-qadamda Render'ga qo'yasiz.

## 2. Render — sayt va API (10 daqiqa)

1. <https://render.com> → **Get Started** → "GitHub" bilan kiring (o'zingiz).
2. **New → Blueprint** → `e-avto-test` repo → branch `main` → **Blueprint Path: `deploy/render.yaml`**.
3. Render `render.yaml`ni o'qiydi va quyidagilarni so'raydi — o'zingiz kiritasiz:

   | Kalit | Qiymat |
   |---|---|
   | `DATABASE_URL` | Neon'dan olgan connection string |
   | `BOOTSTRAP_ADMIN_PHONE` | Admin telefon raqamingiz, masalan `+998901234567` |
   | `BOOTSTRAP_ADMIN_PASSWORD` | Kuchli parol, kamida 10 belgi (saytga shu bilan kirasiz) |
   | `TELEGRAM_BOT_TOKEN` | @BotFather tokeni (hozircha bo'sh qoldirsa ham bo'ladi) |
   | `TELEGRAM_BOT_USERNAME` | Bot nomi, `@`siz, masalan `zoxid_avto_bot` |

   `JWT_SECRET` va boshqa maxfiy kalitlarni Render o'zi yaratadi.
4. **Apply** → birinchi build 5–8 daqiqa. Kuzatish: Dashboard → `eavto-test-uz-api` → Logs.
   Logda: `Catalogue ...` va `Administrator ready: +99890***67` chiqishi kerak.
5. Agar Render "name already taken" desa: `render.yaml`dagi `eavto-test-uz` nomini (barcha joyda) boshqa
   prefiksga almashtirib push qiling.

## 3. Tekshirish

- <https://eavto-test-uz.onrender.com> — sayt ochiladi, kurslar ko'rinadi.
- <https://eavto-test-uz.onrender.com/api/health> — `{"status":"ok"...}` (API uxlagan bo'lsa ~1 daqiqa).
- Admin telefon/parol bilan kiring → `/admin`. **Keyin** Render → API → Environment'dan
  `BOOTSTRAP_ADMIN_PASSWORD`ni o'chiring (admin allaqachon yaratilgan) va 2FA'ni yoqing.

## 4. Telegram bot

Bot tokeni faqat **bitta** joyda ishlashi kerak. Render'ga token qo'yilgandan keyin kompyuteringizdagi lokal
backend'ni (polling) to'xtating — aks holda Telegram webhook va polling to'qnashadi. API har ishga tushganda
webhook'ni o'zi ro'yxatdan o'tkazadi.

## 5. Kundalik ish

| Vazifa | Qanday |
|---|---|
| Yangilash | `main`ga push → CI (GitHub Actions) yashil → Render o'zi deploy qiladi |
| Holat / log | Render Dashboard → servis → Events / Logs |
| Orqaga qaytarish | Render → servis → Events → oldingi deploy → **Rollback** (oxirgi 2 ta) |
| Baza nusxasi | Neon → Branches / Snapshots (bepulda 1 ta qo'lda snapshot, 6 soatlik tarix) |

## 6. Keyinroq — o'z serveringizga ko'chish

Foydalanuvchilar ko'paysa (uxlash va 1 GB cheklovi xalaqit bersa) Contabo/Oracle VPS'ga o'tish uchun
hamma narsa tayyor: `docs/DEPLOYMENT.md` (Docker + Nginx + Cloudflare + CI/CD).
