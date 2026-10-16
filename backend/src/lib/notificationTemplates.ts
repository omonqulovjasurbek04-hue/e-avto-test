import type { Language } from "./languages";

/**
 * Notice kinds whose subject (in-app title + e-mail subject) and body the admin may rewrite per language.
 * `placeholders` are the only {tokens} a text may use; `required` must appear somewhere in subject or body.
 * The built-in texts are used whenever the admin has not saved a version for that kind and language.
 */
export const TEMPLATE_DEFS = {
  // {amount} is whole so'm (the database keeps tiyin).
  PAYMENT_PAID: { placeholders: ["name", "amount"], required: [] },
  ATTENDANCE_ABSENT: { placeholders: ["name", "group", "date"], required: [] },
  SCHEDULE_NEW: { placeholders: ["name", "group", "count"], required: [] },
  SCHEDULE_CHANGED: { placeholders: ["name", "group", "date"], required: [] },
  SCHEDULE_CANCELLED: { placeholders: ["name", "group", "date"], required: [] },
  TEST_PASSED: { placeholders: ["name", "score", "correct", "total"], required: [] },
  TEST_FAILED: { placeholders: ["name", "score", "correct", "total"], required: [] },
  // The staff-written announcement must reach the reader, so its text cannot be dropped.
  ANNOUNCEMENT: { placeholders: ["name", "title", "body"], required: ["body"] },
} as const satisfies Record<string, { placeholders: readonly string[]; required: readonly string[] }>;

export type TemplateKey = keyof typeof TEMPLATE_DEFS;
export const TEMPLATE_KEYS = Object.keys(TEMPLATE_DEFS) as TemplateKey[];
export type TemplateText = { subject: string; body: string };

export const BUILTIN_TEMPLATES: Record<TemplateKey, Record<Language, TemplateText>> = {
  PAYMENT_PAID: {
    uz: { subject: "To'lov qabul qilindi", body: "{amount} so'm to'lov qabul qilindi. Kursga kirish huquqi ochildi." },
    uz_cyrl: { subject: "Тўлов қабул қилинди", body: "{amount} сўм тўлов қабул қилинди. Курсга кириш ҳуқуқи очилди." },
    ru: { subject: "Оплата получена", body: "Оплата {amount} сум получена. Доступ к курсу открыт." },
  },
  ATTENDANCE_ABSENT: {
    uz: { subject: "Darsda qatnashmadingiz", body: "\"{group}\" guruhi, {date} dars. Davomat bo'limini tekshiring." },
    uz_cyrl: { subject: "Дарсда қатнашмадингиз", body: "\"{group}\" гуруҳи, {date} дарс. Давомат бўлимини текширинг." },
    ru: { subject: "Вы пропустили занятие", body: "Группа \"{group}\", занятие {date}. Проверьте раздел «Посещаемость»." },
  },
  SCHEDULE_NEW: {
    uz: { subject: "Yangi dars jadvali", body: "\"{group}\" guruhi uchun {count} ta dars qo'shildi. Jadval bo'limini tekshiring." },
    uz_cyrl: { subject: "Янги дарс жадвали", body: "\"{group}\" гуруҳи учун {count} та дарс қўшилди. Жадвал бўлимини текширинг." },
    ru: { subject: "Новое расписание", body: "Для группы \"{group}\" добавлено занятий: {count}. Проверьте раздел «Расписание»." },
  },
  SCHEDULE_CHANGED: {
    uz: { subject: "Dars ma'lumotlari o'zgardi", body: "\"{group}\" guruhi, {date} dars. Jadval bo'limida yangi ma'lumotni ko'ring." },
    uz_cyrl: { subject: "Дарс маълумотлари ўзгарди", body: "\"{group}\" гуруҳи, {date} дарс. Жадвал бўлимида янги маълумотни кўринг." },
    ru: { subject: "Изменения в занятии", body: "Группа \"{group}\", занятие {date}. Новые данные — в разделе «Расписание»." },
  },
  SCHEDULE_CANCELLED: {
    uz: { subject: "Dars bekor qilindi", body: "\"{group}\" guruhi, {date} dars bekor qilindi. Jadval bo'limini tekshiring." },
    uz_cyrl: { subject: "Дарс бекор қилинди", body: "\"{group}\" гуруҳи, {date} дарс бекор қилинди. Жадвал бўлимини текширинг." },
    ru: { subject: "Занятие отменено", body: "Группа \"{group}\": занятие {date} отменено. Проверьте раздел «Расписание»." },
  },
  TEST_PASSED: {
    uz: { subject: "Test muvaffaqiyatli topshirildi", body: "Natija: {score}% ({correct}/{total}). Tahlilni Tarix bo'limida ko'ring." },
    uz_cyrl: { subject: "Тест муваффақиятли топширилди", body: "Натижа: {score}% ({correct}/{total}). Таҳлилни Тарих бўлимида кўринг." },
    ru: { subject: "Тест успешно сдан", body: "Результат: {score}% ({correct}/{total}). Разбор — в разделе «История»." },
  },
  TEST_FAILED: {
    uz: { subject: "Test yakunlandi: o'tish bali yetmadi", body: "Natija: {score}% ({correct}/{total}). Tahlilni Tarix bo'limida ko'ring." },
    uz_cyrl: { subject: "Тест якунланди: ўтиш бали етмади", body: "Натижа: {score}% ({correct}/{total}). Таҳлилни Тарих бўлимида кўринг." },
    ru: { subject: "Тест завершён: проходной балл не набран", body: "Результат: {score}% ({correct}/{total}). Разбор — в разделе «История»." },
  },
  ANNOUNCEMENT: {
    uz: { subject: "{title}", body: "{body}" },
    uz_cyrl: { subject: "{title}", body: "{body}" },
    ru: { subject: "{title}", body: "{body}" },
  },
};

