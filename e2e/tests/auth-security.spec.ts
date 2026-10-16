import crypto from "crypto";
import path from "path";
import { createRequire } from "module";
import { expect, test, type Page } from "@playwright/test";
import { API, E2E_DB } from "../playwright.config";
import { PASSWORD } from "../global-setup";
import { loginViaUi, state } from "./helpers";

const requireFromBackend = createRequire(path.resolve(__dirname, "../../backend/package.json"));
const { PrismaClient } = requireFromBackend("@prisma/client") as typeof import("../../backend/node_modules/@prisma/client");

/** RFC 6238 code for "now + offset steps", exactly what an authenticator app would show. */
function totp(secret: string, offset = 0) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/=+$/, "")) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + offset));
  const h = crypto.createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

async function register(email: string) {
  const res = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "E2E Security", email, password: PASSWORD }) });
  return ((await res.json()) as { data: { user: { id: string } } }).data.user.id;
}

const storedValues = (page: Page) => page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));

test.describe("auth security", () => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DB } } });
  test.afterAll(async () => prisma.$disconnect());

  test("the access token is kept in memory only; a reload restores the session via the refresh cookie", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.student);

    const stored = await storedValues(page);
    expect(stored).not.toMatch(/eyJ[\w-]+\.[\w-]+\.[\w-]+/); // no JWT anywhere in web storage
    const cookies = await page.context().cookies("http://localhost:5055/api/auth/refresh");
    const rt = cookies.find((c) => c.name === "eavto_rt");
    expect(rt?.httpOnly).toBe(true);
    expect(rt?.sameSite).toBe("Strict");
    expect(await page.evaluate(() => document.cookie)).not.toContain("eavto_rt");

    // A full reload (new JS context, no token in memory) still shows the signed-in pages.
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/orders/);
    await page.reload();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole("button", { name: "Chiqish" }).first()).toBeVisible();
  });

  test("an expired access token is renewed silently", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.student);
    // Make the server reject the current access token: only the refresh path can keep the user in.
    let rejected = 0;
    await page.route("**/api/me/notifications**", async (route) => {
      const auth = route.request().headers()["authorization"] ?? "";
      if (rejected === 0 && auth) {
        rejected++;
        await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false, message: "Invalid or expired token" }) });
        return;
      }
      await route.continue();
    });
    let refreshes = 0;
    page.on("response", (r) => {
      if (r.url().endsWith("/api/auth/refresh") && r.status() === 200) refreshes++;
    });
    await page.goto("/notifications");
    // One refresh restores the session after the reload, a second one replaces the rejected token.
    await expect.poll(() => refreshes).toBe(2);
    await expect(page).toHaveURL(/\/notifications/);
    expect(rejected).toBe(1);
  });

  test("logout ends the session on the server: the old refresh cookie no longer works", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.other);
    await page.goto("/dashboard");
    const before = (await page.context().cookies("http://localhost:5055/api/auth/refresh")).find((c) => c.name === "eavto_rt")!;

    const loggedOut = page.waitForResponse((r) => r.url().endsWith("/api/auth/logout"));
    await page.getByRole("button", { name: "Chiqish" }).first().click();
    expect((await loggedOut).status()).toBe(200);
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);

    // Replaying the cookie captured before logout is refused.
    const replay = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest", Cookie: `eavto_rt=${before.value}` } });
    expect(replay.status).toBe(401);
  });

  test("sign-up reports honestly that no verification e-mail was sent, and the link verifies the address", async ({ page }) => {
    const email = `${state().run}-verify@e2e.test`;
    await page.goto("/register");
    await page.getByLabel("Ism").fill("E2E Verify");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Parol", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Parolni tasdiqlang").fill(PASSWORD);
    await page.getByRole("button", { name: "Ro'yxatdan o'tish" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    // The E2E backend has no SMTP: the UI must not claim the mail was sent.
    await expect(page.getByText("Email xizmati hali sozlanmagan, tasdiqlash xati yuborilmadi")).toBeVisible();
    await expect(page.getByText("Tasdiqlash havolasi emailingizga yuborildi")).toHaveCount(0);
    await expect(page.getByText("Email manzilingiz hali tasdiqlanmagan.")).toBeVisible();

    // Stand in for the e-mail: a link with a token whose hash the server knows.
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerification.create({
      data: { userId: user.id, email, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000) },
    });
    await page.goto(`/verify-email?token=${token}`);
    await expect(page.getByText("Email manzilingiz tasdiqlandi")).toBeVisible();
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerifiedAt).not.toBeNull();

    await page.goto("/dashboard");
    await expect(page.getByText("Email manzilingiz hali tasdiqlanmagan.")).toHaveCount(0);

    // The same link cannot be used twice.
    await page.goto(`/verify-email?token=${token}`);
    await expect(page.getByText(/Havola yaroqsiz yoki muddati o'tgan/)).toBeVisible();
  });

  test("an admin turns on TOTP 2FA and the next login asks for the code", async ({ page }) => {
    const email = `${state().run}-totp@e2e.test`;
    const id = await register(email);
    await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });

    await loginViaUi(page, email);
    await page.goto("/settings?tab=security");
    await page.getByRole("button", { name: "2FA ni yoqish" }).click();
    const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
    await page.getByLabel("Tasdiqlash kodi").fill(totp(secret));
    await page.getByRole("button", { name: "Tasdiqlash va yoqish" }).click();
    await expect(page.getByTestId("recovery-codes").locator("li")).toHaveCount(8);
    await expect(page.getByText("Yoqilgan")).toBeVisible();

    // A fresh browser (no cookie) must pass both steps.
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Parol").fill(PASSWORD);
    await page.getByRole("button", { name: "Kirish", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Ikki bosqichli tekshiruv" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Tasdiqlash kodi").fill("000000");
    await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
    await expect(page.getByText("Kod noto'g'ri. Qayta urinib ko'ring")).toBeVisible();

    await page.getByLabel("Tasdiqlash kodi").fill(totp(secret, 1));
    await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
