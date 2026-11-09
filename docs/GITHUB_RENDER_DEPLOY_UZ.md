# GitHub tekshiruvi → Render deploy (E-Avto Test)

## Oxirgi qayd etilgan sozlama

Quyidagi holat 2026-10-23 dagi qaydga asoslangan; u GitHub va Render’dagi
bugungi sozlamalarni tasdiqlamaydi. Deploy yoki production xulosasidan oldin
GitHub Actions va Render boshqaruv panelidagi joriy holatni tekshiring.

2026-10-23 holatida ikkala Render servisi ham ushbu rejimda. GitHub Actions’da `c74e3a5` commitining `CI` natijasi muvaffaqiyatli; Render frontendida shu commit live deb ko‘rsatilgan.

## O‘zgarishni chiqarish ketma-ketligi

1. Kodni lokalda o‘zgartiring. Maxfiy qiymatlar (`DATABASE_URL`, bot tokenlari, parollar, S3 kalitlari) va video fayllarni Git’ga qo‘shmang.
2. O‘zgarishni commit qiling va `main`ga yuboring (yoki feature branchdan PR oching).
3. GitHub → **Actions → CI** da aynan shu commit runini oching. `backend`, `bootstrap`, `railway-image`, `frontend` joblari muvaffaqiyatli tugashi kerak. CI xato qilsa, xatoni tuzating va yangi commit yuboring; serverni qo‘lda deploy qilmang.
4. CI muvaffaqiyatli bo‘lgach, Render shu commitni avtomatik build/deploy qiladi. API deployida Prisma migratsiyalari va bootstrap build bosqichida bajariladi; frontend ham alohida build bo‘ladi.
5. Render → API va Static Site → **Deploys** bo‘limlarida eng so‘nggi commit `Live` bo‘lganini tekshiring. API’ni `/api/health/live`, saytni bosh sahifa va `/lessons` orqali ko‘ring. Tegishli login, test, video va admin yuklash oqimlarini interfeysda qo‘lda tekshiring.
6. Deploy xato bo‘lsa, loglardan sababini topib tuzating. Zarur bo‘lsa Render → **Deploys → Rollback** orqali avvalgi ishlagan versiyaga qayting. Migratsiyalarni orqaga qaytarish alohida ish; yangi migratsiyalar eski kod bilan vaqtincha mos bo‘ladigan qilib yozilishi kerak.

## Takror ishlatish uchun prompt

Quyidagi promptni yangi o‘zgarish so‘raganda Codex’ga yuboring:

> E-Avto Test loyihasida [o‘zgarishni bu yerga yozing]. Avval tegishli kod, test va loyiha qoidalarini o‘qib, minimal to‘liq o‘zgarish kiriting. Maxfiy ma’lumotlar yoki video fayllarni repoga qo‘shmang. Mos lokal CI tekshiruvlarini ishga tushirib, PASS/FAIL/SKIP natijalarini aniq qayd eting. Fayllarni commit/push qilmang, `main`ga o‘zgartirish chiqarmang, Render/Railway yoki boshqa production muhitiga deploy/migratsiya qilmang. Repo konfiguratsiyasini hostingdagi joriy holatning isboti deb qabul qilmang; release bo‘yicha alohida so‘rov va ruxsat bo‘lsa, GitHub Actions hamda hosting panelidagi ayni paytdagi holatni tekshiring. Yakunda o‘zgargan fayllar, test natijalari, yechilmagan xavflar va production’da egasi/operator tekshirishi kerak bo‘lgan narsalarni qisqa bayon qiling.

## Sozlamani buzmaslik

- `deploy/render.yaml` dagi ikkala servis uchun `autoDeployTrigger: checksPass` qatorini saqlang.
- Render servislarining Settings sahifasida **After CI Checks Pass** ko‘rsatilayotganini tekshiring.
- `.github/workflows/ci.yml` push va pull requestlarda ishlashi kerak. Uning muvaffaqiyatsiz joblarini `continue-on-error` bilan yashirmang.
- `deploy.yml` hozircha alohida VPS migratsiya pipeline’i; hozirgi bepul production Render’dadir. VPS uchun u workflow’ni qo‘lda ishga tushirish production Render deployi hisoblanmaydi.
- Render loglari, GitHub Actions va deploy statusini tekshirish uchun maxfiy environment qiymatlarini chatga yoki workflow loglariga chiqarmang.
