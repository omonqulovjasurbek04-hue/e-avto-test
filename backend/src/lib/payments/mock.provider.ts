import crypto from "crypto";
import { z } from "zod";
import { InvalidSignatureError, PaymentProvider, VerifiedPaymentEvent } from "./provider";

const bodySchema = z.object({
  eventId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  state: z.enum(["PAID", "FAILED", "CANCELLED", "EXPIRED"]),
  amount: z.number().int().min(0),
  currency: z.string().length(3),
});

export const signMock = (secret: string, rawBody: Buffer | string): string =>
  crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

/**
 * Test double for a real gateway (Payme/Click are NOT integrated). Uses the same shape a real
 * provider would: HMAC-signed JSON, a unique event id, and a provider payment id.
 */
export const createMockProvider = (secret: string): PaymentProvider => ({
  name: "mock",

  async refund() {
    return { status: "DONE" as const };
  },

  async createSession({ paymentId }) {
    return { providerPaymentId: `mock_${paymentId}`, redirectUrl: null };
  },

  verifyWebhook(rawBody, headers): VerifiedPaymentEvent {
    const given = String(headers["x-signature"] ?? "");
    const expected = signMock(secret, rawBody);
    const a = Buffer.from(given, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new InvalidSignatureError();

    const body = bodySchema.parse(JSON.parse(rawBody.toString("utf8")));
    return {
      providerEventId: body.eventId,
      providerPaymentId: body.paymentId,
      state: body.state,
      amount: body.amount,
      currency: body.currency,
      type: `payment.${body.state.toLowerCase()}`,
      payload: body,
    };
  },
});
