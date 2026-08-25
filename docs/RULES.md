# AI DEVELOPMENT RULES

1. Kod o'zgartirishdan oldin mavjud loyiha strukturasini tahlil qiling.
2. Ishlayotgan funksionallikni sababsiz o'chirmang yoki buzib yubormang.
3. Frontend va backend qatlamini qat'iy ajrating.
4. TypeScript strict rejimida ishlang, `any` ishlatishdan qoching.
5. Biznes mantiqni UI komponentlarida emas, servis/store qatlamida yozing.
6. API so'rovlari uchun servis qatlamidan (`services/`) foydalaning.
7. Backend validatsiyasi majburiy (Zod). Hech qachon faqat frontend validatsiyasiga ishonmang.
8. Faol test vaqtida to'g'ri javoblarni foydalanuvchiga yubormang.
9. Parollarni ochiq holda saqlamang (bcryptjs).
10. API javob formati doimiy bo'lsin: `{ success: true, data: ... }` yoki `{ success: false, message: ... }`.
11. Komponentlar qayta ishlatiluvchi (reusable) va toza arxitekturada bo'lsin.
12. Mobil responsivlik va dark/light tema qo'llab-quvvatlansin.
13. O'zgarishlardan so'ng lint, typecheck va build sinovlarini o'tkazing.
