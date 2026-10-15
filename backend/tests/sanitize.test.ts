import { describe, expect, it } from "vitest";
import { sanitizeRichText, slugify, toPlainText } from "../src/lib/sanitize";

describe("sanitizeRichText", () => {
  it("removes scripts, event handlers and javascript: links", () => {
    const out = sanitizeRichText('<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">a</a><img src="x" onerror="alert(1)">');
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain("<p>Hi</p>");
  });

  it("drops iframes and inline styles but keeps safe formatting", () => {
    const out = sanitizeRichText('<iframe src="https://evil.example"></iframe><p style="x">ok <strong>b</strong></p>');
    expect(out).toBe("<p>ok <strong>b</strong></p>");
  });

  it("adds rel=noopener to new-tab links and blocks data: images", () => {
    expect(sanitizeRichText('<a href="https://a.uz" target="_blank">x</a>')).toContain('rel="noopener noreferrer"');
    expect(sanitizeRichText('<img src="data:text/html;base64,AAAA">')).not.toContain("data:");
  });
});

describe("toPlainText / slugify", () => {
  it("strips all tags", () => expect(toPlainText("<b>Salom</b><script>x</script>")).toBe("Salom"));
  it("creates url-safe slugs from Uzbek text", () => {
    expect(slugify("Yo'l harakati qoidalari!")).toBe("yol-harakati-qoidalari");
    expect(slugify("  --Ўзбек--  ")).toBe("");
  });
});
