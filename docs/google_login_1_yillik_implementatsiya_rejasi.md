# Google orqali kirish --- 1 yillik barqaror ishlash uchun loyiha hujjati

**Versiya:** 1.0\
**Sana:** 2026-11-07\
**Maqsad:** Mavjud saytga Google orqali ro'yxatdan o'tish va kirish
funksiyasini xavfsiz, sinovdan o'tgan va uzoq muddat
qo'llab-quvvatlanadigan qilib joriy etish.

> **Repo holati bo‘yicha eslatma (2026-11-07):** 1–11-bo‘limlardagi GIS,
> alohida server-side Session modeli va 365 kunlik sessiya kabi bandlar
> umumiy tavsiya/variantlar; ular loyihadagi amaldagi implementatsiya deb
> olinmasin. Kodda OAuth authorization-code redirect, `User.googleId`,
> JWT access token va hash saqlanadigan refresh-token modeli bor; refresh
> muddati odatda 30 kun. 12-bo‘limdagi promptlar aynan shu mavjud oqimni
> audit qilishga moslangan. Kod yoki hosting holati o‘zgarsa, qayta tekshiring.

------------------------------------------------------------------------

## 0. Eng muhim tushuncha: "1 yil ishlashi" nimani anglatadi?

Google Login uchun "bir marta o'rnatdim --- Google kafolati bilan 365
kun uzluksiz ishlaydi" degan texnik kafolat yo'q. Google xizmatlari,
foydalanuvchi hisoblari, domen, hosting, tarmoq va xavfsizlik
siyosatlari o'zgarishi mumkin.

Shuning uchun bu hujjatdagi maqsad:

1.  Google OAuth / Identity Services sozlamalarini to'g'ri production
    holatiga chiqarish.
2.  Google bergan ID tokenni faqat kirish paytida tekshirish.
3.  Keyin saytning o'z sessiyasini yaratish va boshqarish.
4.  Foydalanuvchini sayt siyosatiga muvofiq uzoq muddat tizimda saqlash.
5.  Sessiya tugasa yoki bekor qilinsa, xavfsiz qayta kirishni
    ta'minlash.
6.  Monitoring, test va texnik xizmat bilan bir yil davomida barqaror
    ishlashini kuzatish.

**Google ID token --- bir yillik sessiya emas.** Google ID tokenlari
qisqa muddatli bo'lib, odatda bir soatgacha amal qiladi. Uni har bir
sahifa ochilganda doimiy login tokeni sifatida ishlatish noto'g'ri.
Backend tokenni tekshiradi, so'ng o'z saytingiz sessiyasini yaratadi.
Google hujjatlarida ID tokenning `aud`, `iss`, `exp` va imzo
tekshiruvlari ko'rsatilgan.

Tavsiya etiladigan sessiya siyosati:

-   "Meni eslab qolish" yoqilgan bo'lsa: 30 kunlik harakatsizlik muddati
    va 365 kunlik mutlaq maksimal muddat.
-   Oddiy sessiya: masalan, 12--24 soatlik yoki sayt xavf darajasiga mos
    muddat.
-   Sessiya yangilanganda token rotatsiyasi amalga oshiriladi.
-   365 kun tugaganda foydalanuvchi Google orqali qayta
    autentifikatsiyadan o'tadi.
-   Parol o'zgarsa, akkaunt bloklansa yoki foydalanuvchi barcha
    qurilmalardan chiqishni tanlasa, sessiyalar bekor qilinadi.

Bu siyosat loyiha egasining xavfsizlik qarori bo'lib, Google tomonidan
kafolatlangan muddat emas.

------------------------------------------------------------------------

# 1. Loyiha uchun texnik qarorlar

## 1.1 Tavsiya etiladigan texnologiyalar

Mavjud texnologiyalarni tekshirmasdan almashtirmang. Agar loyiha React +
Vite, Express, PostgreSQL va Prisma asosida bo'lsa, shu arxitekturani
saqlang.

  -----------------------------------------------------------------------
  Qism                                Tavsiya
  ----------------------------------- -----------------------------------
  Frontend                            Mavjud React / Vite

  Google autentifikatsiyasi           Google Identity Services (GIS)

  Backend                             Mavjud Node.js / Express

  Google ID token tekshiruvi          `google-auth-library`

  Ma'lumotlar bazasi                  Mavjud PostgreSQL

  ORM                                 Mavjud Prisma

  Sessiya                             Server-side session

  Sessiya saqlash                     Redis yoki PostgreSQL

  Cookie                              HttpOnly, Secure, SameSite

  Validatsiya                         Mavjud validation kutubxonasi yoki
                                      Zod

  Test                                Mavjud test tizimi; kerak bo'lsa
                                      Vitest/Jest + Supertest +
                                      Playwright

  Monitoring                          Hosting loglari, uptime va error
                                      monitoring
  -----------------------------------------------------------------------

**Muhim:** bu texnologiyalarni loyiha auditisiz birdaniga o'rnatmang.
Avval package.json, papkalar, mavjud auth va database modelini
tekshiring.

## 1.2 Faqat login uchun kerakli Google ruxsatlari

Faqat foydalanuvchini aniqlash uchun minimal OpenID Connect ma'lumotlari
yetarli:

-   `openid`
-   `email`
-   `profile`

Google Drive, Gmail, Calendar yoki boshqa API ruxsatlarini login uchun
so'ramang. Bunday ruxsatlar faqat saytning alohida funksiyasi haqiqatan
talab qilsa qo'shiladi.

## 1.3 Google hisobini aniqlash qoidasi

-   Google hisobining doimiy identifikatori sifatida `sub` ishlatiladi.
-   Email foydalanuvchi bilan aloqa va mavjud hisobni aniqlash uchun
    ishlatilishi mumkin, lekin yagona identifikator bo'lmasligi kerak.
-   `email_verified` tekshiriladi.
-   Frontend yuborgan `email`, `name`, `picture` qiymatlariga
    ishonilmaydi; ular tekshirilgan ID token payloadidan olinadi.
-   Google Login hech qachon foydalanuvchiga ADMIN yoki SUPERADMIN
    rolini bermaydi.

------------------------------------------------------------------------

# 2. Ishni boshlashdan oldingi talablar

Dasturchi yoki AI agent quyidagilarni bilishi shart:

