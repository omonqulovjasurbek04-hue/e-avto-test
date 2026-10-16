import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { pageSchema, siteSettingsSchema } from "../src/validators/cms";
import { normalizeLanguage, requestLanguage } from "../src/lib/languages";
import { BUILTIN_TEMPLATES, renderTemplate, validateTemplate } from "../src/lib/notificationTemplates";

// SMTP is replaced by a fake: no real mail is ever sent from tests.
const mail = vi.hoisted(() => ({ send: vi.fn(async (_m: { to: string; subject: string; text: string }) => true) }));
vi.mock("../src/services/mail.service", () => ({ isMailConfigured: () => true, sendMail: mail.send }));

describe("languages and templates (unit)", () => {
  it("reads the visitor language from ?lang, then Accept-Language, else uz", () => {
    expect(requestLanguage({ query: { lang: "ru" }, headers: { "accept-language": "uz" } })).toBe("ru");
    expect(requestLanguage({ query: {}, headers: { "accept-language": "uz-Cyrl,ru;q=0.8" } })).toBe("uz_cyrl");
    expect(requestLanguage({ query: {}, headers: { "accept-language": "en-US,ru-RU;q=0.7" } })).toBe("ru");
    expect(requestLanguage({ query: { lang: "xx" }, headers: { "accept-language": "de" } })).toBe("uz");
    expect(normalizeLanguage("uz-Latn")).toBe("uz");
  });

  it("accepts translations only for the other languages and known fields", () => {
    expect(pageSchema.safeParse({ title: "Sahifa", content: "x", translations: { ru: { title: "Страница" } } }).success).toBe(true);
    expect(pageSchema.safeParse({ title: "Sahifa", content: "x", translations: { en: { title: "Page" } } }).success).toBe(false);
    expect(pageSchema.safeParse({ title: "Sahifa", content: "x", translations: { ru: { isAdmin: true } } }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ translations: { ru: { logoUrl: "/x.png" } } }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ translations: { ru: { heroTitle: "Привет" }, uz_cyrl: null } }).success).toBe(true);
  });

  it("rejects unknown placeholders, stray braces and a missing required one", () => {
    expect(validateTemplate("PAYMENT_PAID", { subject: "To'lov", body: "{amount} so'm" })).toEqual([]);
    expect(validateTemplate("PAYMENT_PAID", { subject: "To'lov", body: "{sum} so'm" }).join()).toMatch(/unknown placeholder \{sum\}/);
    expect(validateTemplate("PAYMENT_PAID", { subject: "To'lov {name", body: "ok" }).join()).toMatch(/unmatched/);
    expect(validateTemplate("ANNOUNCEMENT", { subject: "{title}", body: "Diqqat" }).join()).toMatch(/\{body\} is required/);
  });

  it("every built-in text passes its own validation and renders without leftover tokens", () => {
    for (const [key, langs] of Object.entries(BUILTIN_TEMPLATES)) {
      for (const text of Object.values(langs)) {
        expect(validateTemplate(key as keyof typeof BUILTIN_TEMPLATES, text)).toEqual([]);
        const out = renderTemplate(text, { name: "Ali", amount: 120000, group: "G1", date: new Date("2026-12-07T05:00:00Z"), count: 3, score: 90, correct: 18, total: 20, title: "T", body: "B" });
        expect(`${out.subject} ${out.body}`).not.toMatch(/[{}]/);
      }
    }
    expect(renderTemplate({ subject: "s", body: "{amount} | {date}" }, { amount: 120000, date: new Date("2026-12-07T05:00:00Z") }).body).toBe("120 000 | 07.12.2026, 10:00");
  });
});

// Integration: needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `l${Date.now()}`;

