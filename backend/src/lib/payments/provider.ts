export type ProviderPaymentState = "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";

/** A verified, provider-neutral notification. Provider statuses are mapped into this set. */
export interface VerifiedPaymentEvent {
  providerEventId: string;
  providerPaymentId: string;
  state: ProviderPaymentState;
  amount: number; // minor units
  currency: string;
  type: string;
  /** Sanitised payload kept for audit; must never contain card data or secrets. */
  payload: Record<string, unknown>;
}

export interface PaymentSession {
  providerPaymentId: string;
  /** Where to send the browser to pay. Returning there does NOT confirm payment. */
  redirectUrl: string | null;
}

export class InvalidSignatureError extends Error {
  constructor() {
    super("Invalid payment signature");
    this.name = "InvalidSignatureError";
  }
}

export interface RefundResult {
  /** DONE = the provider confirmed the refund; PENDING = accepted but not confirmed yet. */
  status: "DONE" | "PENDING";
}

export interface PaymentProvider {
  readonly name: string;
  /** Optional: providers without an API for refunds leave it out and the refund stays PENDING for manual completion. */
  refund?(input: { providerPaymentId: string; refundId: string; amount: number; currency: string }): Promise<RefundResult>;
  createSession(input: { paymentId: string; orderId: string; amount: number; currency: string }): Promise<PaymentSession>;
  /** Must throw InvalidSignatureError unless the raw body is authentic. */
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): VerifiedPaymentEvent;
}
