import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginViaUi, state } from "./helpers";

const dir = path.resolve(__dirname, "../../frontend/src/locales");
const load = (lang: string) => JSON.parse(fs.readFileSync(path.join(dir, `${lang}.json`), "utf8")) as Record<string, unknown>;
const flat = (o: Record<string, unknown>, prefix = ""): [string, unknown][] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v as Record<string, unknown>, `${prefix}${k}.`) : [[`${prefix}${k}`, v] as [string, unknown]]));

test.describe("translations", () => {
  test("all three languages have exactly the same keys and no empty texts", () => {
    const uz = flat(load("uz"));
    const reference = new Set(uz.map(([k]) => k));
    for (const lang of ["uz_cyrl", "ru"]) {
      const entries = flat(load(lang));
      const keys = new Set(entries.map(([k]) => k));
      expect([...reference].filter((k) => !keys.has(k)), `${lang} is missing keys`).toEqual([]);
      expect([...keys].filter((k) => !reference.has(k)), `${lang} has extra keys`).toEqual([]);
      expect(entries.filter(([, v]) => typeof v === "string" && v.trim() === "").map(([k]) => k), `${lang} has empty texts`).toEqual([]);
    }
  });

  test("interpolation placeholders match between languages", () => {
    const placeholders = (v: unknown) => (typeof v === "string" ? (v.match(/{{\s*\w+\s*}}/g) ?? []).sort().join(",") : "");
    const uz = new Map(flat(load("uz")));
    for (const lang of ["uz_cyrl", "ru"]) {
      for (const [k, v] of flat(load(lang))) {
        expect(placeholders(v), `${lang}:${k}`).toBe(placeholders(uz.get(k)));
      }
    }
  });
});

test.describe("language switching", () => {
  test("Russian: pricing, money and the student pages are translated", async ({ page }) => {
    // Sign in while the interface is still Uzbek (the helper uses the Uzbek labels), then switch the language.
    await loginViaUi(page, state().emails.student);
    await page.evaluate(() => localStorage.setItem("i18nextLng", "ru"));

    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Цены и пакеты" })).toBeVisible();
    await expect(page.getByText(/200 000 сум/).first()).toBeVisible();
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "Заказы и платежи" })).toBeVisible();
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: /Уведомления/ })).toBeVisible();
    await page.goto("/attendance");
    await expect(page.getByRole("heading", { name: "Посещаемость" })).toBeVisible();
    await page.goto("/news");
    await expect(page.getByRole("heading", { name: "Новости" })).toBeVisible();
  });

  test("Uzbek Cyrillic is used when chosen", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "uz_cyrl"));
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Нархлар ва пакетлар" })).toBeVisible();
    await expect(page.getByText(/200 000 сўм/).first()).toBeVisible();
  });

  test("Russian: the admin panel and the teacher cabinet are translated", async ({ page }) => {
    await loginViaUi(page, state().emails.admin);
    await page.evaluate(() => localStorage.setItem("i18nextLng", "ru"));
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Пользователи" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Журнал аудита" })).toBeVisible();
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Заказы и выручка" })).toBeVisible();
    await page.goto("/admin/cms");
    await expect(page.getByRole("heading", { name: "Контент сайта" })).toBeVisible();

    await page.evaluate(() => localStorage.setItem("i18nextLng", "uz_cyrl"));
    await page.goto("/admin/groups");
    await expect(page.getByRole("heading", { name: "Гуруҳлар ва жадвал" })).toBeVisible();
  });

  test("Russian: the teacher sees their groups translated", async ({ page }) => {
    await loginViaUi(page, state().emails.teacher);
    await page.evaluate(() => localStorage.setItem("i18nextLng", "ru"));
    await page.goto("/teacher");
    await expect(page.getByRole("heading", { name: "Мои группы" })).toBeVisible();
  });

  test("Latin Uzbek stays the default", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Narxlar va paketlar" })).toBeVisible();
    await expect(page.getByText(/200 000 so'm/).first()).toBeVisible();
  });
});
