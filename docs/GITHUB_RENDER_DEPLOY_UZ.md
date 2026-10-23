# GitHub tekshiruvi → Render deploy (E-Avto Test)

## Hozirgi sozlama

`main` branchga yuborilgan har bir commit avval GitHub Actions’dagi `CI` tekshiruvlaridan o‘tadi. Render’dagi **eavto-test-uz-api** va **eavto-test-uz** servislarida `Auto-Deploy: After CI Checks Pass` yoqilgan: tekshiruvlar muvaffaqiyatli tugamaguncha yangi kod serverga chiqarilmaydi. CI xato qilsa, Render shu commitni deploy qilmaydi.

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

> E-Avto Test loyihasida [o‘zgarishni bu yerga yozing]. Avval tegishli kod va loyiha qoidalarini tekshir. O‘zgarishni to‘liq amalga oshir, mos mavjud CI tekshiruvlarini lokalda bajar va xatolarni tuzat. Maxfiy ma’lumotlar yoki video fayllarni repoga kiritma. O‘zgarishni `main`ga chiqarishdan oldin GitHub Actions’dagi `CI` muvaffaqiyatli ekanini tasdiqla. Ushbu repoda Render API va frontend servislari `After CI Checks Pass` orqali deploy qilinadi; CI muvaffaqiyatsiz bo‘lsa deployni boshlama. CI yashil bo‘lgach ikkala Render servisida yangi commit `Live` bo‘lganini, API health endpointini va tegishli foydalanuvchi oqimini tekshir. Muammo topsang tuzatib, to‘liq ketma-ketlikni qayta bajar. Yakunda commit SHA, CI natijasi, Render deploy holati va amalda tekshirilgan sahifalarni qisqa bayon qil.

## Sozlamani buzmaslik

- `deploy/render.yaml` dagi ikkala servis uchun `autoDeployTrigger: checksPass` qatorini saqlang.
- Render servislarining Settings sahifasida **After CI Checks Pass** ko‘rsatilayotganini tekshiring.
- `.github/workflows/ci.yml` push va pull requestlarda ishlashi kerak. Uning muvaffaqiyatsiz joblarini `continue-on-error` bilan yashirmang.
- `deploy.yml` hozircha alohida VPS migratsiya pipeline’i; hozirgi bepul production Render’dadir. VPS uchun u workflow’ni qo‘lda ishga tushirish production Render deployi hisoblanmaydi.
- Render loglari, GitHub Actions va deploy statusini tekshirish uchun maxfiy environment qiymatlarini chatga yoki workflow loglariga chiqarmang.
