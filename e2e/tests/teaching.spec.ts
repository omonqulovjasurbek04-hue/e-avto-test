import { expect, test } from "@playwright/test";
import { apiGet, apiLogin, loginViaUi, state } from "./helpers";

test.describe.serial("teacher attendance flow", () => {
  test("a teacher marks and finalizes attendance for their own group", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.teacher);

    await page.goto("/teacher");
    await page.getByRole("link", { name: new RegExp(`E2E Guruh ${s.run}`) }).click();
    await expect(page.getByText("E2E mavzu")).toBeVisible();

    await page.getByRole("button", { name: "Davomat", exact: true }).click();
    await page.getByLabel("E2E Student holati").selectOption("PRESENT");
    await page.getByRole("button", { name: "Saqlash va yakunlash" }).click();
    await expect(page.getByText("Yakunlangan")).toBeVisible();
  });

  test("the student sees the result; a student outside the group sees nothing", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.student);
    await page.goto("/attendance");
    await expect(page.getByText("Qatnashdi").first()).toBeVisible();
    await page.goto("/schedule");
    await expect(page.getByText("E2E mavzu")).toBeVisible();

    const other = await apiLogin(s.emails.other);
    expect((await apiGet<{ records: unknown[] }>("/me/attendance", other)).records).toHaveLength(0);
    expect(await apiGet<unknown[]>("/me/schedule", other)).toHaveLength(0);
  });

  test("another teacher-less student cannot open teacher pages or the group API", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.other);
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/403/);
    const res = await fetch(`http://localhost:5055/api/groups/${s.ids.group}`, { headers: { Authorization: `Bearer ${await apiLogin(s.emails.other)}` } });
    expect(res.status).toBe(403);
  });
});
