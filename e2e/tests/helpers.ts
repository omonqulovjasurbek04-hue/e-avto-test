import crypto from "crypto";
import fs from "fs";
import { expect, type Page } from "@playwright/test";
import { API, MOCK_SECRET } from "../playwright.config";
import { PASSWORD, STATE_FILE, type State } from "../global-setup";

export const state = (): State => JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as State;

/** Logs in through the real login form and waits for the app to leave /login. */
export async function loginViaUi(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol").fill(PASSWORD);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function apiLogin(email: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
  const json = (await res.json()) as { data: { token: string } };
  return json.data.token;
}

export async function apiGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  return ((await res.json()) as { data: T }).data;
}

/** Plays the payment provider: a correctly signed callback for the given provider payment id. */
export async function sendPaymentWebhook(event: { eventId: string; paymentId: string; state: string; amount: number; currency?: string }, secret = MOCK_SECRET) {
  const raw = JSON.stringify({ currency: "UZS", ...event });
  const signature = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const res = await fetch(`${API}/payments/webhook/mock`, { method: "POST", headers: { "Content-Type": "application/json", "x-signature": signature }, body: raw });
  return { status: res.status, body: (await res.json()) as { data?: { status: string } } };
}
