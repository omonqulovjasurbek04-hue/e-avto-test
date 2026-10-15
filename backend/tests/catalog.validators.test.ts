import { describe, expect, it } from "vitest";
import { couponSchema, discountSchema, quoteSchema } from "../src/validators/catalog";

describe("catalog validators", () => {
  it("rejects percent discounts above 100", () => {
    expect(discountSchema.safeParse({ name: "Big", type: "PERCENT", value: 150 }).success).toBe(false);
    expect(discountSchema.safeParse({ name: "Ok", type: "PERCENT", value: 20 }).success).toBe(true);
  });

  it("normalises coupon codes and rejects bad characters", () => {
    const ok = couponSchema.parse({ code: " yoz2026 ", type: "FIXED", value: 5000 });
    expect(ok.code).toBe("YOZ2026");
    expect(couponSchema.safeParse({ code: "a b", type: "FIXED", value: 5000 }).success).toBe(false);
  });

  it("quote accepts only a package id and an optional code — no amount field is read", () => {
    const parsed = quoteSchema.parse({ packageId: "6f1c1f3e-8d0c-4b8e-9d57-2b7f0a9d1c11", amount: 1 });
    expect(parsed).not.toHaveProperty("amount");
  });
});

import { httpUrl, httpsUrl } from "../src/validators/common";
import { updateProfileSchema } from "../src/validators/auth";
import { slotUpdateSchema } from "../src/validators/groups";

describe("url validators block script-capable schemes", () => {
  it("accepts web URLs only", () => {
    expect(httpUrl.safeParse("https://cdn.example.com/a.mp4").success).toBe(true);
    for (const bad of ["javascript:alert(1)", "data:text/html;base64,AAAA", "file:///etc/passwd", "//evil.example/x", "not a url"]) {
      expect(httpUrl.safeParse(bad).success).toBe(false);
    }
    expect(httpsUrl.safeParse("http://insecure.example").success).toBe(false);
  });
  it("applies to profile avatars and lesson meeting links on update, not just create", () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(slotUpdateSchema.safeParse({ onlineUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(slotUpdateSchema.safeParse({ onlineUrl: "https://meet.example.com/x" }).success).toBe(true);
  });
});