-   Saytning haqiqiy domeni.
-   Lokal ishlab chiqish manzili.
-   Frontend va backend portlari.
-   Production hosting va deploy usuli.
-   Mavjud autentifikatsiya usullari.
-   Mavjud User modeli va rollar.
-   Cookie / CORS / CSRF sozlamalari.
-   Database migratsiya jarayoni.
-   Saytning Privacy Policy va Terms of Service sahifalari.
-   Saytda foydalanuvchilar uchun yosh, hudud yoki boshqa maxsus
    cheklovlar bor-yo'qligi.

## 2.1 Muhitlar

Kamida uchta muhit bo'lsin:

  Muhit        Misol                           Maqsad
  ------------ ------------------------------- ----------------------------
  Local        `http://localhost:5173`         Dasturlash
  Staging      `https://staging.example.com`   Productionga o'xshash test
  Production   `https://example.com`           Haqiqiy foydalanuvchilar

`example.com` o'rniga o'zingizning haqiqiy domeningizni kiriting.

Har bir muhitning Google OAuth Client sozlamasi va environment
qiymatlari aniq ajratilsin. Production Client ID ni local yoki staging
bilan aralashtirmang.

------------------------------------------------------------------------

# 3. Google Cloud Console sozlash ketma-ketligi

Rasmiy manzil: https://console.cloud.google.com/

1.  Google Cloud Console'da loyiha yarating yoki mavjud loyihani
    tanlang.
2.  Google Auth Platform bo'limiga kiring.
3.  Branding ma'lumotlarini kiriting: sayt nomi, foydalanuvchiga
    ko'rinadigan email, logo va domen.
4.  Audience bo'limida foydalanuvchi turini tanlang.
5.  Sayt ommaviy foydalanuvchilar uchun bo'lsa, External
    konfiguratsiyasini ko'rib chiqing.
6.  Testing holatida test foydalanuvchilar ro'yxatini belgilang.
7.  Haqiqiy ishga tushirishdan oldin Publishing Status va verification
    talablarini tekshiring.
8.  Data Access bo'limida faqat kerakli minimal login scope'larini
    qoldiring.
9.  Clients bo'limida Web application turidagi OAuth Client yarating.
10. Authorized JavaScript origins ga aniq originlarni kiriting.
11. Zarur bo'lsa Authorized redirect URIs ni faqat ishlatiladigan
    callback manzillari bilan to'ldiring.
12. Client ID ni backend va frontend konfiguratsiyasiga xavfsiz
    kiriting.
13. Client Secret yaratilgan bo'lsa, uni faqat backend secret manager
    yoki server environment'da saqlang.
14. Google Cloud loyihasida billing yoki boshqa xizmatlar talab
    qilinmaydigan login funksiyasi uchun keraksiz APIlarni yoqmang.
15. Productionga chiqishdan oldin Google Auth Platform holatini qayta
    tekshiring.

### Google OAuth Testing va Production farqi

-   External + Testing rejimi cheklangan test foydalanuvchilari bilan
    ishlaydi.
-   Google hujjatlarida Testing holatidagi ayrim OAuth authorization'lar
    uchun 7 kunlik cheklov qayd etilgan. Faqat `openid`, email va
    profile kabi minimal identifikatsiya scope'lari istisno bo'lishi
    mumkin.
-   Bu holatni "barcha foydalanuvchilarga bir yil kafolat" deb talqin
    qilmang.
-   Ommaviy sayt uchun Production publishing holati va kerak bo'lsa
    Google verification jarayonini yakunlang.
-   Google talab qilgan verification bo'lmasa, foydalanuvchilarda
    ogohlantirish yoki foydalanish cheklovlari chiqishi mumkin.

Rasmiy qo'llanma:
https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

------------------------------------------------------------------------

# 4. Tavsiya etiladigan loyiha strukturasi

Quyidagi struktura namunaviy. Mavjud loyihada boshqa naming yoki module
arxitekturasi bo'lsa, unga moslashtiring. Bir xil funksiyani ikkinchi
marta yaratmang.

``` text
project/
├── frontend/
│   └── src/
│       ├── components/
│       │   └── auth/
│       │       ├── GoogleSignInButton.jsx
│       │       ├── AuthErrorMessage.jsx
│       │       └── AuthLoading.jsx
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   └── RegisterPage.jsx
│       ├── services/
│       │   └── auth.api.js
│       ├── hooks/
│       │   └── useAuth.js
│       └── ...
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   └── auth/
│   │   │       ├── auth.routes.js
│   │   │       ├── auth.controller.js
│   │   │       ├── auth.service.js
│   │   │       ├── google.service.js
│   │   │       ├── session.service.js
│   │   │       ├── auth.validation.js
│   │   │       └── auth.middleware.js
│   │   ├── middleware/
│   │   │   ├── csrf.middleware.js
│   │   │   ├── rate-limit.middleware.js
│   │   │   └── error.middleware.js
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   └── cors.js
│   │   ├── utils/
│   │   └── app.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── tests/
│       ├── auth/
│       └── integration/
│
├── docs/
│   ├── GOOGLE_LOGIN_ARCHITECTURE.md
│   ├── GOOGLE_LOGIN_SETUP.md
│   ├── GOOGLE_LOGIN_SECURITY.md
│   ├── GOOGLE_LOGIN_TEST_PLAN.md
│   └── GOOGLE_LOGIN_OPERATIONS.md
│
├── .env.example
└── README.md
```

## 4.1 Ma'lumotlar bazasi modeli

Mavjud User jadvali bo'lsa, uni tekshirmasdan yangi User jadvali
yaratmang.

Tavsiya etiladigan mantiqiy jadvallar:

### User

-   `id`
-   `email` --- loyiha siyosatiga mos unique constraint
-   `fullName`
-   `avatar`
-   `role`
-   `status`
-   `emailVerifiedAt`
-   `createdAt`
-   `updatedAt`

### AuthAccount / GoogleAccount

-   `id`
-   `provider` --- masalan, `google`
-   `providerUserId` --- Google `sub`, unique
-   `userId` --- User bilan relation
-   `createdAt`
-   `updatedAt`

Agar ko'p provider rejalashtirilsa, umumiy `AuthAccount` modeli qulay.
Faqat Google bo'lsa, `GoogleAccount` ham yetarli.

### Session

