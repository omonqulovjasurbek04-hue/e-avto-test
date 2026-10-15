import { expect, test } from "@playwright/test";
import { API } from "../playwright.config";
import { PASSWORD } from "../global-setup";
import { apiGet, apiLogin, loginViaUi, sendPaymentWebhook, state } from "./helpers";

interface Order { total: number; payments: { id: string }[] }

async function register(email: string) {
  const res = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `E2E ${email.split("@")[0]}`, email, password: PASSWORD }) });
  expect(res.status).toBe(201);
}

test.describe.serial("taking a test", () => {
  test("setup: the admin adds questions to the course", async () => {
    const s = state();
    const admin = await apiLogin(s.emails.admin);
    for (let i = 1; i <= 4; i++) {
      const res = await fetch(`${API}/admin/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin}` },
        body: JSON.stringify({ courseId: s.ids.course, text: `Savol ${i} ${s.run}`, options: ["To'g'ri javob", "Noto'g'ri A", "Noto'g'ri B"], correctIndex: 0, explanation: "Izoh" }),
      });
      expect(res.status).toBe(201);
    }
  });

  test("an enrolled student takes the test in the browser and passes; the result is computed by the server", async ({ page }) => {
    const s = state();
    const email = `${s.run}-taker@e2e.test`;
    await register(email);
    const token = await apiLogin(email);

    const res = await fetch(`${API}/orders`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ packageId: s.ids.package }) });
    const order = ((await res.json()) as { data: Order }).data;
    await sendPaymentWebhook({ eventId: `${s.run}-taker-pay`, paymentId: `mock_${order.payments[0].id}`, state: "PAID", amount: order.total });

    await loginViaUi(page, email);
    await page.goto(`/lessons/${s.ids.lesson}`);
    await page.getByRole("button", { name: "Testni boshlash" }).click();
    await expect(page).toHaveURL(/\/tests\/[0-9a-f-]{36}$/);

    // The page must not contain the answer key while the test is running.
    const html = await page.content();
    expect(html).not.toContain("correctIndex");

    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "To'g'ri javob" }).click(); // options are shuffled per attempt; pick by text
      if (i < 3) await page.getByRole("button", { name: "Keyingi" }).click();
    }
    await page.getByRole("button", { name: "Tugatish" }).click();

    await expect(page).toHaveURL(/\/result$/);
    await expect(page.getByText(/Tabriklaymiz/)).toBeVisible();

    // The stored result agrees with what the screen shows (graded on the server).
    const history = await apiGet<{ id: string; score: number; passed: boolean }[]>("/results", token);
    expect(history[0].score).toBe(100);
    expect(history[0].passed).toBe(true);

    await page.goto(page.url().replace(/\/result$/, "/review"));
    await expect(page.getByText("Izoh").first()).toBeVisible(); // explanations appear only after finishing
  });

  test("a student without the course cannot start its test", async ({ page }) => {
    const s = state();
    const email = `${s.run}-lockedtaker@e2e.test`;
    await register(email);
    const token = await apiLogin(email);

    const api = await fetch(`${API}/tests/start`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ courseId: s.ids.course }) });
    expect(api.status).toBe(403);

    await loginViaUi(page, email);
    await page.goto(`/lessons/${s.ids.lesson}`);
    await expect(page.getByRole("button", { name: "Testni boshlash" })).toBeDisabled();
  });
});
