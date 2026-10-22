import { expect, test, type Page } from "@playwright/test";
import { API } from "../playwright.config";
import { PASSWORD } from "../global-setup";
import { apiLogin, loginViaUi, sendPaymentWebhook, state } from "./helpers";

// A real 2x2 PNG (decodable, so the browser actually renders it).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64"
);

async function call<T>(method: string, url: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${url}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json()) as { data: T; message?: string };
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${json.message ?? ""}`);
  return json.data;
}

/** Records a short, real WebM clip in the browser (canvas + MediaRecorder), so the player has something it can decode. */
async function recordWebm(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(25);
    const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start(100);
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const draw = () => {
        const t = performance.now() - t0;
        ctx.fillStyle = `hsl(${(t / 10) % 360} 70% 50%)`;
        ctx.fillRect(0, 0, 160, 90);
        ctx.fillStyle = "#fff";
        ctx.fillText(String(Math.round(t)), 10, 50);
        if (t < 3000) requestAnimationFrame(draw);
        else resolve();
      };
      draw();
    });
    rec.stop();
    await done;
    const buf = new Uint8Array(await new Blob(chunks, { type: "video/webm" }).arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return Buffer.from(b64, "base64");
}

test.describe.serial("categories, CMS images, private video", () => {
  test("an admin creates a category, files the course under it, and visitors filter by it", async ({ page }) => {
    const s = state();
    const name = `E2E Belgilar ${s.run}`;
    await loginViaUi(page, s.emails.admin);
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "Yangi kategoriya" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nomi").fill(name);
    await dialog.getByLabel("Slug").fill(`${s.run}-belgilar`);
    await dialog.getByRole("tab", { name: "Русский" }).click();
    await dialog.getByLabel("Nomi").fill(`E2E Знаки ${s.run}`);
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();

    await page.goto("/admin/courses");
    await page.getByRole("row", { name: new RegExp(`E2E Kurs ${s.run}`) }).getByRole("button", { name: "Tahrirlash" }).click();
    await page.getByRole("dialog").getByLabel("Kategoriya").selectOption({ label: name });
    await page.getByRole("dialog").getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByRole("row", { name: new RegExp(`E2E Kurs ${s.run}`) })).toContainText(name);

    // Public catalogue: the card is a clean picture + title; the category is shown on the course page.
    await page.goto("/courses");
    const card = page.locator('a[href^="/my-courses/"]', { hasText: `E2E Kurs ${s.run}` });
    await expect(card).toBeVisible();
    await expect(card).not.toContainText(name);
    await card.click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Russian visitors get the translated name from the API.
    const ru = await fetch(`${API}/courses?category=${s.run}-belgilar&lang=ru`).then((r) => r.json() as Promise<{ data: { category: { name: string } }[] }>);
    expect(ru.data[0].category.name).toBe(`E2E Знаки ${s.run}`);
  });

  test("a content editor uploads an image and uses it as a news cover", async ({ page }) => {
    const s = state();
    await loginViaUi(page, s.emails.moderator);
    await page.goto("/admin/cms");
    await page.getByRole("button", { name: "Rasmlar", exact: true }).click();
    await page.getByLabel("Rasm faylini tanlash").setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") });
    await expect(page.getByRole("alert")).toContainText(/PNG|JPEG|WebP/);
    await page.getByLabel("Rasm faylini tanlash").setInputFiles({ name: `cover-${s.run}.png`, mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("Rasm yuklandi")).toBeVisible();
    const img = page.getByTestId("image-library").getByRole("img", { name: `cover-${s.run}.png` });
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(2); // really decoded

    // News with that cover, chosen from the library.
    await page.getByRole("button", { name: "Yangiliklar", exact: true }).click();
    await page.getByRole("button", { name: "Yangi yangilik" }).click();
    const editor = page.getByRole("dialog").first();
    await editor.getByLabel("Sarlavha", { exact: true }).fill(`E2E rasmli yangilik ${s.run}`);
    await editor.getByLabel(/^Slug/).fill(`${s.run}-rasmli`);
    await editor.getByLabel(/^Matn \(HTML/).fill("<p>Yangilik matni</p>");
    await editor.getByRole("button", { name: "Rasm tanlash" }).click();
    await page.getByRole("button", { name: `cover-${s.run}.png rasmini tanlash` }).click();
    await expect(editor.getByLabel("Muqova rasmi (URL)")).toHaveValue(/\/api\/images\/[a-f0-9-]{36}\.png$/);
    await editor.getByLabel("Holat").selectOption({ label: "Nashr etilgan" });
    await editor.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByRole("cell", { name: `E2E rasmli yangilik ${s.run}` })).toBeVisible();

    await page.goto(`/news/${s.run}-rasmli`);
    const cover = page.locator('img[src*="/api/images/"]').first();
    await expect(cover).toBeVisible();
    await expect.poll(() => cover.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(2);
  });

  test("an enrolled student plays a real private video", async ({ page }) => {
    const s = state();
    const admin = await apiLogin(s.emails.admin);
    const course = await call<{ id: string }>("POST", "/admin/courses", admin, { title: `E2E Video kurs ${s.run}`, description: "d", isPublished: true });
    const lesson = await call<{ id: string }>("POST", "/admin/lessons", admin, { courseId: course.id, title: `E2E Video dars ${s.run}`, isPublished: true });
    const pkg = await call<{ id: string }>("POST", "/admin/catalog/packages", admin, { courseId: course.id, name: `E2E Video paket ${s.run}`, durationDays: 30 });
    await call("POST", `/admin/catalog/packages/${pkg.id}/prices`, admin, { amount: 1_000_000, isSample: true });

    await page.goto("/");
    const webm = await recordWebm(page);
    expect(webm.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))).toBe(true);
    const up = await fetch(`${API}/admin/media/video?lessonId=${lesson.id}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream", Authorization: `Bearer ${admin}` }, body: new Uint8Array(webm) });
    expect(up.status).toBe(201);

    const email = `${s.run}-watcher@e2e.test`;
    expect((await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "E2E Watcher", email, password: PASSWORD }) })).status).toBe(201);
    const token = await apiLogin(email);
    const order = await call<{ total: number; payments: { id: string }[] }>("POST", "/orders", token, { packageId: pkg.id });
    await sendPaymentWebhook({ eventId: `${s.run}-watch-pay`, paymentId: `mock_${order.payments[0].id}`, state: "PAID", amount: order.total });

    await loginViaUi(page, email);
    await page.goto(`/lessons/${lesson.id}/video`);
    const video = page.locator("video");
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
    await page.getByRole("button", { name: "Play" }).click();
    // The picture really advances: decoded frames, not just a successful HTTP response.
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.5);

    // Lesson videos are shown without a viewer watermark over the picture.
    await expect(page.getByTestId("video-watermark")).toHaveCount(0);
  });
});