export const isTemplateKey = (v: string): v is TemplateKey => Object.prototype.hasOwnProperty.call(TEMPLATE_DEFS, v);

const TOKEN = /\{([a-zA-Z]+)\}/g;

/** Problems with an admin-written text, or [] when it is fine. A stray brace usually means a typo in a placeholder. */
export const validateTemplate = (key: TemplateKey, text: TemplateText): string[] => {
  const { placeholders, required } = TEMPLATE_DEFS[key];
  const allowed = new Set<string>(placeholders);
  const errors: string[] = [];
  for (const [field, value] of Object.entries(text)) {
    for (const [, name] of value.matchAll(TOKEN)) {
      if (!allowed.has(name)) errors.push(`${field}: unknown placeholder {${name}}; allowed: ${placeholders.map((p) => `{${p}}`).join(", ")}`);
    }
    if (/[{}]/.test(value.replace(TOKEN, ""))) errors.push(`${field}: unmatched "{" or "}"`);
  }
  for (const name of required) {
    if (!`${text.subject} ${text.body}`.includes(`{${name}}`)) errors.push(`{${name}} is required`);
  }
  return errors;
};

export type TemplateVars = Record<string, string | number | Date | null | undefined>;

/** Numbers and dates look the same in all three languages here: 120 000 and 07.12.2026, 10:00 (Tashkent time). */
const formatValue = (v: string | number | Date | null | undefined): string => {
  if (v == null) return "";
  if (v instanceof Date) {
    return v.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  }
  // Plain spaces: mail clients render the narrow no-break space inconsistently.
  if (typeof v === "number") return v.toLocaleString("ru-RU").replace(/\s/g, " ");
  return v;
};

/** Fills {tokens} in one pass (values are never re-scanned); unknown tokens are left as they are. */
export const renderTemplate = (text: TemplateText, vars: TemplateVars): TemplateText => {
  const fill = (s: string) => s.replace(TOKEN, (whole, name: string) => (name in vars ? formatValue(vars[name]) : whole));
  return { subject: fill(text.subject), body: fill(text.body) };
};
