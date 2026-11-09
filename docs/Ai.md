# AI topshirig‘i: loyihaning hujjatlarini aniqlashtirish va yangilash

Ushbu topshiriq E-Avto Test loyihasidagi hujjatlarni kod va deploy konfiguratsiyasiga mos, bir-biriga zid bo‘lmagan va amalda foydalanishga qulay holatga keltirish uchun yozilgan.

## Maqsad

`docs/` ichidagi amaldagi hujjatlarni tekshirib, quyidagi muammolarni ehtiyotkorlik bilan bartaraf et:

1. Production platformasi va production URL’lari haqidagi ziddiyatlarni aniqlashtirish.
2. Deploy hujjatlaridagi Render domenlarini `deploy/render.yaml` bilan solishtirib, eskirgan yoki misol tariqasidagi URL’larni tuzatish.
3. Node.js versiyasi, testlar soni, loyiha tuzilmasi va lokal ishga tushirish qadamlarini amaldagi manifest va kodga moslash.
4. Rollar bo‘yicha hujjatlarda joriy sahifa yo‘llarini eskirgan `/admin` yo‘llaridan ajratish.
5. Hujjatlar orasida aniq navigatsiya va yagona fakt manbalarini belgilash.

## Ishlash tartibi

### 1. Avval manbalarni tekshir

Hujjat matnini o‘zgartirishdan oldin tegishli faktlarni quyidagi tartibda tekshir:

- **Node.js talabi:** `backend/package.json`, Dockerfile’lar, CI workflow’lari va deploy konfiguratsiyasi.
- **Testlar va loyiha tarkibi:** test papkalari hamda test fayllarini sanash; eskirgan sonni taxmin bilan almashtirma.
- **Lokal ishga tushirish:** `docker-compose.yml`, `backend/.env.example`, `frontend/.env.example`, Prisma schema/migratsiyalari va package script’lari.
- **API yo‘llari:** `backend/src/app.ts`, `backend/src/routes/` va tegishli validator/controller/service kodlari.
- **Frontend sahifalari va rollar:** route konfiguratsiyasi, navigation/menu va permission kodlari. Faqat matndagi eski ro‘yxatga qarab URL’larni xulosa qilma.
- **Render sozlamalari:** `deploy/render.yaml` dagi service nomlari, rewrite manzillari, `VITE_API_URL`, `CLIENT_URL`, `PUBLIC_API_ORIGIN` va health-check.
- **Railway/VPS sozlamalari:** tegishli Dockerfile, compose, deployment script va GitHub workflow’lari.

Kod yoki konfiguratsiya bilan hujjat bir-biriga mos kelmasa, odatda kod/konfiguratsiya amaldagi loyiha holatini ko‘rsatadi. Lekin bu qoida hosting panelidagi joriy production holatini o‘zi isbotlamaydi.

### 2. Production holatini taxmin qilma

Hujjatlarda Railway, Render va VPS bo‘yicha turli ma’lumotlar uchrashi mumkin. Quyidagilarni alohida tushun:

- qaysi deploy usuli **amaldagi production**;
- qaysilari **muqobil deploy yo‘riqnomalari** yoki namunalar;
- qaysi domenlar real ishlatiladi va qaysilari faqat `render.yaml` dagi konfiguratsiya qiymatlari.

Production platformasini faqat tekshiriladigan ishonchli manba tasdiqlasa amaldagi deb yoz: foydalanuvchining aniq ko‘rsatmasi, joriy hosting/deploy holati yoki ishonchli, sanasi ko‘rsatilgan deployment qaydi. Repo ichidagi eski sana, README/doc matni yoki Blueprint konfiguratsiyasining o‘zi hozirgi production holatini tasdiqlamaydi.

Tasdiqni topa olmasang:

- production platformasi yoki URL’ni **aniqlanmagan/tekshirish kerak** deb ochiq qayd et;
- Railway, Render va VPS hujjatlarini muqobil usullar sifatida neytral taqdim et;
- eskirgan bo‘lishi mumkin bo‘lgan domenni ishlab turgan manzil sifatida ko‘rsatma;
- kerak bo‘lsa egasidan bitta aniq savol so‘ra, ammo hujjatlarning qolgan mustaqil va xavfsiz tuzatishlarini davom ettir.

### 3. Render URL va konfiguratsiyasini uyg‘unlashtir

- `deploy/render.yaml` dagi URL’larni **repo konfiguratsiyasida ko‘rsatilgan URL’lar** deb qaragin; deploy holati tekshirilmagan bo‘lsa, ularni “live/production” deb atama.
- `docs/DEPLOY_FREE.md`, `docs/GITHUB_RENDER_DEPLOY_UZ.md`, `docs/API.md` va `deploy/render.yaml` dagi host nomlarini solishtir.
- URL’ni boshqa joylarda qo‘lda ko‘paytirish o‘rniga imkon qadar yagona manbaga ishora qil.
- `VITE_API_URL`, Google OAuth redirect URI, CORS/origin va rewrite marshrutlarining bir-biriga mosligini tekshir.
- Domenni tuzatish jarayonida tasodifiy yangi domen o‘ylab topma. Faolligi tasdiqlanmagan bo‘lsa, uni shablon/konfiguratsiya qiymati deb belgilagin.

### 4. Texnik ma’lumotlarni yangila

