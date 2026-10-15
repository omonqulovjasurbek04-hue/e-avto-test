import { expect, test } from "@playwright/test";
import { apiGet, apiLogin, loginViaUi, state } from "./helpers";

test.describe("frontend review fixes", () => {
  test("an expired token does not throw a visitor off a public page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("e_avto_token", "expired.invalid.token");
      localStorage.setItem("e_avto_user", JSON.stringify({ id: "x", name: "Old", role: "USER" }));
    });
    for (const path of ["/", "/courses", "/pricing", "/news"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page).not.toHaveURL(/\/login/);
    }
  });

  test("an expired token on a page that needs an account still leads to the login page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("e_avto_token", "expired.invalid.token");
      localStorage.setItem("e_avto_user", JSON.stringify({ id: "x", name: "Old", role: "USER" }));
    });
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
  });

  test("staff see a link to the admin panel, students do not", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.admin);
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Admin panel" })).toBeVisible();

    await page.getByRole("link", { name: "Admin panel" }).click();
    await expect(page).toHaveURL(/\/admin/);

    const other = await page.context().browser()!.newPage();
    await loginViaUi(other, s.emails.student);
    await other.goto("/dashboard");
    await expect(other.getByRole("link", { name: "Admin panel" })).toHaveCount(0);
    await other.close();
  });

  test("the profile saves the name without touching the (read-only) e-mail, and shows the real role", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.teacher);
    await page.goto("/profile");
    await expect(page.getByText("O'qituvchi").first()).toBeVisible(); // not shown as a student any more
    const email = page.locator('input[type="email"]');
    await expect(email).toBeDisabled();

    const nameInput = page.getByLabel(/Ism|To'liq ism|Ism familiya/i).first();
    await nameInput.fill("E2E Teacher Renamed");
    await page.getByRole("button", { name: /Saqlash/ }).click();
    await expect(page.getByText("Profil muvaffaqiyatli yangilandi")).toBeVisible();

    const me = await apiGet<{ name: string; email: string }>("/auth/me", await apiLogin(s.emails.teacher));
    expect(me.name).toBe("E2E Teacher Renamed");
    expect(me.email).toBe(s.emails.teacher);
  });
});