describe.skipIf(!enabled)("multilingual CMS and notification templates", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let svc: typeof import("../src/services/notification.service");
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });
  let savedSettings: { key: string; value: unknown }[] = [];
  let savedTemplates: { key: string; language: string; subject: string; body: string }[] = [];

  const signup = async (k: string, role?: "ADMIN" | "MODERATOR") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run}-${k}`, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    tok[k] = res.body.data.token;
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    svc = await import("../src/services/notification.service");
    // Settings and templates are global: remember them and put them back afterwards.
    savedSettings = await prisma.siteSetting.findMany({ select: { key: true, value: true } });
    savedTemplates = await prisma.notificationTemplate.findMany({ select: { key: true, language: true, subject: true, body: true } });
    await prisma.notificationTemplate.deleteMany({});
    await signup("admin", "ADMIN");
    await signup("moderator", "MODERATOR");
    for (const k of ["uzUser", "ruUser", "cyrlUser"]) await signup(k);
  });

  beforeEach(() => {
    mail.send.mockReset();
    mail.send.mockResolvedValue(true);
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.page.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.newsArticle.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.faqItem.deleteMany({ where: { question: { startsWith: run } } });
    await prisma.notificationTemplate.deleteMany({});
    for (const t of savedTemplates) await prisma.notificationTemplate.create({ data: t });
    await prisma.siteSetting.deleteMany({});
    for (const s of savedSettings) await prisma.siteSetting.create({ data: { key: s.key, value: s.value as never } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("serves a page in the visitor's language, falls back to uz per field and sanitizes every version", async () => {
    const created = await request(app).post("/api/admin/cms/pages").set(bearer("admin")).send({
      slug: `${run}-about`, title: "Biz haqimizda", content: "<p>Salom</p>", seoTitle: "SEO uz", status: "PUBLISHED",
      translations: {
        ru: { title: "О нас", content: "<p>Привет</p><script>alert(1)</script><img src=x onerror=alert(1)>", seoTitle: "" },
        uz_cyrl: { title: "Биз ҳақимизда <b>!</b>" },
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.data.translations.ru.content).not.toMatch(/script|onerror/);
    expect(created.body.data.translations.ru.seoTitle).toBeUndefined(); // empty = not translated
    expect(created.body.data.translations.uz_cyrl.title).toBe("Биз ҳақимизда !");

    const ru = await request(app).get(`/api/pages/${run}-about`).set("Accept-Language", "ru-RU,ru;q=0.9");
    expect(ru.body.data).toMatchObject({ title: "О нас", seoTitle: "SEO uz" });
    expect(ru.body.data.content).toContain("Привет");
    expect(ru.body.data.translations).toBeUndefined();
    expect(ru.headers.vary).toMatch(/Accept-Language/i);

    const cyrl = await request(app).get(`/api/pages/${run}-about?lang=uz_cyrl`);
    expect(cyrl.body.data).toMatchObject({ title: "Биз ҳақимизда !", content: "<p>Salom</p>" });
    expect((await request(app).get(`/api/pages/${run}-about`)).body.data.title).toBe("Biz haqimizda");

    // Updating one language keeps the other; null removes a language.
    const id = created.body.data.id;
    await request(app).put(`/api/admin/cms/pages/${id}`).set(bearer("admin")).send({ translations: { ru: { title: "О компании", content: "<p>Новое</p>" } } }).expect(200);
    let row = await prisma.page.findUniqueOrThrow({ where: { id } });
    expect(row.translations).toMatchObject({ ru: { title: "О компании" }, uz_cyrl: { title: "Биз ҳақимизда !" } });
    await request(app).put(`/api/admin/cms/pages/${id}`).set(bearer("admin")).send({ translations: { uz_cyrl: null } }).expect(200);
    row = await prisma.page.findUniqueOrThrow({ where: { id } });
    expect(row.translations).toEqual({ ru: { title: "О компании", content: "<p>Новое</p>" } });
    expect(row.title).toBe("Biz haqimizda");

    // Draft/published is shared: a draft is hidden in every language.
    await request(app).put(`/api/admin/cms/pages/${id}`).set(bearer("admin")).send({ status: "DRAFT" }).expect(200);
    for (const lang of ["uz", "ru", "uz_cyrl"]) expect((await request(app).get(`/api/pages/${run}-about?lang=${lang}`)).status).toBe(404);
  });

  it("rows written before translations existed are the uz version for everyone", async () => {
    // Same shape as a migrated row: only the uz columns, translations at the column default.
    await prisma.page.create({ data: { slug: `${run}-old`, title: "Eski sahifa", content: "<p>uz</p>", status: "PUBLISHED" } });
    for (const lang of ["ru", "uz_cyrl"]) {
      expect((await request(app).get(`/api/pages/${run}-old?lang=${lang}`)).body.data).toMatchObject({ title: "Eski sahifa", content: "<p>uz</p>" });
    }
  });

  it("localizes the news feed, an article and the FAQ", async () => {
    const news = await request(app).post("/api/admin/cms/news").set(bearer("admin")).send({
      slug: `${run}-news`, title: "Yangilik", summary: "Qisqa", content: "<p>Matn</p>", status: "PUBLISHED",
      translations: { ru: { title: "Новость", summary: "Кратко" } },
    });
    expect(news.status).toBe(201);
    const feed = await request(app).get("/api/news?limit=50").set("Accept-Language", "ru");
    expect(feed.body.data.find((n: { slug: string }) => n.slug === `${run}-news`)).toMatchObject({ title: "Новость", summary: "Кратко" });
    expect((await request(app).get(`/api/news/${run}-news?lang=ru`)).body.data).toMatchObject({ title: "Новость", content: "<p>Matn</p>" });

    const faq = await request(app).post("/api/admin/cms/faq").set(bearer("admin")).send({
      question: `${run} Narxi qancha?`, answer: "<p>Arzon</p>", translations: { ru: { question: "Сколько стоит?", answer: "<p>Дёшево</p><iframe src=x></iframe>" } },
    });
    expect(faq.status).toBe(201);
    const list = await request(app).get("/api/faq?lang=ru");
    const item = list.body.data.find((f: { id: string }) => f.id === faq.body.data.id);
    expect(item).toEqual({ id: faq.body.data.id, question: "Сколько стоит?", answer: "<p>Дёшево</p>" });
    // Editing only the published flag keeps the translation.
    await request(app).put(`/api/admin/cms/faq/${faq.body.data.id}`).set(bearer("admin")).send({ isPublished: false }).expect(200);
    expect((await prisma.faqItem.findUniqueOrThrow({ where: { id: faq.body.data.id } })).translations).toMatchObject({ ru: { question: "Сколько стоит?" } });
    expect((await request(app).get("/api/faq?lang=ru")).body.data.some((f: { id: string }) => f.id === faq.body.data.id)).toBe(false);
  });

  it("site settings: per-language texts with uz fallback; shared fields stay shared", async () => {
    const saved = await request(app).put("/api/admin/cms/site-settings").set(bearer("admin")).send({
      heroTitle: "Haydovchilik nazariyasi", phone: "+998 90 000 00 00",
      translations: { ru: { heroTitle: "Теория вождения <i>онлайн</i>" }, uz_cyrl: { heroTitle: "Ҳайдовчилик назарияси" } },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.translations.ru.heroTitle).toBe("Теория вождения онлайн");

    const ru = (await request(app).get("/api/site-settings").set("Accept-Language", "ru")).body.data;
    expect(ru).toMatchObject({ heroTitle: "Теория вождения онлайн", phone: "+998 90 000 00 00" });
    expect(ru.i18n).toBeUndefined();
    expect(ru.translations).toBeUndefined();
    expect((await request(app).get("/api/site-settings?lang=uz_cyrl")).body.data.heroTitle).toBe("Ҳайдовчилик назарияси");
    expect((await request(app).get("/api/site-settings")).body.data.heroTitle).toBe("Haydovchilik nazariyasi");

    const admin = await request(app).get("/api/admin/cms/site-settings").set(bearer("admin"));
    expect(admin.body.data).toMatchObject({ heroTitle: "Haydovchilik nazariyasi", translations: { ru: { heroTitle: "Теория вождения онлайн" } } });

    // Removing the ru text brings back the uz one for ru visitors.
    await request(app).put("/api/admin/cms/site-settings").set(bearer("admin")).send({ translations: { ru: { heroTitle: "" } } }).expect(200);
    expect((await request(app).get("/api/site-settings?lang=ru")).body.data.heroTitle).toBe("Haydovchilik nazariyasi");
  });

  it("notification templates: only settings managers edit them, placeholders are validated", async () => {
    expect((await request(app).get("/api/admin/cms/notification-templates").set(bearer("moderator"))).status).toBe(403);
    expect((await request(app).put("/api/admin/cms/notification-templates/PAYMENT_PAID/ru").set(bearer("uzUser")).send({ subject: "x", body: "y" })).status).toBe(403);

    const list = await request(app).get("/api/admin/cms/notification-templates").set(bearer("admin"));
    expect(list.status).toBe(200);
    const payment = list.body.data.find((t: { key: string }) => t.key === "PAYMENT_PAID");
    expect(payment.placeholders).toEqual(["name", "amount"]);
    expect(payment.languages.ru).toMatchObject({ custom: false, subject: BUILTIN_TEMPLATES.PAYMENT_PAID.ru.subject });

    const bad = await request(app).put("/api/admin/cms/notification-templates/PAYMENT_PAID/ru").set(bearer("admin")).send({ subject: "Оплата", body: "Сумма {summa}" });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toMatch(/\{summa\}/);
    expect((await request(app).put("/api/admin/cms/notification-templates/NOPE/ru").set(bearer("admin")).send({ subject: "a", body: "b" })).status).toBe(422);
    expect((await request(app).put("/api/admin/cms/notification-templates/PAYMENT_PAID/en").set(bearer("admin")).send({ subject: "a", body: "b" })).status).toBe(422);
    expect((await request(app).put("/api/admin/cms/notification-templates/ANNOUNCEMENT/uz").set(bearer("admin")).send({ subject: "{title}", body: "Diqqat!" })).status).toBe(400);

    const ok = await request(app).put("/api/admin/cms/notification-templates/PAYMENT_PAID/ru").set(bearer("admin")).send({ subject: "{name}, оплата\r\nBcc: x@evil", body: "Получено {amount} сум. Спасибо!" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.subject).toBe("{name}, оплата Bcc: x@evil"); // one line: no header injection
    expect(await prisma.auditLog.count({ where: { action: "notification.template.save", entityId: "PAYMENT_PAID:ru" } })).toBeGreaterThan(0);
  });

  it("renders the notice in the recipient's language: custom text, else the built-in one", async () => {
    expect((await request(app).put("/api/me/notification-preferences").set(bearer("ruUser")).send({ language: "ru" })).body.data.language).toBe("ru");
    expect((await request(app).put("/api/me/notification-preferences").set(bearer("cyrlUser")).send({ language: "uz_cyrl" })).status).toBe(200);
    expect((await request(app).put("/api/me/notification-preferences").set(bearer("ruUser")).send({ language: "en" })).status).toBe(422);
    expect((await request(app).get("/api/me/notification-preferences").set(bearer("uzUser"))).body.data.language).toBe("uz");

    const send = async (k: string) => {
      const id = await svc.notify({ userId: uid[k], type: "PAYMENT_PAID", template: "PAYMENT_PAID", vars: { amount: 250000 }, dedupeKey: `${run}-pay`, email: true });
      expect(id).not.toBeNull();
      expect(await svc.deliverEmail(id!)).toBe("SENT");
      return prisma.notification.findUniqueOrThrow({ where: { id: id! } });
    };
    const ru = await send("ruUser");
    expect(ru).toMatchObject({ title: `${run}-ruUser, оплата Bcc: x@evil`, body: "Получено 250 000 сум. Спасибо!" });
    expect(mail.send.mock.calls.at(-1)![0]).toMatchObject({ to: `${run}-ruuser@example.com`, subject: `${run}-ruUser, оплата Bcc: x@evil` });
    expect(mail.send.mock.calls.at(-1)![0].text).toContain("Получено 250 000 сум.");

    expect(await send("cyrlUser")).toMatchObject({ title: BUILTIN_TEMPLATES.PAYMENT_PAID.uz_cyrl.subject, body: "250 000 сўм тўлов қабул қилинди. Курсга кириш ҳуқуқи очилди." });
    expect((await send("uzUser")).title).toBe(BUILTIN_TEMPLATES.PAYMENT_PAID.uz.subject);

    // Reset → built-in text again.
    const reset = await request(app).delete("/api/admin/cms/notification-templates/PAYMENT_PAID/ru").set(bearer("admin"));
    expect(reset.body.data.subject).toBe(BUILTIN_TEMPLATES.PAYMENT_PAID.ru.subject);
    const id = await svc.notify({ userId: uid.ruUser, type: "PAYMENT_PAID", template: "PAYMENT_PAID", vars: { amount: 1000 }, dedupeKey: `${run}-pay2` });
    expect(id).toBeNull(); // no e-mail asked
    expect((await prisma.notification.findUniqueOrThrow({ where: { userId_dedupeKey: { userId: uid.ruUser, dedupeKey: `${run}-pay2` } } })).title).toBe("Оплата получена");
  });

  it("announcements go through the ANNOUNCEMENT template of each reader's language", async () => {
    await request(app).put("/api/admin/cms/notification-templates/ANNOUNCEMENT/ru").set(bearer("admin")).send({ subject: "Объявление: {title}", body: "{name}, {body}" }).expect(200);
    const n = await svc.notify({ userId: uid.ruUser, type: "ANNOUNCEMENT", template: "ANNOUNCEMENT", vars: { title: "Imtihon", body: "ertaga {date} soat 9 da" }, dedupeKey: `${run}-ann` });
    expect(n).toBeNull();
    const ru = await prisma.notification.findUniqueOrThrow({ where: { userId_dedupeKey: { userId: uid.ruUser, dedupeKey: `${run}-ann` } } });
    // Staff text is inserted as is: its own {braces} are not treated as placeholders.
    expect(ru).toMatchObject({ title: "Объявление: Imtihon", body: `${run}-ruUser, ertaga {date} soat 9 da` });
    await svc.notify({ userId: uid.uzUser, type: "ANNOUNCEMENT", template: "ANNOUNCEMENT", vars: { title: "Imtihon", body: "ertaga" }, dedupeKey: `${run}-ann` });
    expect(await prisma.notification.findUniqueOrThrow({ where: { userId_dedupeKey: { userId: uid.uzUser, dedupeKey: `${run}-ann` } } })).toMatchObject({ title: "Imtihon", body: "ertaga" });
  });
});
