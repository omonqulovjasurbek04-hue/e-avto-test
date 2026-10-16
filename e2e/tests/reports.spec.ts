import { expect, test } from "@playwright/test";
import { API } from "../playwright.config";
import { apiLogin, loginViaUi, state } from "./helpers";

test.describe("reports and system status", () => {
  test("an administrator sees honest integration status: database up, payments only in mock mode", async ({ page }) => {
    await loginViaUi(page, state().emails.admin);
    await page.goto("/admin");
    await page.getByRole("navigation").getByRole("link", { name: "Tizim holati" }).click();
    await expect(page.getByRole("heading", { name: "Tizim holati" })).toBeVisible();
    await expect(page.locator('[data-check="database"]')).toHaveAttribute("data-level", "ok");
    await expect(page.locator('[data-check="payments"]')).toHaveAttribute("data-level", "warning");
    await expect(page.locator('[data-check="payments"]')).toContainText("mock");
    // The page must never show connection strings or secrets.
    await expect(page.locator("main")).not.toContainText("postgresql://");
    await expect(page.locator("main")).not.toContainText("e2e-mock-secret");
  });

  test("the teacher workload report lists the E2E teacher with their group", async ({ page }) => {
    await loginViaUi(page, state().emails.admin);
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Hisobotlar" })).toBeVisible();
    await page.getByRole("button", { name: "O'qituvchilar yuklamasi" }).click();
    await expect(page.locator("tr", { hasText: "E2E Teacher" }).first()).toBeVisible();
  });

  test("finance reads reports but cannot open system status", async ({ page }) => {
    await loginViaUi(page, state().emails.finance);
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Hisobotlar" })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Tizim holati" })).toHaveCount(0);
    await page.goto("/admin/system");
    await expect(page).toHaveURL(/\/403/);
    const token = await apiLogin(state().emails.finance);
    expect((await fetch(`${API}/admin/system`, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(403);
  });
});
