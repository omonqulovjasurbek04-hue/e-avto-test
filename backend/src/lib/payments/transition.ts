import { PaymentStatus } from "@prisma/client";
import { ProviderPaymentState } from "./provider";

export type Decision =
  | { action: "fulfil" }
  | { action: "close"; status: "FAILED" | "CANCELLED" | "EXPIRED" }
  | { action: "ignore"; reason: string }
  | { action: "reject"; reason: string };

/**
 * Pure state machine for a verified provider event. Money amounts must match what the server
 * stored; a mismatching "paid" event is rejected, never fulfilled.
 */
export const decide = (input: {
  current: PaymentStatus;
  state: ProviderPaymentState;
  eventAmount: number;
  eventCurrency: string;
  paymentAmount: number;
  paymentCurrency: string;
}): Decision => {
  const open = input.current === "PENDING" || input.current === "REQUIRES_ACTION";

  if (input.state === "PAID") {
    if (input.eventAmount !== input.paymentAmount || input.eventCurrency !== input.paymentCurrency) {
      return { action: "reject", reason: "amount_mismatch" };
    }
    if (input.current === "PAID") return { action: "ignore", reason: "already_paid" };
    // Our own timeout (EXPIRED) does not undo a payment the provider really took; FAILED/CANCELLED/REFUNDED stay as they are.
    if (!open && input.current !== "EXPIRED") return { action: "ignore", reason: `payment_${input.current.toLowerCase()}` };
    return { action: "fulfil" };
  }

  if (!open) return { action: "ignore", reason: `payment_${input.current.toLowerCase()}` };
  return { action: "close", status: input.state };
};
