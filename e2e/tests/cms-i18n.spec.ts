import { expect, test } from "@playwright/test";
import { API } from "../playwright.config";
import { apiGet, apiLogin, loginViaUi, state } from "./helpers";

async function adminCall<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = await apiLogin(state().emails.admin);
  const res = await fetch(`${API}${url}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json()) as { data: T; message?: string };
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${json.message ?? ""}`);
  return json.data;
}

test.describe.serial("multilingual content and notification templates", () => {
  test("the admin writes a page in uz and ru; visitors get their language, uz_cyrl falls back to uz", async ({ page, browser }) => {
    const s = state();
    const slug = `til-${s.run}`;
    await loginViaUi(page, s.emails.admin);
    await page.goto("/admin/cms");
    await page.getByRole("button", { name: "Yangi sahifa" }).click();
    const dialog = page; // the modal has no dialog role; its labels are unique on the page
    await dialog.getByLabel("Sarlavha", { exact: true }).fill(`Til sahifasi ${s.run}`);
    await dialog.getByLabel(/^Slug/).fill(slug);
    await dialog.getByLabel(/^Matn/).fill("<p>O'zbekcha matn</p>");
    await dialog.getByLabel("Holat").selectOption("PUBLISHED");

    await dialog.getByRole("tab", { name: "Русский" }).click();
    await expect(dialog.getByText(/o'zbekcha \(lotin\) matn ko'rsatiladi/)).toBeVisible();
    await expect(dialog.getByLabel(/^Slug/)).toBeDisabled(); // one address for all languages
    await dialog.getByLabel("Sarlavha", { exact: true }).fill(`Языковая страница ${s.run}`);
    await dialog.getByLabel(/^Matn/).fill("<p>Русский текст</p><script>window.__xss=1</script>");
    // Switching tabs keeps what was typed in each language.
    await dialog.getByRole("tab", { name: "O'zbek" }).click();
    await expect(dialog.getByLabel("Sarlavha", { exact: true })).toHaveValue(`Til sahifasi ${s.run}`);
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByLabel("Holat")).toHaveCount(0);

    const row = page.getByRole("row", { name: new RegExp(`Til sahifasi ${s.run}`) });
    await expect(row.getByText("RU")).toHaveClass(/emerald/);
    await expect(row.getByText("ЎЗ")).not.toHaveClass(/emerald/);

    const visit = async (lang: string) => {
      const ctx = await browser.newContext();
      await ctx.addInitScript((l) => localStorage.setItem("i18nextLng", l), lang);
      const p = await ctx.newPage();
      await p.goto(`/p/${slug}`);
      return { p, ctx };
    };
    const ru = await visit("ru");
    await expect(ru.p.getByRole("heading", { name: `Языковая страница ${s.run}` })).toBeVisible();
    await expect(ru.p.getByText("Русский текст")).toBeVisible();
    expect(await ru.p.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await ru.ctx.close();

    const cyrl = await visit("uz_cyrl");
    await expect(cyrl.p.getByRole("heading", { name: `Til sahifasi ${s.run}` })).toBeVisible();
    await expect(cyrl.p.getByText("O'zbekcha matn")).toBeVisible();
    await cyrl.ctx.close();

    // Back to a draft: hidden in every language.
    const pages = await adminCall<{ id: string; slug: string }[]>("GET", "/admin/cms/pages");
    await adminCall("PUT", `/admin/cms/pages/${pages.find((x) => x.slug === slug)!.id}`, { status: "DRAFT" });
    for (const lang of ["uz", "ru"]) expect((await fetch(`${API}/pages/${slug}?lang=${lang}`)).status).toBe(404);
  });

  test("hero title per language from the settings tab; changing the site language switches it live", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.admin);
    await page.goto("/admin/cms");
    await page.getByRole("button", { name: "Sozlamalar", exact: true }).click();
    await page.getByLabel("Bosh sahifa sarlavhasi").fill(`Sarlavha uz ${s.run}`);
    await page.getByRole("tab", { name: "Русский" }).click();
    await expect(page.getByLabel("Telefon")).toHaveCount(0); // shared fields are edited on the uz tab only
    await page.getByLabel("Bosh sahifa sarlavhasi").fill(`Заголовок ${s.run}`);
    await page.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByText("Sozlamalar saqlandi")).toBeVisible();

    await page.goto("/");
    await expect(page.getByText(`Sarlavha uz ${s.run}`)).toBeVisible();
    await page.evaluate(() => localStorage.setItem("i18nextLng", "ru"));
    await page.reload();
    await expect(page.getByText(`Заголовок ${s.run}`)).toBeVisible();
    await expect(page.getByText(`Sarlavha uz ${s.run}`)).toHaveCount(0);
    await page.evaluate(() => localStorage.setItem("i18nextLng", "uz_cyrl"));
    await page.reload();
    await expect(page.getByText(`Sarlavha uz ${s.run}`)).toBeVisible(); // not translated → uz
    await page.evaluate(() => localStorage.setItem("i18nextLng", "uz"));
  });

  test("the admin edits a notice template; a student who chose Russian receives it in Russian", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.admin);
    await page.goto("/admin/cms");
    await page.getByRole("button", { name: "Xabar shablonlari" }).click();
    await page.getByRole("tab", { name: "Русский" }).click();
    const card = page.locator('[data-template="ANNOUNCEMENT"]');
    await expect(card.getByText("Standart matn")).toBeVisible();

    await card.getByLabel(/Mavzu/).fill("Объявление: {title}");
    await card.getByLabel(/^Matn/).fill("{name}, {tekst}");
    await card.getByRole("button", { name: "Saqlash" }).click();
    await expect(card.getByRole("alert")).toContainText("{tekst}"); // unknown placeholder rejected by the server

    await card.getByLabel(/^Matn/).fill("{name}, внимание: {body}");
    await card.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.locator('[data-template="ANNOUNCEMENT"]').getByText("O'zgartirilgan")).toBeVisible();

    // The student picks Russian for notices in Settings.
    const student = await page.context().browser()!.newPage();
    await loginViaUi(student, s.emails.student);
    await student.goto("/settings");
    await student.getByRole("button", { name: /Bildirishnoma/i }).click();
    await student.getByLabel("Xabarlar tili").selectOption("ru");
    const token = await apiLogin(s.emails.student);
    await expect.poll(async () => (await apiGet<{ language: string }>("/me/notification-preferences", token)).language).toBe("ru");

    await adminCall("POST", "/admin/cms/announcements", { title: `Imtihon ${s.run}`, body: "ertaga soat 10 da", audience: { type: "group", groupId: s.ids.group } });
    await student.goto("/notifications");
    await expect(student.getByText(`Объявление: Imtihon ${s.run}`)).toBeVisible();
    await expect(student.getByText("E2E Student, внимание: ertaga soat 10 da")).toBeVisible();
    await student.close();

    // Reset: the built-in text is back, and the preference returns to uz for the other specs.
    await page.reload();
    await page.getByRole("button", { name: "Xabar shablonlari" }).click();
    await page.getByRole("tab", { name: "Русский" }).click();
    await page.locator('[data-template="ANNOUNCEMENT"]').getByRole("button", { name: "Standart matnga qaytarish" }).click();
    await expect(page.locator('[data-template="ANNOUNCEMENT"]').getByText("Standart matn")).toBeVisible();
    await fetch(`${API}/me/notification-preferences`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ language: "uz" }) });
  });
});