-   `id`
-   `userId`
-   `tokenHash` --- raw session token emas, uning xavfsiz hash qiymati
-   `createdAt`
-   `lastSeenAt`
-   `expiresAt`
-   `absoluteExpiresAt`
-   `revokedAt`
-   `userAgent` --- zarur bo'lsa qisqartirilgan/filtrlangan
-   `ipHash` yoki minimal xavfsiz audit ma'lumoti --- qonuniylik va
    maxfiylikni hisobga olib

Sessiya tokeni kriptografik xavfsiz tasodifiy qiymatdan yaratiladi.
Bazada raw cookie tokeni saqlanmaydi.

------------------------------------------------------------------------

# 5. API endpointlar

Mavjud API nomlash qoidalariga moslashtiring.

  ---------------------------------------------------------------------------
  Method                  Endpoint                    Vazifasi
  ----------------------- --------------------------- -----------------------
  POST                    `/api/auth/google`          Google credential
                                                      tekshirish va login

  GET                     `/api/auth/me`              Joriy foydalanuvchi va
                                                      sessiyani olish

  POST                    `/api/auth/logout`          Joriy sessiyani bekor
                                                      qilish

  POST                    `/api/auth/logout-all`      Barcha sessiyalarni
                                                      bekor qilish

  POST                    `/api/auth/refresh`         Sessiyani xavfsiz
                                                      yangilash

  GET                     `/api/auth/sessions`        Foydalanuvchining faol
                                                      sessiyalari

  DELETE                  `/api/auth/sessions/:id`    Tanlangan sessiyani
                                                      bekor qilish

  POST                    `/api/auth/google/link`     Tasdiqlangan
                                                      foydalanuvchiga Google
                                                      bog'lash

  DELETE                  `/api/auth/google/unlink`   Google bog'lanishini
                                                      uzish
  ---------------------------------------------------------------------------

Endpointlar kerak bo'lmasa, ortiqcha yaratmang. Har bir endpoint uchun
authentication, authorization, validation, rate limit va audit talablari
belgilanadi.

------------------------------------------------------------------------

# 6. Sessiya va bir yil davomida login holatini saqlash

## 6.1 Google token va sayt sessiyasini aralashtirmang

1.  Foydalanuvchi Google orqali autentifikatsiya qiladi.
2.  Frontend Google credential oladi.
3.  Backend credentialni tekshiradi.
4.  Backend foydalanuvchini topadi yoki xavfsiz ro'yxatdan o'tkazadi.
5.  Backend o'zining random session tokenini yaratadi.
6.  Session token HttpOnly cookie orqali yuboriladi.
7.  Keyingi API so'rovlarida backend cookie asosida sessiyani
    tekshiradi.
8.  Google ID token har bir API so'rovida yuborilmaydi.

## 6.2 Tavsiya etiladigan "Meni eslab qolish" siyosati

  Holat                         Tavsiya
  ----------------------------- --------------------------------------
  Oddiy login                   Qisqa muddatli sessiya
  Remember me                   30 kunlik inactivity timeout
  Mutlaq maksimal muddat        365 kun
  Faol sessiya yangilanishi     Har xavfsiz refreshda token rotation
  Logout                        Server session revoke + cookie clear
  Parol / xavfsizlik hodisasi   Zarur sessiyalarni bekor qilish
  Akkaunt bloklanishi           Barcha sessiyalarni bekor qilish
  365 kun tugashi               Qayta autentifikatsiya

365 kunlik mutlaq muddatga yetganda qayta Google login talab qilinadi.
Bu foydalanuvchini Google'dan har kuni qayta login qildirish degani
emas: sayt o'z sessiyasini boshqaradi.

## 6.3 Cookie talablari

-   `HttpOnly: true`
-   `Secure: true` --- production HTTPS'da
-   `SameSite=Lax` --- arxitekturaga mos ravishda
-   `Path=/`
-   Cookie nomi `__Host-` prefiksidan foydalanishi mumkin, agar uning
    barcha talablariga rioya qilinsa.
-   Cookie ichida role, email yoki maxfiy profil ma'lumotlarini
    saqlamang.
-   Cookie max-age va server session expiry bir-biriga mos bo'lsin.
-   Cross-site frontend/backend arxitekturasi bo'lsa,
    `SameSite=None; Secure` zarur bo'lishi mumkin; bunday holatda CSRF
    himoyasini kuchaytiring.

## 6.4 Refresh token rotatsiyasi

-   Har refreshda eski session token bekor qilinadi.
-   Yangi tasodifiy token yaratiladi.
-   Bazada faqat token hash saqlanadi.
-   Eski token qayta ishlatilsa, session reuse hodisasi qayd qilinadi va
    tegishli sessiyalar bekor qilinadi.
-   Parallel refresh so'rovlar uchun race condition himoyasi bo'lsin.
-   Refresh endpoint rate limit bilan himoyalansin.

------------------------------------------------------------------------

# 7. Google ID tokenni backendda tekshirish

Node.js uchun rasmiy Google kutubxonasi `google-auth-library`
ishlatilishi mumkin.

``` bash
npm install google-auth-library
```

Tekshiruvda quyidagilar majburiy:

1.  Token mavjud va to'g'ri formatda.
2.  Google imzosi ishonchli Google kalitlari orqali tekshirilgan.
3.  `aud` aynan kutilgan Client ID ga teng.
4.  `iss` ruxsat etilgan Google issuer qiymatiga teng.
5.  `exp` muddati tugamagan.
6.  `sub` mavjud.
7.  `email` kerak bo'lsa mavjud.
8.  `email_verified` true bo'lishi kerak.
9.  `nonce` ishlatilgan flow'da kutilgan nonce bilan solishtiriladi.
10. Foydalanuvchi statusi va sayt qoidalari tekshiriladi.

Tokenni faqat decode qilish tekshirish hisoblanmaydi. JWT payloadni
Base64 decode qilib olish imzoni tasdiqlamaydi.

Backend Google kutubxonasi orqali kriptografik tekshiruvni bajarishi
kerak. Google kalitlari rotatsiya qilinishi mumkin; qo'lda doimiy kalit
yozib qo'ymang.

------------------------------------------------------------------------

# 8. Hisob yaratish va mavjud hisobni bog'lash qoidalari

## 8.1 Yangi Google foydalanuvchi

-   Token tekshiriladi.
-   `sub` bo'yicha Google account qidiriladi.
-   Topilmasa, email bo'yicha mavjud User bor-yo'qligi tekshiriladi.
-   Email mavjud bo'lmasa, saytning registration siyosatiga muvofiq
    yangi User yaratiladi.
