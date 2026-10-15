import { expect, test } from "@playwright/test";
import { apiGet, apiLogin, loginViaUi, state } from "./helpers";

interface Prefs { inApp: boolean; email: boolean; attendance: boolean }
interface Inbox { items: { id: string; title: string; readAt: string | null }[]; unread: number }

test.describe.serial("notifications", () => {
  test("a student changes preferences in Settings and they are really saved", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.other);
    await page.goto("/settings");
    await page.getByRole("button", { name: /Bildirishnoma/i }).click();

    const email = page.getByLabel(/Email orqali xabar/);
    await expect(email).toBeChecked();
    await email.uncheck();
    await expect(email).not.toBeChecked();

    const token = await apiLogin(s.emails.other);
    await expect.poll(async () => (await apiGet<Prefs>("/me/notification-preferences", token)).email).toBe(false);

    await page.reload();
    await page.getByRole("button", { name: /Bildirishnoma/i }).click();
    await expect(page.getByLabel(/Email orqali xabar/)).not.toBeChecked();
  });

  test("an administrator announces to a group; members see it with an unread badge, outsiders do not", async ({ page, browser }) => {
    const s = state();
    const title = `E'lon ${s.run}`;

    await loginViaUi(page, s.emails.admin);
    await page.goto("/admin/cms");
    await page.getByRole("button", { name: "E'lon yuborish" }).click();
    await page.getByLabel("Kimga").selectOption("group");
    await page.getByLabel("Guruh").selectOption({ label: `E2E Guruh ${s.run}` });
    await page.getByLabel("Sarlavha").fill(title);
    await page.getByLabel(/Matn/).fill("Ertaga dars soat 10:00 da boshlanadi <b>vaqtida</b> keling");
    await page.getByRole("button", { name: "Yuborish", exact: true }).click();
    await expect(page.getByText(/1 kishiga yuborildi/)).toBeVisible();

    // The group member sees it, with the counter in the sidebar.
    const member = await browser.newPage();
    await loginViaUi(member, s.emails.student);
    await member.goto("/notifications");
    await expect(member.getByText(title)).toBeVisible();
    await expect(member.getByLabel(/ta o'qilmagan/)).toBeVisible();
    await expect(member.getByText("<b>")).toHaveCount(0); // stored and shown as plain text

    const memberToken = await apiLogin(s.emails.student);
    const before = await apiGet<Inbox>("/me/notifications", memberToken);
    const mine = before.items.find((n) => n.title === title)!;
    expect(mine.readAt).toBeNull();
    await member.locator("div", { hasText: title }).filter({ has: member.getByRole("button", { name: "O'qildi" }) }).last().getByRole("button", { name: "O'qildi" }).click();
    await expect.poll(async () => (await apiGet<Inbox>("/me/notifications", memberToken)).items.find((n) => n.title === title)?.readAt).not.toBeNull();
    await member.close();

    // Not in the group -> never delivered.
    const outsider = await apiGet<Inbox>("/me/notifications", await apiLogin(s.emails.other));
    expect(outsider.items.some((n) => n.title === title)).toBe(false);
  });

  test("students cannot reach the announcement API", async () => {
    const token = await apiLogin(state().emails.student);
    const res = await fetch("http://localhost:5055/api/admin/cms/announcements", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: "spam", body: "spam", audience: { type: "all" } }) });
    expect(res.status).toBe(403);
  });
});
