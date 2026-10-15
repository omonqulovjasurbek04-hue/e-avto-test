import { expect, test } from "@playwright/test";
import { API } from "../playwright.config";
import { PASSWORD } from "../global-setup";
import { apiGet, apiLogin, loginViaUi, sendPaymentWebhook, state } from "./helpers";

// A minimal MP4-looking blob: the server decides by the bytes ("ftyp" box), not by the name.
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]), Buffer.alloc(2048, 7)]);

interface Order { total: number; payments: { id: string }[] }

async function register(email: string) {
  const res = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `E2E ${email.split("@")[0]}`, email, password: PASSWORD }) });
  expect(res.status).toBe(201);
}

test.describe.serial("private media", () => {
  test("an admin uploads a video from the UI; a disguised HTML file is refused", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.admin);
    await page.goto("/admin/media");
    await expect(page.getByText("Yangi fayl yuklash")).toBeVisible();

    await page.getByLabel("Dars").selectOption({ label: `E2E Dars ${s.run}` });
    await page.getByLabel("Fayl tanlash").setInputFiles({ name: "evil.mp4", mimeType: "video/mp4", buffer: Buffer.from("<html><script>alert(1)</script></html>") });
    await expect(page.getByRole("alert")).toContainText(/MP4|WebM/);

    await page.getByLabel("Fayl tanlash").setInputFiles({ name: "dars.mp4", mimeType: "video/mp4", buffer: MP4 });
    await expect(page.getByText("Fayl yuklandi")).toBeVisible();
    await expect(page.getByRole("cell", { name: `E2E Dars ${s.run}` })).toBeVisible();
  });

  test("an enrolled student streams it with range requests; the lesson page plays through a signed URL", async ({ page }) => {
    const s = state();
    const email = `${s.run}-viewer@e2e.test`;
    await register(email);
    const token = await apiLogin(email);

    // Buy the package through the real API and let the provider confirm.
    const res = await fetch(`${API}/orders`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ packageId: s.ids.package }) });
    const order = ((await res.json()) as { data: Order }).data;
    await sendPaymentWebhook({ eventId: `${s.run}-viewer-pay`, paymentId: `mock_${order.payments[0].id}`, state: "PAID", amount: order.total });

    const lesson = await apiGet<{ locked: boolean; privateVideoId: string | null; videoUrl: string }>(`/lessons/${s.ids.lesson}`, token);
    expect(lesson.locked).toBe(false);
    expect(lesson.privateVideoId).toBeTruthy();

    const access = await fetch(`${API}/media/video/${lesson.privateVideoId}/access`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(access.status).toBe(200);
    const url = new URL(((await access.json()) as { data: { url: string } }).data.url, API).toString();
    const part = await fetch(url, { headers: { Range: "bytes=0-99" } });
    expect(part.status).toBe(206);
    expect(part.headers.get("cache-control")).toContain("no-store");
    expect((await part.arrayBuffer()).byteLength).toBe(100);
    expect((await fetch(`${url}x`)).status).toBe(401);

    // The test file is not a decodable movie, so the <video> element may flip to its error state at once;
    // what matters is that the browser asked the signed stream URL and the server answered it.
    await loginViaUi(page, email);
    const streamResponse = page.waitForResponse((r) => r.url().includes("/api/media/stream/"));
    await page.goto(`/lessons/${s.ids.lesson}/video`);
    const r = await streamResponse;
    expect([200, 206]).toContain(r.status());
    expect(r.headers()["cache-control"]).toContain("no-store");
  });

  test("a user without the course cannot get a stream link and sees the lesson as locked", async ({ page }) => {
    const s = state();
    const email = `${s.run}-nobuy@e2e.test`;
    await register(email);
    const token = await apiLogin(email);
    const lesson = await apiGet<{ locked: boolean; privateVideoId: string | null }>(`/lessons/${s.ids.lesson}`, token);
    expect(lesson.locked).toBe(true);
    expect(lesson.privateVideoId).toBeNull();

    const admin = await apiLogin(s.emails.admin);
    const list = await apiGet<{ videos: { id: string }[] }>("/admin/media", admin);
    const probe = await fetch(`${API}/media/video/${list.videos[0].id}/access`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(probe.status).toBe(404);

    await loginViaUi(page, email);
    await page.goto(`/lessons/${s.ids.lesson}`);
    await expect(page.getByText("Bu dars yopiq")).toBeVisible(); // lesson details page
    await page.goto(`/lessons/${s.ids.lesson}/video`);
    await expect(page.getByText("Bu dars yopiq")).toBeVisible(); // video page
    await expect(page.locator("video")).toHaveCount(0);
  });

  test("students cannot reach the upload API", async () => {
    const token = await apiLogin(state().emails.teacher);
    const res = await fetch(`${API}/admin/media/video`, { method: "PUT", headers: { "Content-Type": "application/octet-stream", Authorization: `Bearer ${token}` }, body: MP4 });
    expect(res.status).toBe(403);
  });
});
