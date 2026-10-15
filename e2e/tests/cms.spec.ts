import { expect, test } from "@playwright/test";
import { API } from "../playwright.config";
import { apiGet, apiLogin, state } from "./helpers";

async function adminCall<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = await apiLogin(state().emails.admin);
  const res = await fetch(`${API}${url}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json()) as { data: T; message?: string };
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${json.message ?? ""}`);
  return json.data;
}

test.describe.serial("CMS-driven public site", () => {
  test("setup: admin publishes news, FAQ and site settings", async () => {
    const s = state();
    await adminCall("POST", "/admin/cms/news", {
      slug: `yangilik-${s.run}`,
      title: `Yangilik ${s.run}`,
      summary: "Qisqa mazmun",
      status: "PUBLISHED",
      content: '<p>Salom E2E</p><script>window.__xss=1</script><img src="x" onerror="window.__xss=1">',
    });
    await adminCall("POST", "/admin/cms/news", { slug: `qoralama-${s.run}`, title: `Qoralama ${s.run}`, content: "<p>Maxfiy</p>", status: "DRAFT" });
    await adminCall("POST", "/admin/cms/faq", { question: `Savol ${s.run}?`, answer: "<p>CMS javobi</p>" });
    await adminCall("PUT", "/admin/cms/site-settings", { siteName: "E2E Avto", phone: "+998 90 123 45 67", heroTitle: `Sarlavha ${s.run}` });
  });

  test("published news is listed, drafts are not, scripts never run", async ({ page }) => {
    const s = state();
    await page.goto("/news");
    await expect(page.getByText(`Yangilik ${s.run}`)).toBeVisible();
    await expect(page.getByText(`Qoralama ${s.run}`)).toHaveCount(0);

    await page.goto(`/news/yangilik-${s.run}`);
    await expect(page.getByText("Salom E2E")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await expect(page.locator("article script")).toHaveCount(0);
    await expect(page.locator("article img[onerror]")).toHaveCount(0);

    await page.goto(`/news/qoralama-${s.run}`);
    await expect(page.getByText("404")).toBeVisible();
  });

  test("FAQ, site name and hero text come from the admin panel", async ({ page }) => {
    const s = state();
    await page.goto("/faq");
    await expect(page.getByRole("button", { name: `Savol ${s.run}?` })).toBeVisible();

    await page.goto("/");
    await expect(page.getByText(`Sarlavha ${s.run}`)).toBeVisible();
    await expect(page.getByText("E2E Avto").first()).toBeVisible();
  });

  test("the home page shows the real numbers from the database, not marketing placeholders", async ({ page }) => {
    const stats = ((await (await fetch(`${API}/public-stats`)).json()) as { data: { users: number; questions: number; testsTaken: number; passRate: number | null } }).data;
    await page.goto("/");

    // The four figures render in a fixed order: users, questions, pass rate, tests taken. They load after the page appears.
    const figure = (i: number) => page.locator("div.text-3xl.font-black").nth(i);
    const digits = (n: number) => String(n);
    await expect(figure(0)).toHaveText(new RegExp(`^${digits(stats.users).split("").join("[\s\u00a0]?")}$`));
    await expect.poll(async () => (await figure(1).innerText()).replace(/D/g, "")).toBe(digits(stats.questions));
    await expect.poll(async () => (await figure(2).innerText()).trim()).toBe(stats.passRate === null ? "—" : `${stats.passRate}%`);
    await expect.poll(async () => (await figure(3).innerText()).replace(/D/g, "")).toBe(digits(stats.testsTaken));

    // The old hard-coded claims must be gone (checked with and without non-breaking spaces).
    const text = (await page.locator("body").innerText()).replace(/[s ]/g, "");
    for (const fake of ["15000+", "120+", "94%", "4.9"]) {
      if (String(stats.questions) + "+" !== fake) expect(text).not.toContain(fake);
    }
  });

  test("the contact form stores a message that the admin can read as plain text", async ({ page }) => {
    const s = state();
    await page.goto("/contact");
    await expect(page.getByText("+998 90 123 45 67").first()).toBeVisible();

    await page.getByLabel("Ism").fill(`Tester ${s.run}`);
    await page.getByLabel("Email").fill("tester@e2e.test");
    await page.getByLabel(/Mavzu/i).fill("Narx haqida");
    await page.getByLabel("Xabar").fill("Salom <b>kurs</b> narxlarini bilmoqchiman, rahmat");
    await page.getByRole("button", { name: /Yuborish/i }).click();
    await expect(page.getByText("Xabar muvaffaqiyatli yuborildi!")).toBeVisible();

    const messages = await adminCall<{ name: string; message: string }[]>("GET", "/admin/cms/messages");
    const mine = messages.find((m) => m.name === `Tester ${s.run}`);
    expect(mine).toBeDefined();
    expect(mine!.message).toContain("Narx haqida");
    expect(mine!.message).not.toContain("<b>");
  });

  test("a bot that fills the hidden field leaves no message behind", async () => {
    const s = state();
    const before = (await adminCall<unknown[]>("GET", "/admin/cms/messages")).length;
    const res = await fetch(`${API}/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `Bot ${s.run}`, contact: "bot@spam.test", message: "buy cheap things right now", website: "http://spam.test" }) });
    expect(res.status).toBe(201);
    expect((await adminCall<unknown[]>("GET", "/admin/cms/messages")).length).toBe(before);
    expect(await apiGet<unknown>("/public-stats", await apiLogin(s.emails.student))).toHaveProperty("users");
  });

  test("a published CMS page replaces the built-in About and Privacy texts; a draft does not", async ({ page }) => {
    const s = state();
    const publish = async (slug: string, title: string, content: string, status: "PUBLISHED" | "DRAFT") => {
      // The slugs are unique and the e2e database is reused between runs: create, or update the existing page.
      const pages = await adminCall<{ id: string; slug: string }[]>("GET", "/admin/cms/pages");
      const existing = pages.find((p) => p.slug === slug);
      if (existing) await adminCall("PUT", `/admin/cms/pages/${existing.id}`, { title, content, status });
      else await adminCall("POST", "/admin/cms/pages", { slug, title, content, status });
    };

    await publish("about", `Biz haqimizda ${s.run}`, "<p>CMS matni <script>window.__x=1</script>haqida</p>", "PUBLISHED");
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: `Biz haqimizda ${s.run}` })).toBeVisible();
    await expect(page.getByText("CMS matni")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __x?: number }).__x)).toBeUndefined();

    // Back to a draft: the visitor sees the built-in page again, never the draft.
    await publish("about", `Qoralama ${s.run}`, "<p>Hali tayyor emas</p>", "DRAFT");
    await page.goto("/about");
    await expect(page.getByText(`Qoralama ${s.run}`)).toHaveCount(0);
    await expect(page.getByText("Hali tayyor emas")).toHaveCount(0);

    await publish("privacy", `Maxfiylik ${s.run}`, "<p>Haqiqiy siyosat matni</p>", "PUBLISHED");
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: `Maxfiylik ${s.run}` })).toBeVisible();
    await expect(page.getByText("namuna matn")).toHaveCount(0); // the sample-text warning disappears with the real policy
  });
});
