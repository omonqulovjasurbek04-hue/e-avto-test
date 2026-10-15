import { expect, test } from "@playwright/test";
import { API } from "../playwright.config";
import { apiGet, apiLogin, loginViaUi, sendPaymentWebhook, state } from "./helpers";

interface Order { id: string; total: number; payments: { id: string }[] }

test.describe.serial("role-aware back office", () => {
  test("finance lands on orders, sees only finance menus, and can refund from the UI", async ({ page }) => {
    const s = state();

    // A paid purchase by the "other" student (through the real API + signed callback).
    const buyer = await apiLogin(s.emails.other);
    const res = await fetch(`${API}/orders`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${buyer}` }, body: JSON.stringify({ packageId: s.ids.package }) });
    expect(res.status).toBe(201);
    const order = ((await res.json()) as { data: Order }).data;
    const paid = await sendPaymentWebhook({ eventId: `${s.run}-staff-pay`, paymentId: `mock_${order.payments[0].id}`, state: "PAID", amount: order.total });
    expect(paid.body.data?.status).toBe("processed");
    expect((await apiGet<{ isActive: boolean }[]>("/me/enrollments", buyer))[0].isActive).toBe(true);

    await loginViaUi(page, s.emails.finance);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/orders/);

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: /Buyurtmalar/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Foydalanuvchilar" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /Paketlar/ })).toHaveCount(0);

    // Full refund of the "other" student's order.
    const row = page.locator("tr", { hasText: "E2E Other" }).first();
    await row.getByRole("button", { name: "Qaytarish" }).click();
    await page.getByLabel("Sabab").fill("E2E test qaytarish");
    // The row buttons are also called "Qaytarish"; the submit button is the one inside the open form.
    await page.locator("div").filter({ has: page.getByLabel("Sabab") }).filter({ has: page.getByRole("button", { name: "Bekor qilish" }) }).last().getByRole("button", { name: "Qaytarish", exact: true }).click();
    await expect(page.getByText("Qaytarish so'rovi yaratildi")).toBeVisible();

    // Mock provider confirms at once -> order refunded, access revoked.
    await expect.poll(async () => (await apiGet<{ isActive: boolean }[]>("/me/enrollments", buyer))[0].isActive).toBe(false);
    const lesson = await apiGet<{ locked: boolean }>(`/lessons/${s.ids.lesson}`, buyer);
    expect(lesson.locked).toBe(true);
  });

  test("finance cannot open user management, even by typing the URL", async ({ page }) => {
    await loginViaUi(page, state().emails.finance);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/403/);
    const token = await apiLogin(state().emails.finance);
    const res = await fetch(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(403);
  });

  test("a moderator lands on content management and has no money or user menus", async ({ page }) => {
    await loginViaUi(page, state().emails.moderator);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/cms/);
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Sayt kontenti" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Savollar Banki" })).toBeVisible(); // question editing is a moderator job
    await expect(nav.getByRole("link", { name: "Foydalanuvchilar" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /Buyurtmalar/ })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Audit jurnali" })).toHaveCount(0);
  });

  test("an administrator can read the audit trail, including the refund just made", async ({ page }) => {
    await loginViaUi(page, state().emails.admin);
    await page.goto("/admin/audit");
    await page.getByLabel("Amal").fill("refund");
    await expect(page.getByText("refund.create").first()).toBeVisible();
  });

  test("only a superadmin may hand out administrator roles", async () => {
    const s = state();
    const admin = await apiLogin(s.emails.admin);
    const attempt = await fetch(`${API}/admin/users/${s.ids.other}/role`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin}` }, body: JSON.stringify({ role: "ADMIN" }) });
    expect(attempt.status).toBe(403);
    const ok = await fetch(`${API}/admin/users/${s.ids.other}/role`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin}` }, body: JSON.stringify({ role: "MODERATOR" }) });
    expect(ok.status).toBe(200);
  });
});