- `docs/doc/E-AVTO-TEST.md` dagi Node talabi va texnologiya versiyalarini package manifest va Dockerfile’lar bilan tekshir.
- Test fayllari soni tez o‘zgarishi mumkin. Aniq son zarur bo‘lmasa, uni saqlama; zarur bo‘lsa manbasi va tekshirilgan sanasini yoz.
- Papkalar, migrationlar, model/enumlar va xususiyatlar sonini ham xuddi shunday tekshir; tasdiqlanmagan sonlarni fakt sifatida qoldirma.
- Lokal buyruqlarni Windows hamda macOS/Linux foydalanuvchilari bajarishi mumkin bo‘ladigan, repo script’lariga mos ko‘rinishda yoz.
- Docker ishlatilishi shart deb ko‘rsatishdan oldin lokal compose, PostgreSQL versiyasi/porti va muqobil PostgreSQL o‘rnatmasini tekshir.
- `.env.example` namunalari va haqiqiy `.env` fayllarini farqla. **Haqiqiy `.env` fayllarini ochma, qiymatlarini hujjatga yoki javobga ko‘chirma.**
- O‘zgaruvchi nomlari yoki buyruqlarni amaldagi konfiguratsiyadan tekshirmasdan ixtiro qilma.

### 5. Rollar va sahifalarni tekshir

- Joriy URL’larni frontend route konfiguratsiyasi va navigation’dan aniqlagin.
- `docs/ROLES.md` dagi rol → imkoniyat → sahifa/API jadvallarini joriy permission matrix va route’larga mosla.
- `/admin` haqidagi eski yo‘llar hali compatibility redirect bo‘lsa, buni tarixiy/redirect izohi sifatida ko‘rsat; joriy sahifalar bilan aralashtirma.
- API endpoint’i hali mavjudligini route’dan tekshir; faqat hujjatda borligi endpoint ishlashini anglatmaydi.
- Xavfsizlikka oid talablarda server tomonidagi permission’ni asosiy deb ko‘rsat; UI’da menyuni yashirish authorization o‘rnini bosmaydi.

### 6. Hujjatlar tuzilmasi va uslubi

- `docs/doc/E-AVTO-TEST.md` ni umumiy loyiha qo‘llanmasi, `docs/API.md` ni API ma’lumotnomasi, `docs/ROLES.md` ni rollar qo‘llanmasi, deploy fayllarini esa platformaga xos yo‘riqnoma sifatida ishlat.
- Har bir hujjatning vazifasi va holatini o‘quvchiga tushunarli qil. Tasdiqlangan bo‘lsa `Tekshirilgan: YYYY-MM-DD` yoki `Yangilangan: YYYY-MM-DD` sanasini qo‘sh; tekshiruv o‘tkazilmagan sanani qo‘yma.
- `docs/` uchun kerak bo‘lsa qisqa `docs/README.md` indeksi yarat: hujjat nomi, vazifasi va amaldagi/muqobil/arxiv holati. Indeksni ortiqcha takroriy ma’lumot bilan to‘ldirma.
- Hujjatlar orasida bir xil ma’lumot takrorlansa, bitta manba hujjatni belgilab, boshqalaridan unga nisbiy Markdown havolasi ber.
- Mavjud o‘zbekcha lotin yozuvi va loyiha uslubini saqla; texnik atamalarni aniq ishlat.
- Noto‘g‘ri yoki tasdiqlanmagan faktni boshqa joyga ko‘chirib, yangi “haqiqat manbasi” yaratma.

## Tavsiya etiladigan tekshiruv ro‘yxati

Ishni quyidagi tartibda bajargin:

1. `docs/` ichidagi Markdown fayllarini va yuqoridagi kod/config manbalarini ko‘rib chiq.
2. Nomuvofiqliklarni jadval yoki ichki tekshiruv ro‘yxatida ajrat: **fakt**, **manba**, **ta’sirlangan hujjatlar**, **tasdiqlanish darajasi**.
3. Faqat tasdiqlangan tuzatishlarni hujjatlarga kirit.
4. Shubhali production ma’lumotlarini aniq belgilagin yoki foydalanuvchidan tasdiq ol; taxmin bilan hal qilma.
5. Havolalardagi fayl yo‘llari to‘g‘riligini, Markdown jadvallari va kod bloklari buzilmaganini tekshir.
6. Qidiruv orqali eskirgan faktlar qolmaganini tekshir: kamida Node.js versiyasi, test fayllari soni, production URL va `/admin` atamalari.
7. `git diff` ni ko‘rib, faqat hujjat doirasidagi o‘zgarishlar borligini tasdiqla.

Faqat hujjatlar o‘zgarsa, build yoki test ishga tushirish shart emas. Biroq kod/config bu topshiriq doirasida o‘zgartirilmasin. Agar hujjatdagi faktni tuzatish uchun kod o‘zgarishi kerak bo‘lsa, kodni o‘zgartirmay, buni alohida qayd et va ruxsat so‘ra.

## Cheklovlar

- Maxfiy ma’lumotlarni (token, parol, connection string, OAuth kaliti, shaxsiy ma’lumot) o‘qima, yozma yoki logga chiqarma.
- Production servislariga deploy, migratsiya, seed, to‘lov yoki boshqa o‘zgarish kiritma.
- Foydalanuvchi alohida so‘ramasa, commit/push qilma.
- Hujjatlarni “tuzatish” bahonasida mazmunini o‘chirib yuborma; ma’nosi eskirgan bo‘limlarni yangila yoki aniq tarixiy deb belgilab, foydali ko‘rsatmalarni saqla.
- Ishchi daraxtda mavjud boshqa o‘zgarishlarga tegma.

## Yakuniy javob formati

Ish tugagach, o‘zbek tilida qisqa hisobot ber:

1. Qaysi hujjatlar o‘zgargani.
2. Qaysi faktlar kod/config bilan tasdiqlangani va qaysilari production egasi tomonidan tasdiq talab qilishi.
3. Markdown havolalari va qidiruv orqali nimalar tekshirilgani.
4. Ochiq qolgan noaniqliklar yoki foydalanuvchidan zarur tasdiq.