-   GoogleAccount/AuthAccount yozuvi yaratiladi.
-   Default role faqat oddiy foydalanuvchi roli bo'ladi.
-   Transaction va unique constraint ishlatiladi.

## 8.2 Email oldin mavjud bo'lsa

Email bir xil bo'lgani uchungina Google hisobini eski akkauntga
avtomatik bog'lamang.

Xavfsiz tartib:

1.  Mavjud akkaunt egasini saytning oldingi login usuli bilan
    tasdiqlash.
2.  Yoki mavjud akkauntga yuborilgan tasdiqlash jarayonini bajarish.
3.  Shundan keyingina Google `sub` ni akkauntga bog'lash.
4.  Bog'lash amaliyotini audit logga yozish.

## 8.3 Admin va maxsus rollar

-   Google Login yangi userga admin huquqi bermaydi.
-   `role` frontenddan qabul qilinmaydi.
-   `role` faqat backend va vakolatli admin workflow orqali o'zgaradi.
-   SUPERADMIN yaratish alohida, kuchli nazorat qilinadigan jarayon
    bo'lsin.
-   Bloklangan user sessiyasi qayta faollashtirilmaguncha login
    qilolmasin.

------------------------------------------------------------------------

# 9. Xavfsizlik talablari

Majburiy nazoratlar:

-   HTTPS.
-   Backend token verification.
-   CSRF himoyasi.
-   CORS allowlist.
-   Login va refresh endpointlarida rate limit.
-   Helmet va xavfsiz HTTP headerlar.
-   Request body schema validation.
-   SQL injectiondan himoya --- Prisma parametrli so'rovlari va xavfsiz
    query.
-   Xatoliklarda stack trace yoki secret qaytarmaslik.
-   Session tokenni hash qilib saqlash.
-   Session rotation va revoke.
-   Brute-force va abuse monitoring.
-   Admin uchun qo'shimcha autentifikatsiya / MFA siyosati.
-   Secretlarni `.env` yoki secret manager orqali boshqarish.
-   `.env` fayllarini Git'ga yubormaslik.
-   Loglarda ID token, cookie, access token, refresh token, parol va
    secretlarni yozmaslik.
-   Audit logda zarur minimal ma'lumotni saqlash.
-   Dependency yangilanishlarini muntazam tekshirish.
-   Backup va restore jarayonini sinash.

## 9.1 CORS va cookie

CORS'da `*` bilan credentials ishlatmang. Aniq ruxsat etilgan originlar
ro'yxati bo'lsin. `credentials: true` faqat kerakli originlar uchun
ishlasin.

Frontend `fetch` orqali cookie ishlatsa, kerakli so'rovlarda
`credentials: "include"` bo'lishi kerak. Backend CORS sozlamasi ham mos
bo'lishi shart.

## 9.2 CSRF

GIS credentialni o'z JavaScript callback'ingizdan API'ga yuborayotgan
bo'lsangiz, o'z backend endpointingizda CSRF himoyasini loyihalang.
GIS'ning o'z POST login URI usuli ishlatilsa, Google ko'rsatgan
`g_csrf_token` double-submit cookie tekshiruvini bajaring.

Faqat CORS'ga ishonish CSRF himoyasi o'rnini bosmaydi.

------------------------------------------------------------------------

# 10. 1 yillik texnik xizmat rejasi

  -----------------------------------------------------------------------
  Davr                                Tekshiruv
  ----------------------------------- -----------------------------------
  Har deploy                          Smoke test, login, logout, `/me`

  Har hafta                           Error log, auth failure, uptime

  Har oy                              Dependency/security update, OAuth
                                      config, backup

  Har chorak                          Restore test, session policy,
                                      access review

  6 oyda                              To'liq security va integration
                                      regression

  12 oyda                             To'liq audit, domain/client/consent
                                      status, dependency review
  -----------------------------------------------------------------------

Monitoring qilinadigan ko'rsatkichlar:

-   Google login muvaffaqiyat darajasi.
-   Google token verification xatolari.
-   Backend 5xx xatolari.
-   Session refresh xatolari.
-   Cookie/CORS/CSRF xatolari.
-   Login endpointga noodatiy ko'p so'rov.
-   Database connection va query xatolari.
-   Google Cloud OAuth app publishing/verification holati.
-   Domen, HTTPS sertifikat va DNS holati.

Monitoring loglari maxfiy tokenlarni o'z ichiga olmasin.

------------------------------------------------------------------------

# 11. Test rejasi

## 11.1 Funksional testlar

-   [ ] Yangi Google user ro'yxatdan o'tadi.
-   [ ] Mavjud Google user qayta kiradi.
-   [ ] Profil nomi va avatar to'g'ri olinadi.
-   [ ] Email verification holati tekshiriladi.
-   [ ] Google hisobining `sub` qiymati saqlanadi.
-   [ ] Bir email uchun dublikat user yaratilmaydi.
-   [ ] Akkaunt bog'lash tasdiqlashni talab qiladi.
-   [ ] Logout sessiyani bekor qiladi.
-   [ ] `/me` faqat amaldagi sessiyani qaytaradi.
-   [ ] Sahifani yangilash loginni yo'qotmaydi.
-   [ ] Remember me siyosati ishlaydi.
-   [ ] Sessiya muddati tugaganda qayta login so'raladi.

## 11.2 Xavfsizlik testlari

-   [ ] Soxta token rad qilinadi.
-   [ ] Noto'g'ri `aud` rad qilinadi.
-   [ ] Noto'g'ri `iss` rad qilinadi.
-   [ ] Muddati tugagan token rad qilinadi.
-   [ ] Email tasdiqlanmagan holat siyosatga muvofiq rad qilinadi.
-   [ ] CSRF token yo'q yoki noto'g'ri bo'lsa so'rov rad qilinadi.
-   [ ] Ruxsatsiz origin cookie bilan so'rov yubora olmaydi.
-   [ ] Rate limit ishlaydi.
-   [ ] Raw session token DB'da saqlanmaydi.
-   [ ] Logoutdan keyin eski session ishlamaydi.
-   [ ] Admin roli frontend orqali o'zgartirib bo'lmaydi.
-   [ ] Bloklangan user login qila olmaydi.
-   [ ] Parallel login dublikat account yaratmaydi.
-   [ ] Parallel refresh token race condition keltirib chiqarmaydi.

