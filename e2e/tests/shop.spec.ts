import { expect, test } from "@playwright/test";
import { apiGet, apiLogin, loginViaUi, sendPaymentWebhook, state } from "./helpers";

interface Order { id: string; status: string; total: number; payments: { id: string; amount: number }[] }

test.describe.serial("purchase flow", () => {
  test("a guest sees the package and its price on the pricing page", async ({ page }) => {
    const s = state();
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: `E2E Paket ${s.run}` })).toBeVisible();
    await expect(page.getByText("200 000 so'm").first()).toBeVisible();
  });

  test("a guest cannot read the locked lesson content", async () => {
    const s = state();
    const res = await fetch(`http://localhost:5055/api/lessons/${s.ids.lesson}`);
    const lesson = ((await res.json()) as { data: { locked: boolean; videoUrl: string; content: string | null } }).data;
    expect(lesson.locked).toBe(true);
    expect(lesson.videoUrl).toBe("");
    expect(lesson.content).toBeNull();
  });

  test("student orders with a coupon, access opens only after the verified callback", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.student);

    await page.goto("/pricing");
    // The page lists every package in the database; pick the card of this run's package.
    const card = page.locator("div.flex-col", { has: page.getByRole("heading", { name: `E2E Paket ${s.run}` }) }).last();
    await card.getByRole("button", { name: "Sotib olish" }).click();
    await page.getByLabel("Promo-kod").fill(`E2E${s.run.toUpperCase()}`.slice(0, 20));
    await page.getByRole("button", { name: "Qo'llash" }).click();
    await expect(page.getByText("180 000 so'm")).toBeVisible(); // 200 000 - 10%
    await page.getByRole("button", { name: "Buyurtma berish" }).click();

    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByText("To'lov kutilmoqda")).toBeVisible();

    const token = await apiLogin(s.emails.student);
    const [order] = await apiGet<Order[]>("/orders", token);
    expect(order.total).toBe(18_000_000);

    // Not enrolled yet: browser success pages have no power to unlock the course.
    expect((await apiGet<unknown[]>("/me/enrollments", token)).length).toBe(0);

    // A forged / wrong-amount callback changes nothing.
    const paymentId = `mock_${order.payments[0].id}`;
    expect((await sendPaymentWebhook({ eventId: `${s.run}-bad`, paymentId, state: "PAID", amount: order.total }, "wrong-secret")).status).toBe(401);
    expect((await sendPaymentWebhook({ eventId: `${s.run}-low`, paymentId, state: "PAID", amount: 1 })).body.data?.status).toBe("rejected");
    expect((await apiGet<unknown[]>("/me/enrollments", token)).length).toBe(0);

    // The real callback, delivered twice: processed once, then recognised as a duplicate.
    const good = { eventId: `${s.run}-ok`, paymentId, state: "PAID", amount: order.total };
    expect((await sendPaymentWebhook(good)).body.data?.status).toBe("processed");
    expect((await sendPaymentWebhook(good)).body.data?.status).toBe("duplicate");

    await page.goto("/orders");
    await expect(page.getByText("To'langan")).toBeVisible();
    const enrollments = await apiGet<{ isActive: boolean }[]>("/me/enrollments", token);
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].isActive).toBe(true);

    const lesson = await apiGet<{ locked: boolean; videoUrl: string }>(`/lessons/${s.ids.lesson}`, token);
    expect(lesson.locked).toBe(false);
    expect(lesson.videoUrl).toContain("video.mp4");

    await page.goto("/notifications");
    await expect(page.getByText("To'lov qabul qilindi", { exact: true })).toBeVisible();
    // The amount is shown in so'm (the database keeps tiyin), filled in by the notice template.
    await expect(page.getByText(/^\d[\d ]* so'm to'lov qabul qilindi/)).toBeVisible();
  });

  test("another student cannot see that order", async () => {
    const s = state();
    const token = await apiLogin(s.emails.other);
    expect(await apiGet<unknown[]>("/orders", token)).toHaveLength(0);
  });

  test("a student is sent to the 403 page when opening the admin panel", async ({ page }) => {
    await loginViaUi(page, state().emails.student);
    await page.goto("/admin/catalog");
    await expect(page).toHaveURL(/\/403/);
  });
});
