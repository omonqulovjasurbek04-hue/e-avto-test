/**
 * "Platformadan foydalanish": short, always-open guides about the site itself (not course lessons).
 * Shown on the dashboard; each opens at /guide/:slug inside the student panel.
 */
export type GuideLang = "uz" | "uz_cyrl" | "ru";
export type GuideIcon = "welcome" | "buy" | "lessons" | "tests" | "rating" | "telegram";

interface GuideText {
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
  action: string;
}

export interface Guide {
  slug: string;
  icon: GuideIcon;
  minutes: number;
  /** Where the "go there" button leads. */
  to: string;
  text: Record<GuideLang, GuideText>;
}

export const GUIDES: Guide[] = [
  {
    slug: "welcome",
    icon: "welcome",
    minutes: 2,
    to: "/dashboard",
    text: {
      uz: {
        title: "E-Avto Test bilan tanishuv",
        summary: "Platforma nima beradi va qayerdan boshlash kerak.",
        steps: [
          "E-Avto Test — haydovchilik nazariyasi bo'yicha onlayn ta'lim: kurslar, video darslar, testlar va reyting bitta joyda.",
          "Chap menyuda: Dashboard (umumiy holat), Kurslar (katalog va narxlar), Darslar, Testlar va Reyting.",
          "Yuqoridagi \"student0001\" — sizning shaxsiy o'quvchi raqamingiz. Murojaat qilganda shu raqamni ayting.",
          "Profil tugmasi orqali bildirishnomalar, buyurtmalar va profil sozlamalariga o'tasiz.",
        ],
        tip: "Boshlash uchun avval kursni tanlang: darslar va testlar kurs sotib olingandan keyin ochiladi.",
        action: "Dashboard'ga qaytish",
      },
      uz_cyrl: {
        title: "E-Avto Test билан танишув",
        summary: "Платформа нима беради ва қаердан бошлаш керак.",
        steps: [
          "E-Avto Test — ҳайдовчилик назарияси бўйича онлайн таълим: курслар, видео дарслар, тестлар ва рейтинг битта жойда.",
          "Чап менюда: Dashboard (умумий ҳолат), Курслар (каталог ва нархлар), Дарслар, Тестлар ва Рейтинг.",
          "Юқоридаги \"student0001\" — сизнинг шахсий ўқувчи рақамингиз. Мурожаат қилганда шу рақамни айтинг.",
          "Профил тугмаси орқали билдиришномалар, буюртмалар ва профил созламаларига ўтасиз.",
        ],
        tip: "Бошлаш учун аввал курсни танланг: дарслар ва тестлар курс сотиб олингандан кейин очилади.",
        action: "Dashboard'га қайтиш",
      },
      ru: {
        title: "Знакомство с E-Avto Test",
        summary: "Что даёт платформа и с чего начать.",
        steps: [
          "E-Avto Test — онлайн-обучение теории вождения: курсы, видеоуроки, тесты и рейтинг в одном месте.",
          "В меню слева: Dashboard (общая картина), Курсы (каталог и цены), Уроки, Тесты и Рейтинг.",
          "«student0001» вверху — ваш личный номер ученика. Называйте его при обращении в поддержку.",
          "Через кнопку профиля открываются уведомления, заказы и настройки профиля.",
        ],
        tip: "Начните с выбора курса: уроки и тесты открываются после покупки курса.",
        action: "Вернуться на Dashboard",
      },
    },
  },
  {
    slug: "buy-course",
    icon: "buy",
    minutes: 2,
    to: "/my-courses",
    text: {
      uz: {
        title: "Kursni qanday sotib olaman?",
        summary: "Kurs tanlash, paket va to'lov — qadamma-qadam.",
        steps: [
          "Chap menyudan \"Kurslar\"ni oching va kerakli toifani (masalan, B toifa) tanlang.",
          "Kurs sahifasida \"Narxlar va paketlar\" bo'limida paketni ko'ring: narx va necha kunlik kirish.",
          "\"Sotib olish\"ni bosing. Promokodingiz bo'lsa, kiritib \"Qo'llash\"ni bosing — chegirma darhol hisoblanadi.",
          "\"Buyurtma berish\"dan keyin to'lov sahifasiga o'tasiz. To'lov holatini profil menyusidagi \"Buyurtmalar\"da kuzatasiz.",
          "To'lov tasdiqlangach, kurs \"Sotib olingan\" bo'ladi va darslar ochila boshlaydi.",
        ],
        tip: "Yakuniy narxni har doim server hisoblaydi — sahifada ko'rgan narxingiz buyurtmada ham bir xil bo'ladi.",
        action: "Kurslarga o'tish",
      },
      uz_cyrl: {
        title: "Курсни қандай сотиб оламан?",
        summary: "Курс танлаш, пакет ва тўлов — қадамма-қадам.",
        steps: [
          "Чап менюдан \"Курслар\"ни очинг ва керакли тоифани (масалан, B тоифа) танланг.",
          "Курс саҳифасида \"Нархлар ва пакетлар\" бўлимида пакетни кўринг: нарх ва неча кунлик кириш.",
          "\"Сотиб олиш\"ни босинг. Промокодингиз бўлса, киритиб \"Қўллаш\"ни босинг — чегирма дарҳол ҳисобланади.",
          "\"Буюртма бериш\"дан кейин тўлов саҳифасига ўтасиз. Тўлов ҳолатини профил менюсидаги \"Буюртмалар\"да кузатасиз.",
          "Тўлов тасдиқлангач, курс \"Сотиб олинган\" бўлади ва дарслар очила бошлайди.",
        ],
        tip: "Якуний нархни ҳар доим сервер ҳисоблайди — саҳифада кўрган нархингиз буюртмада ҳам бир хил бўлади.",
        action: "Курсларга ўтиш",
      },
      ru: {
        title: "Как купить курс?",
        summary: "Выбор курса, пакет и оплата — по шагам.",
        steps: [
          "Откройте «Курсы» в меню слева и выберите нужную категорию (например, B).",
          "На странице курса в разделе «Цены и пакеты» смотрите пакет: цену и срок доступа.",
          "Нажмите «Купить». Если есть промокод — введите его и нажмите «Применить», скидка посчитается сразу.",
          "После «Оформить заказ» откроется страница оплаты. Статус оплаты — в «Заказах» в меню профиля.",
          "Когда оплата подтверждена, курс становится «Куплен» и уроки начинают открываться.",
        ],
        tip: "Итоговую цену всегда считает сервер — цена на странице совпадёт с ценой в заказе.",
        action: "Перейти к курсам",
      },
    },
  },
  {
    slug: "lessons",
    icon: "lessons",
    minutes: 2,
    to: "/lessons",
    text: {
      uz: {
        title: "Darslar qanday ochiladi?",
        summary: "Darslar bir yo'la emas, bosqichma-bosqich ochiladi.",
        steps: [
          "Auditoriyada (guruhda) o'qisangiz: har bir qatnashgan mashg'ulotingiz navbatdagi darsni ochadi.",
          "Masofaviy o'qisangiz: kurs sotib olingan kuni 2 ta dars ochiladi, keyin har 3 kunda yana 2 tadan.",
          "Yopiq dars yonida qachon ochilishi yozilgan bo'ladi, masalan \"21-oktabr ochiladi\".",
          "Ochiq darsda video va matnni o'qing; dars oxirida shu darsning testini topshirishingiz mumkin.",
        ],
        tip: "Darsni oxirigacha ko'rsangiz, u \"tugallangan\" deb belgilanadi va Dashboard'dagi progressga qo'shiladi.",
        action: "Darslarga o'tish",
      },
      uz_cyrl: {
        title: "Дарслар қандай очилади?",
        summary: "Дарслар бир йўла эмас, босқичма-босқич очилади.",
        steps: [
          "Аудиторияда (гуруҳда) ўқисангиз: ҳар бир қатнашган машғулотингиз навбатдаги дарсни очади.",
          "Масофавий ўқисангиз: курс сотиб олинган куни 2 та дарс очилади, кейин ҳар 3 кунда яна 2 тадан.",
          "Ёпиқ дарс ёнида қачон очилиши ёзилган бўлади, масалан \"21-октябр очилади\".",
          "Очиқ дарсда видео ва матнни ўқинг; дарс охирида шу дарснинг тестини топширишингиз мумкин.",
        ],
        tip: "Дарсни охиригача кўрсангиз, у \"тугалланган\" деб белгиланади ва Dashboard'даги прогрессга қўшилади.",
        action: "Дарсларга ўтиш",
      },
      ru: {
        title: "Как открываются уроки?",
        summary: "Уроки открываются не сразу, а постепенно.",
        steps: [
          "Если учитесь в группе (очно): каждое посещённое занятие открывает следующий урок.",
          "Если учитесь дистанционно: в день покупки открываются 2 урока, затем ещё по 2 каждые 3 дня.",
          "У закрытого урока указано, когда он откроется, например «откроется 21 октября».",
          "В открытом уроке смотрите видео и читайте текст; в конце можно пройти тест по уроку.",
        ],
        tip: "Досмотренный урок отмечается как «пройден» и попадает в прогресс на Dashboard.",
        action: "Перейти к урокам",
      },
    },
  },
  {
    slug: "tests",
    icon: "tests",
    minutes: 2,
    to: "/tests",
    text: {
      uz: {
        title: "Testlar va natijalar",
        summary: "Test topshirish, vaqt va natijani ko'rish.",
        steps: [
          "\"Testlar\" bo'limida sotib olingan kursingiz uchun \"Testni boshlash\"ni bosing.",
          "Savollar har urinishda aralashtirib beriladi; vaqt va savollar soni yuqorida ko'rinadi.",
          "Javobni tanlab keyingi savolga o'ting; oxirida \"Tugatish\"ni bosing.",
          "Natija darhol chiqadi: to'g'ri javoblar foizi va o'tdingizmi-yo'qmi.",
          "Barcha oldingi natijalar \"Testlar\" sahifasining pastida — bosib, xatolaringizni tahlil qiling.",
        ],
        tip: "Test faqat ochiq darslarning savollaridan tuziladi — darslarni o'qib borganingiz sari testlar boyib boradi.",
        action: "Testlarga o'tish",
      },
      uz_cyrl: {
        title: "Тестлар ва натижалар",
        summary: "Тест топшириш, вақт ва натижани кўриш.",
        steps: [
          "\"Тестлар\" бўлимида сотиб олинган курсингиз учун \"Тестни бошлаш\"ни босинг.",
          "Саволлар ҳар уринишда аралаштириб берилади; вақт ва саволлар сони юқорида кўринади.",
          "Жавобни танлаб кейинги саволга ўтинг; охирида \"Тугатиш\"ни босинг.",
          "Натижа дарҳол чиқади: тўғри жавоблар фоизи ва ўтдингизми-йўқми.",
          "Барча олдинги натижалар \"Тестлар\" саҳифасининг пастида — босиб, хатоларингизни таҳлил қилинг.",
        ],
        tip: "Тест фақат очиқ дарсларнинг саволларидан тузилади — дарсларни ўқиб борганингиз сари тестлар бойиб боради.",
        action: "Тестларга ўтиш",
      },
      ru: {
        title: "Тесты и результаты",
        summary: "Как пройти тест, время и результат.",
        steps: [
          "В разделе «Тесты» нажмите «Начать тест» у купленного курса.",
          "Вопросы перемешиваются при каждой попытке; время и число вопросов видны сверху.",
          "Выберите ответ и переходите к следующему вопросу; в конце нажмите «Завершить».",
          "Результат сразу: процент верных ответов и сдан ли тест.",
          "Все прошлые результаты — внизу страницы «Тесты»: откройте и разберите ошибки.",
        ],
        tip: "Тест собирается только из вопросов открытых уроков — чем больше уроков пройдено, тем богаче тесты.",
        action: "Перейти к тестам",
      },
    },
  },
  {
    slug: "rating",
    icon: "rating",
    minutes: 1,
    to: "/my-rating",
    text: {
      uz: {
        title: "Reyting va ballar",
        summary: "Ball qanday yig'iladi va reytingda qanday ko'rinasiz.",
        steps: [
          "Har bir to'g'ri javob ball beradi; testni 100% yoki birinchi urinishda topshirsangiz — qo'shimcha bonus.",
          "Bir kurs testini qayta topshirsangiz, faqat eng yaxshi natijangiz hisoblanadi.",
          "Reytingda ko'rinish ixtiyoriy: \"Reyting\" sahifasidagi tugma bilan yoqasiz yoki yashirasiz.",
          "Ro'yxatda faqat \"Ism F.\" ko'rinadi — telefon va boshqa ma'lumotlaringiz hech kimga ko'rsatilmaydi.",
        ],
        action: "Reytingga o'tish",
      },
      uz_cyrl: {
        title: "Рейтинг ва баллар",
        summary: "Балл қандай йиғилади ва рейтингда қандай кўринасиз.",
        steps: [
          "Ҳар бир тўғри жавоб балл беради; тестни 100% ёки биринчи уринишда топширсангиз — қўшимча бонус.",
          "Бир курс тестини қайта топширсангиз, фақат энг яхши натижангиз ҳисобланади.",
          "Рейтингда кўриниш ихтиёрий: \"Рейтинг\" саҳифасидаги тугма билан ёқасиз ёки яширасиз.",
          "Рўйхатда фақат \"Исм Ф.\" кўринади — телефон ва бошқа маълумотларингиз ҳеч кимга кўрсатилмайди.",
        ],
        action: "Рейтингга ўтиш",
      },
      ru: {
        title: "Рейтинг и баллы",
        summary: "Как начисляются баллы и как вы видны в рейтинге.",
        steps: [
          "Каждый верный ответ даёт баллы; за 100% или сдачу с первой попытки — бонус.",
          "При пересдаче теста курса учитывается только лучший результат.",
          "Участие в рейтинге по желанию: включается и скрывается кнопкой на странице «Рейтинг».",
          "В списке видно только «Имя Ф.» — телефон и другие данные никому не показываются.",
        ],
        action: "Перейти к рейтингу",
      },
    },
  },
  {
    slug: "telegram",
    icon: "telegram",
    minutes: 2,
    to: "/notifications",
    text: {
      uz: {
        title: "Telegram bot va bildirishnomalar",
        summary: "Kod bilan kirish va darsga kelmaganingizda eslatmalar.",
        steps: [
          "Kirish yoki ro'yxatdan o'tish: botni oching, Start bosing — bot 6 xonali kod beradi, uni saytga kiriting.",
          "Kod 5 daqiqa amal qiladi va faqat bir marta ishlaydi. Uni hech kimga bermang.",
          "Darsga kelmasangiz: saytdagi \"Bildirishnomalar\"ga xabar tushadi va bot Telegram'ga 3 marta eslatadi — darhol, 1 soatdan keyin va ertasi kuni.",
          "Bildirishnomani saytda o'qisangiz, qolgan eslatmalar yuborilmaydi.",
        ],
        tip: "Davomat xabarlarini profil sozlamalaridagi bildirishnoma sozlamalarida o'chirib qo'yishingiz mumkin.",
        action: "Bildirishnomalarni ochish",
      },
      uz_cyrl: {
        title: "Telegram бот ва билдиришномалар",
        summary: "Код билан кириш ва дарсга келмаганингизда эслатмалар.",
        steps: [
          "Кириш ёки рўйхатдан ўтиш: ботни очинг, Start босинг — бот 6 хонали код беради, уни сайтга киритинг.",
          "Код 5 дақиқа амал қилади ва фақат бир марта ишлайди. Уни ҳеч кимга берманг.",
          "Дарсга келмасангиз: сайтдаги \"Билдиришномалар\"га хабар тушади ва бот Telegram'га 3 марта эслатади — дарҳол, 1 соатдан кейин ва эртаси куни.",
          "Билдиришномани сайтда ўқисангиз, қолган эслатмалар юборилмайди.",
        ],
        tip: "Давомат хабарларини профил созламаларидаги билдиришнома созламаларида ўчириб қўйишингиз мумкин.",
        action: "Билдиришномаларни очиш",
      },
      ru: {
        title: "Telegram-бот и уведомления",
        summary: "Вход по коду и напоминания при пропуске занятия.",
        steps: [
          "Вход или регистрация: откройте бота, нажмите Start — бот даст 6-значный код, введите его на сайте.",
          "Код действует 5 минут и только один раз. Никому его не сообщайте.",
          "Если вы пропустили занятие: на сайте придёт уведомление, а бот напомнит в Telegram 3 раза — сразу, через час и на следующий день.",
          "Если прочитать уведомление на сайте, остальные напоминания не придут.",
        ],
        tip: "Уведомления о посещаемости можно отключить в настройках уведомлений профиля.",
        action: "Открыть уведомления",
      },
    },
  },
];

/** The guide text in the UI language (Latin Uzbek when the language is unknown). */
export const guideText = (g: Guide, lang: string): GuideText => g.text[(["uz", "uz_cyrl", "ru"] as const).find((l) => l === lang) ?? "uz"];