## 11.3 Brauzer va qurilma testlari

-   [ ] Chrome desktop.
-   [ ] Firefox desktop.
-   [ ] Edge desktop.
-   [ ] Safari mavjud bo'lsa.
-   [ ] Android mobil brauzer.
-   [ ] iOS mobil brauzer.
-   [ ] Kichik ekran.
-   [ ] Cookie bloklangan holat.
-   [ ] Third-party cookie cheklovlari.
-   [ ] Sekin internet.
-   [ ] Google popup yopib yuborilgan holat.
-   [ ] Foydalanuvchi Google loginni bekor qilgan holat.

## 11.4 Uzoq muddatli testlar

-   365 kun kutish shart emas.
-   Session expiry qiymatlarini test muhitida qisqa vaqtga sozlab,
    muddat tugashini simulyatsiya qiling.
-   Refresh rotation, absolute expiry, revoke va qayta loginni
    avtomatlashtirilgan test qiling.
-   Productionda haqiqiy muddatlar alohida konfiguratsiyada saqlansin.
-   Test uchun qisqartirilgan expiry productionga deploy qilinmasin.

------------------------------------------------------------------------

# 12. AI dasturchi uchun promptlar ketma-ketligi

Quyidagi promptlar Google Login’ni noldan yaratish uchun emas, repoda
mavjud implementatsiyani tekshirish va zarur bo‘lsa kichik, asoslangan
tuzatishlar kiritish uchun mo‘ljallangan. Ularni bittadan bajaring; oldingi
bosqichning xulosasi keyingisiga berilsin.

Repo tekshiruvida ko‘rilgan joriy holat (kod o‘zgargan bo‘lsa qayta tekshiring):

- Backend: `/api/auth/google/config`, `/start`, `/callback` va
  `DELETE /api/auth/google`; Google OAuth authorization-code flow ishlatiladi.
- Profil: `User.googleId`, `googleEmail`, `googleUnlinkedAt`; alohida
  `GoogleAccount` modeli yo‘q.
- Account tanlash: amaldagi service `sub` bo‘yicha topadi; aks holda
  Google tasdiqlagan email bilan mavjud account’ni bog‘lashi mumkin.
  `googleUnlinkedAt` bu qayta bog‘lanishni to‘xtatadi.
- Sessiya: qisqa muddatli access JWT va bazada hash saqlanadigan
  rotating refresh-token; standart refresh muddati 30 kun.
- Konfiguratsiya: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  ixtiyoriy `GOOGLE_REDIRECT_URI`; frontendda GIS Client ID yo‘q.
- Testlar: `backend/tests/google.test.ts` va
  `backend/tests/linked-accounts.test.ts`; PostgreSQL bo‘lmasa
  integratsiya testlari skip bo‘lishi mumkin.

Har bir prompt uchun umumiy qoida:

> Avval tegishli kod, test va konfiguratsiyani o‘qib, amaldagi xulqni
> aniqlagin. Mavjud oqimni avtomatik qayta yozma yoki yangi dependency,
> model, endpoint qo‘shma. Koddagi fakt, tashqi servis holati va egasi
> tasdiqlashi kerak bo‘lgan qarorlarni ajrat. `.env` va boshqa secret
> qiymatlarni ochma yoki logga chiqarmagin. Test natijasini aniq qayd et;
> ishga tushmagan yoki skip bo‘lgan testni PASS deb ko‘rsatma. Commit,
> push, production deploy va production migration qilma. Kod o‘zgarishi
> kerak bo‘lsa, faqat prompt doirasida reja, sabab va tekshiruvni ko‘rsat.

## PROMPT 01 --- Loyihani to'liq audit qilish

``` text
Sen senior full-stack engineer va application security engineer sifatida ishlaysan.

Vazifa: repodagi mavjud Google Login implementatsiyasini audit qil; noldan qayta yozma.

Hozircha hech qanday faylni o‘zgartirma.

Tekshir:
1. Frontend va backend frameworklari.
2. package.json va mavjud dependencylar.
3. Hozirgi login/register/logout tizimi.
4. User, Role, Permission va Session modellari.
5. Database va migration holati.
6. CORS, Cookie, CSRF va Helmet sozlamalari.
7. API route/controller/service strukturasi.
8. Environment variable ishlatilishi.
9. Testlar va deploy jarayoni.
10. Mavjud auth bilan Google Login integratsiyasi qanday amalga oshirilishi.

Natijada:
- Mavjud arxitektura xaritasi.
- Faqat zarur bo‘lsa o‘zgartiriladigan fayllar.
- Yangi fayl yaratishga asos bormi.
- Xavfsizlik kamchiliklari.
- Migration xavflari.
- Bosqichma-bosqich implementatsiya rejasi.

Mavjud kodni qayta yozma. Aniqlanmagan narsani taxmin qilma.
```

## PROMPT 02 --- Integratsiya arxitekturasini loyihalash

``` text
Audit natijasiga asoslanib repodagi Google authorization-code oqimini
saqlaydigan, faqat zarur farqlarni ko‘rsatadigan texnik qaror yoz.

Talablar:
- Mavjud frontend/backend stack saqlansin.
- Google faqat identity provider bo‘lsin.
- Mavjud token exchange va claim tekshiruvini rasmiy Google hujjatlariga
  solishtir; yangi flow yoki endpoint talab qilma.
- Mavjud access JWT va hash saqlanadigan rotating refresh-token modelini saqla.
- User va Google account bog‘lanishi xavfsiz bo‘lsin.
- Role va permission backend tomonidan boshqarilsin.
- 30 kunlik refresh token muddati mavjud; 365 kun absolute limit
  joriy etilgan deb ko‘rsatma. Zaruratni loyiha egasi hal qiladi.
- 365 kunlik sessiya Google ID token muddati bilan aralashtirilmasin.

Joriy API contract, error flow, security boundary va zarur testlarni yoz.
Hozircha kod yozma.
```

## PROMPT 03 --- Google Cloud sozlamalari hujjati

