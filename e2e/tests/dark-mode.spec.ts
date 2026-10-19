import { expect, test, type Page } from "@playwright/test";
import { loginViaUi, state } from "./helpers";

// Dark mode regression: on every main page, visible text must keep at least 3:1 contrast against the
// surface it sits on. (It caught dark:bg-brand-950 classes that generated nothing because the palette
// had no 950 shade, leaving light-blue text on white badges.) Text over gradients/images is skipped.
const PUBLIC = ["/", "/courses", "/news", "/faq", "/contact", "/about", "/privacy", "/login", "/register", "/forgot-password"];
const STUDENT = ["/dashboard", "/lessons", "/tests", "/pricing", "/leaderboard", "/profile", "/settings", "/orders", "/schedule", "/attendance", "/notifications"];

const lowContrast = () => {
  const lum = (c: number[]) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
  const bgOf = (el: Element | null): number[] => {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c.slice(0, 3);
      if (getComputedStyle(e).backgroundImage !== "none") return [];
    }
    return [255, 255, 255];
  };
  const bad: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !n.textContent?.trim()) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (r.width === 0 || st.visibility === "hidden" || Number(st.opacity) < 0.3) continue;
    const bg = bgOf(el);
    if (bg.length === 0) continue; // gradient/image background: skip
    const fg = parse(st.color);
    const a = (fg[3] ?? 1);
    const mixed = fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
    const [l1, l2] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
    const ratio = (l1 + 0.05) / (l2 + 0.05);
    if (ratio < 3) bad.push(`${ratio.toFixed(2)} "${n.textContent.trim().slice(0, 40)}" <${el.tagName.toLowerCase()} class="${el.className.toString().slice(0, 90)}">`);
  }
  return bad;
};

async function check(page: Page, path: string, failures: string[]) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // fade-in animations
  const bad = await page.evaluate(lowContrast);
  failures.push(...bad.map((b) => `${path}: ${b}`));
}

test("dark mode keeps readable contrast on public and student pages", async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem("e_avto_theme", "dark"));
  const failures: string[] = [];
  for (const p of PUBLIC) await check(page, p, failures);
  const s = state();
  await loginViaUi(page, s.emails.student);
  for (const p of [...STUDENT, `/courses/${s.ids.course}`, `/lessons/${s.ids.lesson}`]) await check(page, p, failures);
  expect(failures).toEqual([]);
});
