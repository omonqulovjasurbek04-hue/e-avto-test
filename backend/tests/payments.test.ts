import { describe, expect, it } from "vitest";
import { createMockProvider, signMock } from "../src/lib/payments/mock.provider";
import { InvalidSignatureError } from "../src/lib/payments/provider";
import { decide } from "../src/lib/payments/transition";

const SECRET = "test-secret-value";
const provider = createMockProvider(SECRET);
const body = (o: Record<string, unknown> = {}) =>
  Buffer.from(JSON.stringify({ eventId: "e1", paymentId: "mock_p1", state: "PAID", amount: 5000, currency: "UZS", ...o }));

describe("mock provider webhook signature", () => {
  it("accepts a correctly signed body", () => {
    const raw = body();
    const ev = provider.verifyWebhook(raw, { "x-signature": signMock(SECRET, raw) });
    expect(ev).toMatchObject({ providerEventId: "e1", providerPaymentId: "mock_p1", state: "PAID", amount: 5000 });
  });

  it("rejects a missing, wrong or other-secret signature", () => {
    const raw = body();
    expect(() => provider.verifyWebhook(raw, {})).toThrow(InvalidSignatureError);
    expect(() => provider.verifyWebhook(raw, { "x-signature": "deadbeef" })).toThrow(InvalidSignatureError);
    expect(() => provider.verifyWebhook(raw, { "x-signature": signMock("other", raw) })).toThrow(InvalidSignatureError);
  });

  it("rejects a body tampered with after signing (amount changed)", () => {
    const signature = signMock(SECRET, body({ amount: 5000 }));
    expect(() => provider.verifyWebhook(body({ amount: 1 }), { "x-signature": signature })).toThrow(InvalidSignatureError);
  });
});

describe("payment transition rules", () => {
  const base = { eventAmount: 5000, eventCurrency: "UZS", paymentAmount: 5000, paymentCurrency: "UZS" } as const;

  it("fulfils a matching paid event on an open payment", () => {
    expect(decide({ ...base, current: "REQUIRES_ACTION", state: "PAID" })).toEqual({ action: "fulfil" });
    expect(decide({ ...base, current: "PENDING", state: "PAID" })).toEqual({ action: "fulfil" });
  });

  it("never fulfils twice", () => {
    expect(decide({ ...base, current: "PAID", state: "PAID" })).toMatchObject({ action: "ignore" });
  });

  it("rejects a paid event whose amount or currency differs from the stored payment", () => {
    expect(decide({ ...base, current: "REQUIRES_ACTION", state: "PAID", eventAmount: 100 })).toMatchObject({ action: "reject" });
    expect(decide({ ...base, current: "REQUIRES_ACTION", state: "PAID", eventCurrency: "USD" })).toMatchObject({ action: "reject" });
  });

  it("does not resurrect a failed, cancelled or refunded payment", () => {
    for (const current of ["FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"] as const) {
      expect(decide({ ...base, current, state: "PAID" })).toMatchObject({ action: "ignore" });
    }
  });

  it("honours a confirmed payment even after our own order timeout (the money was really taken)", () => {
    expect(decide({ ...base, current: "EXPIRED", state: "PAID" })).toEqual({ action: "fulfil" });
    expect(decide({ ...base, current: "EXPIRED", state: "PAID", eventAmount: 1 })).toMatchObject({ action: "reject" });
  });

  it("closes an open payment on failure and ignores late failures after payment", () => {
    expect(decide({ ...base, current: "REQUIRES_ACTION", state: "FAILED" })).toEqual({ action: "close", status: "FAILED" });
    expect(decide({ ...base, current: "PAID", state: "CANCELLED" })).toMatchObject({ action: "ignore" });
  });
});