``` text
Google Cloud Console uchun loyiha egasi bajaradigan aniq setup hujjatini yarat.

Quyidagilarni yorit:
- Google Auth Platform.
- Branding.
- Audience.
- Data Access va minimal scopes.
- Web OAuth Client.
- OAuth authorization-code oqimiga kerakli redirect URI.
- Local, staging, production muhitlari.
- Testing va Production publishing farqi.
- Verification talablarini tekshirish.
- Client ID va Client Secret xavfsizligi.

Default redirect’ni `GOOGLE_REDIRECT_URI` yoki `CLIENT_URL` + callback
koddan tekshir. Haqiqiy domen noma’lum bo‘lsa placeholder ishlat.
Hech qanday soxta Client ID yoki Secret yaratma.
Google Console live holatini repo’dan tasdiqlama. Avval setup hujjati
rejasini ber; fayl yozishni alohida so‘rashmasa o‘zgartirma.
```

## PROMPT 04 --- Environment konfiguratsiyasi

``` text
Google Login uchun environment konfiguratsiyasini mavjud loyiha standartiga
mos ravishda tayyorla.

Talablar:
- Backend Google Client ID.
- Ixtiyoriy `GOOGLE_REDIRECT_URI`.
- Mavjud cookie/refresh expiry sozlamalari.
- Allowed origins.
- Development/staging/production ajratilishi.
- Environment validation.
- .env.example yangilanishi.

Secret frontend bundle ichiga tushmasin.
.env Git’ga kirmasin.
`backend/.env.example` va `env.ts`ni tekshir; yangi env nomi o‘ylab topma.
Haqiqiy `.env` faylini ochma.
```

## PROMPT 05 --- Database modelini tayyorlash

``` text
Mavjud Prisma schema va User modelidagi Google account bog‘lanishini audit qil.

Talablar:
- Google sub unique bo‘lsin.
- `googleId` unique constraint va unlink holatini tekshir.
- RefreshToken token hash, rotation, expiry va revoke holatini tekshir;
  alohida Session modelini o‘zboshimchalik bilan qo‘shma.
- Unique constraint/indexlar mavjudligini tekshir; faqat yetishmasligi
  dalil bilan tasdiqlansa qo‘shishni taklif qil.
- Mavjud foydalanuvchi ma’lumotlari yo‘qolmasin.

Sxema o‘zgarishi zarurligini isbotla. Zarur bo‘lmasa migration yaratma.
Production DB’ga migration qo‘llama; non-production reja va risklarni ko‘rsat.
```

## PROMPT 06 --- Google token verification service

``` text
Mavjud `google.service.ts` code-exchange va ID token claim tekshiruvini audit qil.

Talablar:
- Amaldagi server-to-server code exchange’ni Google’ning joriy rasmiy
  hujjatlari bilan solishtirib, token tekshiruvi chegarasini tushuntir.
- Audience tekshiruvi.
- Issuer tekshiruvi.
- Expiration tekshiruvi.
- sub mavjudligi.
- email_verified siyosati.
- Zarur bo‘lsa nonce tekshiruvi.
- Xavfsiz error handling.
- Token va maxfiy ma’lumotlar logga yozilmasin.

JWT payload decode’ini yakka o‘zi kriptografik tasdiq deb atama.
Mavjud flow’ga mos testlarni taklif qil; darhol dependency qo‘shma.
```

## PROMPT 07 --- Google Login backend endpoint

``` text
Mavjud GET /api/auth/google/start va GET /api/auth/google/callback
endpointlarini tekshir va faqat dalil bilan tasdiqlangan xatoni tuzat.

Jarayon:
1. State cookie va callback state tekshiruvi.
2. OAuth code exchange va Google profil claim’lari tekshiruvi.
3. Google sub bo‘yicha account lookup, mavjud email va yangi account flow.
4. User status, 2FA va yangi foydalanuvchini ro‘yxatdan o‘tkazish davomiyligi.
5. Access/refresh session yaratish va HttpOnly cookie.
6. Xatolik yo‘llari va test qamrovi.

Frontenddan role, verified status yoki ishonchli email qabul qilma.
Yangi POST route va ortiqcha AuditLog talab qilma; mavjud DB oqimini va
testlarni tekshir. Tasdiqlangan o‘zgarishlargagina kod yoz.
```

## PROMPT 08 --- Account linking

``` text
Mavjud Google account linking/unlinking oqimini audit qil.

Qoidalar:
- Email collision va verified Google email bilan linking siyosatini
  amaldagi kod/testdan aniqlab, egasi tasdiqlashi kerak bo‘lsa ajrat.
- Google sub boshqa User’ga tegishli bo‘lsa linking rad qilinsin.
- Bitta Google sub ikki User’ga biriktirilmasin.
- Foydalanuvchining yagona login usulini uzishdan himoya bor-yo‘qligini
  tekshir; siyosatni egasi tasdiqlamasa o‘zgartirma.
- Mavjud account linking xulqini loyiha egasi qarorisiz o‘zgartirma.
- Race condition va transaction himoyasi bo‘lsin.

Audit bosqichida kod o‘zgartirma; yetishmayotgan testlarni taklif qil.
```

## PROMPT 09 --- Access va refresh sessiya modeli

``` text
Mavjud JWT access va refresh-token sessiyasini Google Login bilan
solishtirib tekshir; yangi session tizimini yaratma.

Talablar:
- Kriptografik xavfsiz random token.
- Bazada token hash.
- HttpOnly cookie.
- Production HTTPS uchun Secure.
- SameSite arxitekturaga mos.
- Session rotation.
- `REFRESH_TOKEN_TTL_DAYS` default qiymati 30 kun ekanini tekshir.
- 365 kunlik absolute expiry bor deb ko‘rsatma; egasi qarorisiz
  yangi muddat siyosatini joriy qilma.
- Logout va logout-all.
- Revoked session qayta ishlamasin.
- Parallel refresh race condition himoyasi.

Google ID tokenni sayt sessiyasi sifatida ishlatma.
Amaldagi refresh cookie, rotation, revoke va race himoyasini tekshir;
session/cookie qiymatini log qilma.
```

## PROMPT 10 --- Frontend Google tugmasi

``` text
Mavjud GoogleButton va GoogleCallback redirect oqimini tekshir.

Talablar:
- Butun sahifani `/api/auth/google/start`ga yo‘naltirish xulqi.
- Responsive dizayn.
- Mavjud sayt dizayniga mos.
- Provider sozlanmagan va callback/cancel/error holatlari.
- Callback’dan keyingi auth init, 2FA va `hasPassword=false` oqimi.
- Klaviatura va accessibility talablariga rioya qilinsin.

GIS JavaScript SDK’ni zaruratsiz qo‘shma. Faqat tasdiqlangan UX xatosini
tuzatib, tegishli frontend testni ishga tushir.
```

