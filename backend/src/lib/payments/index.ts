import { env } from "../../config/env";
import { createMockProvider } from "./mock.provider";
import { PaymentProvider } from "./provider";

/** Only providers that are actually configured are returned; there is no real gateway yet. */
export const getProvider = (name: string): PaymentProvider | null => {
  if (name === "mock" && env.PAYMENT_PROVIDER === "mock" && env.PAYMENT_MOCK_SECRET) {
    return createMockProvider(env.PAYMENT_MOCK_SECRET);
  }
  return null;
};

export const activeProvider = (): PaymentProvider | null => getProvider(env.PAYMENT_PROVIDER);
