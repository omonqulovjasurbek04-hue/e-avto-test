import { describe, expect, it } from "vitest";
import { isEnrollmentActive } from "../src/services/access.service";

const now = new Date("2026-06-01T00:00:00Z");
const day = 86_400_000;
const e = (o = {}) => ({ status: "ACTIVE" as const, startsAt: new Date(now.getTime() - day), expiresAt: null, ...o });

describe("isEnrollmentActive", () => {
  it("is active without an expiry", () => expect(isEnrollmentActive(e(), now)).toBe(true));
  it("is active before expiry", () => expect(isEnrollmentActive(e({ expiresAt: new Date(now.getTime() + day) }), now)).toBe(true));
  it("is inactive at or after expiry", () => {
    expect(isEnrollmentActive(e({ expiresAt: now }), now)).toBe(false);
    expect(isEnrollmentActive(e({ expiresAt: new Date(now.getTime() - 1) }), now)).toBe(false);
  });
  it("is inactive when revoked, expired or not yet started", () => {
    expect(isEnrollmentActive(e({ status: "REVOKED" }), now)).toBe(false);
    expect(isEnrollmentActive(e({ status: "EXPIRED" }), now)).toBe(false);
    expect(isEnrollmentActive(e({ startsAt: new Date(now.getTime() + day) }), now)).toBe(false);
  });
});