## PROMPT 11 --- Auth state va protected routes

``` text
Mavjud frontend auth state, protected route va refresh oqimini audit qil.

Talablar:
- Google callback’dan keyin mavjud auth init va /api/auth/me ishlashini tekshir.
- Loading vaqtida protected page noto‘g‘ri redirect qilinmasin.
- 401 bo‘lsa login holati tozalansin.
- 403 bo‘lsa ruxsat yo‘qligi ko‘rsatilsin.
- Role asosidagi UI faqat qulaylik uchun ishlasin; haqiqiy ruxsat backendda tekshirilsin.
- Refreshdan keyin login holati tiklansin.
- Logoutdan keyin UI va server session tozalansin.

Yangi auth state tizimi yaratma; faqat takrorlanadigan xatoni tuzat.
```

## PROMPT 12 --- Role va permission xavfsizligi

``` text
Google Login mavjud role/permission tizimini buzmasligini tekshir.

Talablar:
- Yangi user faqat xavfsiz default role olsin.
- Frontend role qiymati qabul qilinmasin.
- Admin/Superadmin faqat vakolatli server-side workflow bilan berilsin.
- Har bir protected API permission tekshirsin.
- Bloklangan user kirishi rad etilsin.
- Role/tokenVersion va backend authorization tekshiruvini amaldagi koddan tasdiqla.

Mavjud RBAC tizimini qayta yozma; kamchiliklarini hujjatlashtir.
```

## PROMPT 13 --- CSRF, CORS va browser security

``` text
Google authorization-code oqimidagi mavjud browser himoyasini audit qil.

Tekshir:
- Exact CORS allowlist.
- Credentials bilan wildcard origin ishlatilmasin.
- Start/callback state cookie va refresh/logout route himoyasini tekshir.
- Origin/Referer qo‘shimcha tekshiruv zarurligini bahola.
- Cookie SameSite va Secure.
- Helmet/security headers.
- Content Security Policy mosligi.
- Login va refresh rate limit.

GIS credential POST mavjud deb taxmin qilib, tegishliligini tekshirmasdan
g_csrf_token talab qilma. CORS’ni yakka o‘zi CSRF himoyasi deb hisoblama.
Production va local konfiguratsiyalar ajratilsin.
```

## PROMPT 14 --- Error handling va foydalanuvchi xabarlari

``` text
Google Login uchun standart xatoliklarni ishlab chiq.

Holatlar:
- OAuth callback’da foydalanuvchi bekor qilgan.
- Invalid state/code yoki provider token tekshiruvi muvaffaqiyatsiz.
- Client ID mismatch.
- Email verification policy failure.
- Account blocked.
- Existing account linking required.
- Network error.
- Backend/database error.
- Session expired.
- Rate limit.

Foydalanuvchiga tushunarli xabar ko‘rsat.
Ichki stack trace, token, email yoki maxfiy server ma’lumotlarini
ortiqcha oshkor qilma.
Har bir xatolik uchun mos HTTP status va error code belgila.
```

## PROMPT 15 --- Automated testlar

``` text
Google Login’ning mavjud unit/integration testlari qamrovini tekshir.

Tekshir:
- Valid token flow.
- Invalid/expired token.
- Wrong audience.
- Wrong issuer.
- Missing sub.
- Unverified email policy.
- New user.
- Returning user.
- Duplicate account race.
- Email collision.
- Account linking.
- Blocked account.
- Session creation.
- Session rotation.
- Session expiry.
- Logout/revoke.
- CSRF/CORS/rate limit’ning mavjud himoyasi.
- Role escalation attempt.

Haqiqiy foydalanuvchi Google hisobini test kodiga joylashtirma.
Token verification uchun xavfsiz mock yoki test fixture ishlat.
TEST_DATABASE_URL sozlanmagani sabab integration test skip bo‘lsa SKIP
deb qayd et; PASS demagin. Faqat tasdiqlangan bo‘shliqni to‘ldir.
```

## PROMPT 16 --- Monitoring va audit log

``` text
Google Login uchun mavjud monitoring va audit logni tekshir.

Metrikalar:
- Qaysi login/refresh hodisasi haqiqatda qayd etilishini tasdiqla.
- 401/403/429/5xx.
- Database error.
- OAuth config holatini qo‘lda tekshirish ro‘yxati.
- Uptime va HTTPS certificate monitoring.

Yetishmayotgan metric/audit hodisalarini taklif qil; joriy deb taxmin qilma.

Token, cookie, password, secret yoki to‘liq credentialni logga yozma.
Retention muddatini loyiha egasi qarorisiz belgilama.
```

## PROMPT 17 --- Staging va production deploy

``` text
Google Login o‘zgarishi uchun release checklist tuz; deploy qilma.

Talablar:
- Environment variable tekshiruvi.
- Google Cloud OAuth redirect sozlamalari.
- HTTPS.
- CORS va cookie domain.
- Database migration backup va rollback.
- Health check.
- Smoke test.
- Deploydan keyingi login/logout testlari.
- Production secretlar faqat server secret manager’da.
- Oldingi versiyaga qaytish rejasi.

Repo sozlamalari Render/Railway/Google Cloud’dagi joriy holatni o‘zi
tasdiqlamaydi. Commit, push, production migration/deploy qilma; egasining
alohida ruxsati kerak.
```

## PROMPT 18 --- 1 yillik operatsion reja va yakuniy audit

``` text
Google Login tizimini 12 oy davomida qo‘llab-quvvatlash uchun
operatsion reja va yakuniy audit tayyorla.

Tekshir:
- OAuth app Production publishing holati.
- Verification talablarining bajarilishi.
- Client ID va domen konfiguratsiyasi.
- Refresh/absolute expiry sessiya siyosati; qiymatlarni kod va egasi bilan tasdiqla.
- Dependency va security update.
- Backup/restore.
- Monitoring.
- Error trend.
- Rate limit.
- Account linking.
- Admin authorization.
- Privacy policy va data retention.
- Incident response va rollback.

Har hafta, oy, chorak, 6 oy va 12 oy uchun vazifalar jadvalini yoz.
Mas’ul belgilanmagan bo‘lsa, egasi tayinlashi kerak deb ko‘rsat. 365 kunlik
kirish yoki uptime kafolatlangan deb yozma.
Bajarilmagan testni PASS deb ko‘rsatma.
```

------------------------------------------------------------------------

