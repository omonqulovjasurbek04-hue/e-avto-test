# Telegram orqali kirish

Oqim:

1. Saytda **Telegram orqali kirish** bosiladi → `POST /api/auth/telegram/start` bir martalik sessiya yaratadi va `https://t.me/<bot>?start=<sessionId>` havolasini qaytaradi (sessiya 10 daqiqa amal qiladi).
2. Foydalanuvchi botda **Start** bosadi → bot shu chatga 6 xonali kod yuboradi (kod 5 daqiqa amal qiladi, bitta sessiyaga bitta kod).
3. Foydalanuvchi kodni saytga kiritadi → `POST /api/auth/telegram/verify { sessionId, code }` → odatdagi `{ user, token }`.

Xavfsizlik: kod bazada faqat xesh sifatida saqlanadi, 5 ta noto‘g‘ri urinishdan keyin sessiya yopiladi, kod bir marta ishlatiladi, hisob doim `USER` roli bilan yaratiladi (Telegram orqali admin bo‘lib bo‘lmaydi). Telegram foydalanuvchisi `telegramId` bilan aniqlanadi; bunday hisobda email va parol bo‘lmaydi (parol bilan kirish va parol almashtirish ishlamaydi).

## Sozlash

1. Telegramda **@BotFather** → `/newbot` → bot nomi va username (masalan `eavto_login_bot`) → **token**ni oling.
2. `backend/.env`:
   ```env
   TELEGRAM_BOT_TOKEN="123456:ABC..."
   TELEGRAM_BOT_USERNAME="eavto_login_bot"
   ```
3. Migratsiyani qo‘llang (sxema o‘zgargan: `User.email`/`passwordHash` ixtiyoriy bo‘ldi, `User.telegramId`, `telegram_logins` jadvali):
   ```bash
   npm run prisma:migrate -- --name telegram_login
   ```
4. Backendni ishga tushiring. Standart rejim — **long polling**: ommaviy URL kerak emas, lokal ishlaydi. Faqat bitta backend nusxasi polling qilishi kerak.

Token yoki username berilmasa, Telegram kirishi o‘chiq (`/auth/telegram/start` → 503) va server bot ishga tushirmaydi.

## Production (webhook, ixtiyoriy)

Bir nechta nusxa yoki serverless bo‘lsa webhook ishlating:

```env
TELEGRAM_WEBHOOK_SECRET="uzun-tasodifiy-qator"
```

Keyin webhook’ni bir marta o‘rnating (HTTPS majburiy):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<API_DOMAIN>/api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>"
```

URL’dagi secret noto‘g‘ri bo‘lsa endpoint `404` qaytaradi.

## Cheklovlar

- Telefon raqami so‘ralmaydi: bot faqat Telegram hisobini (id, ism) tasdiqlaydi. Raqam kerak bo‘lsa, botda "kontakt ulashish" tugmasi qo‘shiladi (alohida vazifa).
- Kod faqat Telegram orqali yetkaziladi; bot foydalanuvchi tomonidan bloklangan bo‘lsa, kod kelmaydi.
- Mock rejimda (`VITE_USE_MOCK=true`) tugma ko‘rsatilmaydi.
