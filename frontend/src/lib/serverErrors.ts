import i18n from "@/i18n";

/**
 * The API answers in English. Messages a student or visitor can meet are shown in the UI language;
 * anything else keeps the server's own text (staff screens), and network/server failures get a
 * plain explanation by status.
 */
type Tr = { uz: string; uz_cyrl: string; ru: string };

const MESSAGES: Record<string, Tr> = {
  // Sign-in and account
  "Invalid credentials": { uz: "Telefon raqam yoki parol noto'g'ri.", uz_cyrl: "Телефон рақам ёки парол нотўғри.", ru: "Неверный номер телефона или пароль." },
  "Account is disabled": { uz: "Hisob bloklangan. Administratorga murojaat qiling.", uz_cyrl: "Ҳисоб блокланган. Администраторга мурожаат қилинг.", ru: "Аккаунт заблокирован. Обратитесь к администратору." },
  "Too many failed attempts, try again in a few minutes": { uz: "Juda ko'p noto'g'ri urinish. Bir necha daqiqadan keyin qayta urinib ko'ring.", uz_cyrl: "Жуда кўп нотўғри уриниш. Бир неча дақиқадан кейин қайта уриниб кўринг.", ru: "Слишком много неудачных попыток. Попробуйте через несколько минут." },
  "Too many attempts, please try again later": { uz: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.", uz_cyrl: "Жуда кўп уриниш. Бироздан кейин қайта уриниб кўринг.", ru: "Слишком много попыток. Попробуйте позже." },
  "Too many code attempts, please try again later": { uz: "Kod juda ko'p marta noto'g'ri kiritildi. 15 daqiqadan keyin qayta urinib ko'ring.", uz_cyrl: "Код жуда кўп марта нотўғри киритилди. 15 дақиқадан кейин қайта уриниб кўринг.", ru: "Слишком много неверных кодов. Попробуйте через 15 минут." },
  "Session expired, please sign in again": { uz: "Sessiya tugadi. Qaytadan kiring.", uz_cyrl: "Сессия тугади. Қайтадан киринг.", ru: "Сессия истекла. Войдите снова." },
  "The sign-in step expired, please sign in again": { uz: "Kirish muddati tugadi. Qaytadan kiring.", uz_cyrl: "Кириш муддати тугади. Қайтадан киринг.", ru: "Время входа истекло. Войдите снова." },
  "This account has no password; sign in with Telegram": { uz: "Bu hisobda parol yo'q — Telegram orqali kiring.", uz_cyrl: "Бу ҳисобда парол йўқ — Telegram орқали киринг.", ru: "У этого аккаунта нет пароля — войдите через Telegram." },
  "Phone number already registered": { uz: "Bu telefon raqam bilan hisob allaqachon bor. Kirish sahifasidan kiring.", uz_cyrl: "Бу телефон рақам билан ҳисоб аллақачон бор. Кириш саҳифасидан киринг.", ru: "Аккаунт с этим номером уже есть. Войдите на странице входа." },
  "Phone number already in use": { uz: "Bu telefon raqam boshqa hisobga biriktirilgan.", uz_cyrl: "Бу телефон рақам бошқа ҳисобга бириктирилган.", ru: "Этот номер уже привязан к другому аккаунту." },
  "Registration is already complete": { uz: "Ro'yxatdan o'tish allaqachon yakunlangan.", uz_cyrl: "Рўйхатдан ўтиш аллақачон якунланган.", ru: "Регистрация уже завершена." },
  "Current password is incorrect": { uz: "Joriy parol noto'g'ri.", uz_cyrl: "Жорий парол нотўғри.", ru: "Текущий пароль неверный." },
  "Invalid code": { uz: "Kod noto'g'ri.", uz_cyrl: "Код нотўғри.", ru: "Неверный код." },
  // Telegram
  "Code is invalid or expired": { uz: "Kod noto'g'ri yoki muddati o'tgan. Botda /start bosib yangi kod oling.", uz_cyrl: "Код нотўғри ёки муддати ўтган. Ботда /start босиб янги код олинг.", ru: "Код неверный или истёк. Нажмите /start в боте, чтобы получить новый." },
  "This Telegram account is linked to another user": { uz: "Bu Telegram hisobi boshqa foydalanuvchiga ulangan.", uz_cyrl: "Бу Telegram ҳисоби бошқа фойдаланувчига уланган.", ru: "Этот Telegram уже привязан к другому пользователю." },
  "This Telegram account was unlinked from your account; sign in with your password and link it again": { uz: "Bu Telegram hisobingizdan uzilgan. Parol bilan kiring va Sozlamalarda qayta ulang.", uz_cyrl: "Бу Telegram ҳисобингиздан узилган. Парол билан киринг ва Созламаларда қайта уланг.", ru: "Этот Telegram отключён от вашего аккаунта. Войдите с паролем и подключите его снова в настройках." },
  "Set a password before unlinking your only sign-in method": { uz: "Bu yagona kirish usuli. Uzishdan oldin parol o'rnating yoki boshqa usulni ulang.", uz_cyrl: "Бу ягона кириш усули. Узишдан олдин парол ўрнатинг ёки бошқа усулни уланг.", ru: "Это единственный способ входа. Сначала задайте пароль или подключите другой способ." },
  "The image contains hidden code": { uz: "Bu rasmni yuklab bo'lmaydi: ichida yashirin kod topildi.", uz_cyrl: "Бу расмни юклаб бўлмайди: ичида яширин код топилди.", ru: "Это изображение нельзя загрузить: внутри найден скрытый код." },
  "Image is too large": { uz: "Rasm juda katta.", uz_cyrl: "Расм жуда катта.", ru: "Изображение слишком большое." },
  "Only PNG, JPEG or WebP images are accepted": { uz: "Faqat PNG, JPG yoki WebP rasm qabul qilinadi.", uz_cyrl: "Фақат PNG, JPG ёки WebP расм қабул қилинади.", ru: "Принимаются только изображения PNG, JPG или WebP." },
  "Telegram login is not configured": { uz: "Telegram orqali kirish hozircha ishlamayapti.", uz_cyrl: "Telegram орқали кириш ҳозирча ишламаяпти.", ru: "Вход через Telegram сейчас недоступен." },
  // Courses, lessons, tests
  "You need an active course to take tests": { uz: "Test topshirish uchun avval kurs sotib oling.", uz_cyrl: "Тест топшириш учун аввал курс сотиб олинг.", ru: "Чтобы проходить тесты, сначала купите курс." },
  "You need access to this course to take its test": { uz: "Bu kursning testi uchun kursni sotib olish kerak.", uz_cyrl: "Бу курснинг тести учун курсни сотиб олиш керак.", ru: "Для теста этого курса нужно купить курс." },
  "This lesson is not open for you yet": { uz: "Bu dars siz uchun hali ochilmagan.", uz_cyrl: "Бу дарс сиз учун ҳали очилмаган.", ru: "Этот урок для вас ещё не открыт." },
  "No questions available": { uz: "Bu kurs uchun hozircha savollar yo'q.", uz_cyrl: "Бу курс учун ҳозирча саволлар йўқ.", ru: "Для этого курса пока нет вопросов." },
  "Attempt limit reached for this course": { uz: "Bu kurs uchun urinishlar soni tugadi.", uz_cyrl: "Бу курс учун уринишлар сони тугади.", ru: "Лимит попыток для этого курса исчерпан." },
  "Time is over for this test": { uz: "Test vaqti tugadi.", uz_cyrl: "Тест вақти тугади.", ru: "Время теста истекло." },
  "Test already finished": { uz: "Bu test allaqachon yakunlangan.", uz_cyrl: "Бу тест аллақачон якунланган.", ru: "Этот тест уже завершён." },
  "Test not found": { uz: "Test topilmadi.", uz_cyrl: "Тест топилмади.", ru: "Тест не найден." },
  "Course not found": { uz: "Kurs topilmadi.", uz_cyrl: "Курс топилмади.", ru: "Курс не найден." },
  "Lesson not found": { uz: "Dars topilmadi.", uz_cyrl: "Дарс топилмади.", ru: "Урок не найден." },
  // Purchases
  "Payments are not configured": { uz: "Onlayn to'lov hozircha ulanmagan. Kursni sotib olish uchun administrator bilan bog'laning.", uz_cyrl: "Онлайн тўлов ҳозирча уланмаган. Курсни сотиб олиш учун администратор билан боғланинг.", ru: "Онлайн-оплата пока не подключена. Для покупки курса свяжитесь с администратором." },
  "You already have active access to this course": { uz: "Bu kurs sizda allaqachon bor.", uz_cyrl: "Бу курс сизда аллақачон бор.", ru: "Этот курс у вас уже есть." },
  "This package has no active price": { uz: "Bu paketning narxi hozircha belgilanmagan.", uz_cyrl: "Бу пакетнинг нархи ҳозирча белгиланмаган.", ru: "Для этого пакета пока не задана цена." },
  "Package not found": { uz: "Paket topilmadi.", uz_cyrl: "Пакет топилмади.", ru: "Пакет не найден." },
  "Coupon redemption limit reached": { uz: "Bu promo-kod limiti tugagan.", uz_cyrl: "Бу промо-код лимити тугаган.", ru: "Лимит этого промокода исчерпан." },
  "Coupon not found": { uz: "Promo-kod topilmadi.", uz_cyrl: "Промо-код топилмади.", ru: "Промокод не найден." },
  "Order not found": { uz: "Buyurtma topilmadi.", uz_cyrl: "Буюртма топилмади.", ru: "Заказ не найден." },
};

const BY_STATUS: Record<number, Tr> = {
  0: { uz: "Server bilan aloqa yo'q. Internetni tekshirib, qayta urinib ko'ring.", uz_cyrl: "Сервер билан алоқа йўқ. Интернетни текшириб, қайта уриниб кўринг.", ru: "Нет связи с сервером. Проверьте интернет и попробуйте снова." },
  429: { uz: "Juda ko'p so'rov. Birozdan keyin qayta urinib ko'ring.", uz_cyrl: "Жуда кўп сўров. Бироздан кейин қайта уриниб кўринг.", ru: "Слишком много запросов. Попробуйте позже." },
  500: { uz: "Serverda xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.", uz_cyrl: "Серверда хатолик юз берди. Бироздан кейин қайта уриниб кўринг.", ru: "Ошибка на сервере. Попробуйте позже." },
};

const pick = (t: Tr): string => {
  const lang = i18n.language;
  return lang === "ru" ? t.ru : lang === "uz_cyrl" ? t.uz_cyrl : t.uz;
};

/** User-facing text for an API error: known message → translated; network/5xx/429 → plain; else as sent. */
export function localizeServerError(message: string, status: number): string {
  const known = MESSAGES[message.trim()];
  if (known) return pick(known);
  if (status === 0) return pick(BY_STATUS[0]);
  if (status === 429) return pick(BY_STATUS[429]);
  if (status >= 500) return pick(BY_STATUS[500]);
  return message;
}