# 13. AI agent bajarishi kerak bo'lgan ish tartibi

  Bosqich   Prompt   Kutiladigan natija
  --------- -------- ----------------------------------
  1         01       Mavjud kod va xavflar auditi
  2         02       Dalillangan arxitektura qarori
  3         03       Google Cloud setup bo‘yicha tavsiya
  4         04       Environment konfiguratsiyasi auditi
  5         05       Sxema va migratsiya auditi
  6         06       Token tekshiruvi auditi
  7         07       Backend oqimi va testlar
  8         08       Account linking siyosati auditi
  9         09       Access/refresh sessiya auditi
  10        10       Frontend redirect/callback auditi
  11        11       Auth state va route auditi
  12        12       Role/permission auditi
  13        13       Browser security auditi
  14        14       Xatolik xabarlari va mapping
  15        15       Test qamrovi va natijalari
  16        16       Monitoring/audit takliflari
  17        17       Deploy qilinmaydigan release checklist
  18        18       12 oylik operatsion reja

**Ishlash qoidasi:** Har bir promptdan keyin AI agent ko‘rilgan/o‘zgartirilgan fayllar,
bajarilgan testlar, natijalar va ochiq masalalarni yozsin. Audit promptlari
kodni o‘zgartirishga ruxsat bermaydi; faqat tegishli prompt bunga ruxsat
berganida tuzatish kiritsin. Loyiha egasi hal qilishi yoki live muhitdan
tasdiqlanishi kerak bo‘lgan masala ochiq qolsa, uni keyingi implementatsiya
bosqichiga to‘siq sifatida ko‘rsatsin.

------------------------------------------------------------------------

# 14. Qabul qilish mezonlari (Definition of Done)

Mavjud Google Login auditi quyidagi dalillar bilan tasdiqlangandagina
yakunlangan hisoblanadi. Ro‘yxat joriy kodning holatini oldindan
tasdiqlamaydi:

-   [ ] `/start` va `/callback` authorization-code oqimi, state tekshiruvi
    va `next` manzilining himoyasi test bilan tasdiqlangan.
-   [ ] Google token endpoint javobi va claim tekshiruvlari joriy rasmiy
    protokolga mosligi bo‘yicha manba bilan tekshirilgan.
-   [ ] `googleId` unique; email collision/link/unlink xulqi aniq,
    testlangan va loyiha egasi siyosatni tasdiqlagan.
-   [ ] Google login USER’dan yuqori rol bermaydi; nofaol foydalanuvchi kira olmaydi.
-   [ ] Access JWT, refresh token hash, rotation, expiry, logout/revoke
    xulqi tegishli testlardan o‘tgan.
-   [ ] Refresh/state cookie, CORS va zarur browser himoyasi real
    konfiguratsiyaga mosligi bilan tasdiqlangan.
-   [ ] 30 kunlik default refresh muddati tasdiqlangan; owner qarorisiz
    365 kunlik absolute muddat joriy qilingan deb aytilmagan.
-   [ ] Tegishli backend/frontend testlari PASS; DB talab qilgan test
    ishlamasa SKIP deb qayd etilgan.
-   [ ] Google Cloud va production’dagi live sozlamalarni vakolatli
    operator alohida tasdiqlagan; repo config live status deb olinmagan.
-   [ ] Loglarda token/secret yo‘qligi tekshirilgan; noma’lum holatlar qayd etilgan.
-   [ ] Hujjat koddagi haqiqiy oqimni va egasi hal qiladigan qarorlarni ajratgan.

**Qabul qilish qoidasi:** barcha majburiy testlar dalil bilan
tasdiqlanmaguncha "100% tayyor" yoki "bir yil kafolatlangan" deb e'lon
qilinmaydi.

------------------------------------------------------------------------

# 15. Rasmiy texnik manbalar

1.  Google Identity Services overview\
    https://developers.google.com/identity/gsi/web/guides/overview

2.  Google ID tokenni backendda tekshirish\
    https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

3.  Backend authentication guide\
    https://developers.google.com/identity/sign-in/web/backend-auth

4.  Google OAuth 2.0\
    https://developers.google.com/identity/protocols/oauth2

5.  OAuth production readiness\
    https://developers.google.com/identity/protocols/oauth2/production-readiness/overview

6.  Google JavaScript API reference\
    https://developers.google.com/identity/gsi/web/reference/js-reference

7.  OpenID Connect\
    https://developers.google.com/identity/openid-connect/openid-connect

Google hujjatlari vaqt o'tishi bilan yangilanishi mumkin. Ishlab chiqish
va production deploy paytida ushbu rasmiy hujjatlarning eng so'nggi
versiyasini tekshiring.

------------------------------------------------------------------------

# 16. Umumiy natija

Ushbu hujjat Google Login’ni noldan yaratish bo‘yicha ko‘rsatma emas.
Repo tekshiruvida ko‘rilgan oqim:

1.  Frontend `/api/auth/google/start` orqali Google’ga yo‘naltiriladi.
2.  Google authorization code’ni `/api/auth/google/callback` manziliga qaytaradi.
3.  Backend code’ni token endpoint’iga almashib, ID token claim’larini tekshiradi.
4.  Foydalanuvchi Google `sub` orqali aniqlanadi; mavjud account/link
    siyosati `google.service.ts`dagi xulqqa bog‘liq.
5.  Backend access JWT va bazada hash saqlanadigan refresh token beradi;
    refresh cookie HttpOnly.
6.  Frontend callback session’ni tiklaydi, 2FA va tugallanmagan
    ro‘yxatdan o‘tishni davom ettiradi.
7.  Role/permission, Google Cloud live sozlamalari va hosting holati alohida
    koddan va operator dalillaridan tasdiqlanadi.

## Yakuniy texnik xulosa

**Repo’da ko‘rilgan yechim:**

`OAuth authorization-code redirect → Backend code exchange/claim checks → User.googleId → Access JWT + rotating hashed refresh token → HttpOnly cookie → backend authorization`

**12 oylik maqsad:** mavjud Google loginni kuzatish, provider/dependency
sozlamalarini qayta tekshirish, test va incident jarayonlarini yuritish.
Refresh tokenning 30 kunlik default muddati kodda mavjud; 365 kunlik
absolute sessiya siyosati loyiha egasi qarorisiz joriy etilmaydi. Bu reja
Google, hosting yoki internet uzluksiz ishlashini kafolatlamaydi.
