import { expect, test, type Page } from "@playwright/test";
import { loginViaUi, state } from "./helpers";

/** The page itself must not scroll sideways on a phone (wide tables scroll inside their own container). */
async function expectNoHorizontalOverflow(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, `${path} scrolls sideways (${scroll}px > ${client}px)`).toBeLessThanOrEqual(client + 1);
}

test.describe("phone layout (375px)", () => {
  test("public pages fit the screen", async ({ page }) => {
    for (const path of ["/", "/courses", "/faq", "/contact", "/news", "/login", "/register", "/privacy"]) {
      await expectNoHorizontalOverflow(page, path);
    }
  });

  test("the hamburger menu opens and reaches the courses page", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Menyu" });
    await expect(menu).toBeVisible();
    await expect(page.locator("header nav").first()).toBeHidden(); // desktop links are hidden on a phone

    await menu.tap();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("link", { name: "Kurslar" }).first().tap();
    await expect(page).toHaveURL(/\/courses/);
  });

  test("the menu button stays on screen and the language switch moved into the menu", async ({ page }) => {
    await page.goto("/");
    const box = await page.getByRole("button", { name: "Menyu" }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    await page.getByRole("button", { name: "Menyu" }).tap();
    const langToggle = page.getByRole("button", { name: /^Til:/ }).last();
    await expect(langToggle).toBeVisible();
    await langToggle.tap();
    await page.getByRole("menuitem", { name: "Русский" }).tap();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  });

  test("tap targets of the main navigation are large enough", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menyu" }).tap();
    const links = page.locator("header").getByRole("link");
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      if (box) expect(box.height, `link #${i} is too small to tap`).toBeGreaterThanOrEqual(32);
    }
  });

  test("student pages fit the screen and the sidebar opens", async ({ page }) => {
    await loginViaUi(page, state().emails.student);
    for (const path of ["/dashboard", "/orders", "/schedule", "/attendance", "/notifications", "/settings", "/lessons"]) {
      await expectNoHorizontalOverflow(page, path);
    }
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Menyu" }).tap();
    await expect(page.getByRole("link", { name: /Bildirishnomalar/ })).toBeVisible();
  });

  test("a teacher can open the group and the attendance form on a phone", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.teacher);
    await expectNoHorizontalOverflow(page, "/teacher");
    await page.getByRole("link", { name: new RegExp(`E2E Guruh ${s.run}`) }).tap();
    await expect(page.getByText("E2E mavzu")).toBeVisible();
    await page.getByRole("button", { name: "Davomat", exact: true }).tap();
    await expect(page.getByLabel("E2E Student holati")).toBeVisible();
    const box = await page.getByRole("button", { name: "Saqlash va yakunlash" }).boundingBox();
    expect(box).not.toBeNull();
  });

  test("admin pages do not break the layout on a phone", async ({ page }) => {
    await loginViaUi(page, state().emails.admin);
    for (const path of ["/admin", "/admin/catalog", "/admin/orders", "/admin/groups", "/admin/cms", "/admin/exam", "/admin/users", "/admin/audit", "/admin/media"]) {
      await expectNoHorizontalOverflow(page, path);
    }
  });
});
