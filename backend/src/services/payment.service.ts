import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { getProvider } from "../lib/payments";
import { InvalidSignatureError, VerifiedPaymentEvent } from "../lib/payments/provider";
import { decide } from "../lib/payments/transition";
import { badRequest, HttpError, notFound } from "../utils/errors";
import { writeAudit } from "./audit.service";
import { reserveCouponSlot } from "./catalog.service";
import { dispatchEmails, notify } from "./notification.service";

/**
 * Marks payment + order paid and grants course access. Runs in one transaction and only
 * from a verified provider event (or a zero-amount order), never from a browser redirect.
 */
export const fulfilOrder = async (paymentId: string, source: string): Promise<void> => {
  let emailId: string | null = null;
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { order: { include: { items: { include: { package: true } } } } },
    });
    const paidAt = new Date();
    await tx.payment.update({ where: { id: paymentId }, data: { status: "PAID", paidAt } });
    await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID", paidAt } });

    for (const item of payment.order.items) {
      if (!item.courseId) continue;
      const days = item.package?.durationDays ?? null;
      const expiresAt = days ? new Date(paidAt.getTime() + days * 86_400_000) : null;
      // One enrollment per user+course: renewals extend the existing row.
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: payment.order.userId, courseId: item.courseId } },
        create: { userId: payment.order.userId, courseId: item.courseId, packageId: item.packageId, orderId: payment.orderId, expiresAt },
        update: { status: "ACTIVE", packageId: item.packageId, orderId: payment.orderId, expiresAt, startsAt: paidAt },
      });
    }

    emailId = await notify(
      { userId: payment.order.userId, type: "PAYMENT_PAID", dedupeKey: `payment:${paymentId}`, template: "PAYMENT_PAID", vars: { amount: Math.round(payment.amount / 100) }, email: true },
      tx
    );
    // A late confirmation of an order we had already expired: the coupon slot was released, so take it back
    // if one is left. The customer paid the discounted price, so access is granted either way.
    if (payment.order.couponId && !(await tx.couponRedemption.findUnique({ where: { orderId: payment.orderId } }))) {
      if (await reserveCouponSlot(tx, payment.order.couponId)) {
        await tx.couponRedemption.create({ data: { couponId: payment.order.couponId, userId: payment.order.userId, orderId: payment.orderId } });
      }
    }
    await writeAudit({ actorId: null, action: "payment.paid", entity: "Payment", entityId: paymentId, after: { source, amount: payment.amount } }, tx);
  });
  // Sent after the transaction is committed: a slow mail server must not hold database locks.
  dispatchEmails([emailId]);
};

/** Releases the coupon slot of an order that will never be paid. */
export const releaseCoupon = async (tx: Prisma.TransactionClient, orderId: string) => {
  const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
  if (!redemption) return;
  await tx.couponRedemption.delete({ where: { orderId } });
  await tx.$executeRaw`UPDATE "coupons" SET "redeemedCount" = GREATEST("redeemedCount" - 1, 0) WHERE "id" = ${redemption.couponId}`;
};

export type WebhookResult = { status: "processed" | "duplicate" | "ignored" | "rejected"; reason?: string };

/**
 * Entry point for provider callbacks. Order of checks: provider exists → signature valid →
 * event not seen before (unique key) → payment known → amounts match → state transition.
 */
export const handleWebhook = async (
  providerName: string,
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
): Promise<WebhookResult> => {
  const provider = getProvider(providerName);
  if (!provider) throw notFound("Unknown payment provider");

  let event: VerifiedPaymentEvent;
  try {
    event = provider.verifyWebhook(rawBody, headers);
  } catch (err) {
    if (err instanceof InvalidSignatureError) throw new HttpError(401, "Invalid signature");
    throw badRequest("Malformed payment notification");
  }

  const payment = await prisma.payment.findUnique({
    where: { provider_providerPaymentId: { provider: provider.name, providerPaymentId: event.providerPaymentId } },
  });

  // Record the event first: the unique (provider, providerEventId) key makes replays no-ops.
  try {
    await prisma.paymentEvent.create({
      data: {
        provider: provider.name,
        providerEventId: event.providerEventId,
        type: event.type,
        payload: event.payload as Prisma.InputJsonValue,
        paymentId: payment?.id ?? null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { status: "duplicate" };
    throw err;
  }

  if (!payment) return { status: "ignored", reason: "unknown_payment" };

  const decision = decide({
    current: payment.status,
    state: event.state,
    eventAmount: event.amount,
    eventCurrency: event.currency,
    paymentAmount: payment.amount,
    paymentCurrency: payment.currency,
  });

  switch (decision.action) {
    case "fulfil":
      await fulfilOrder(payment.id, `webhook:${provider.name}`);
      return { status: "processed" };
    case "close": {
      const status = decision.status;
      await prisma.$transaction(async (tx) => {
        // Conditional update: if a concurrent "paid" event won, this is a no-op.
        const res = await tx.payment.updateMany({
          where: { id: payment.id, status: { in: ["PENDING", "REQUIRES_ACTION"] } },
          data: { status },
        });
        if (res.count === 1) {
          await tx.order.update({ where: { id: payment.orderId }, data: { status: status === "FAILED" ? "CANCELLED" : status } });
          await releaseCoupon(tx, payment.orderId);
        }
      });
      return { status: "processed" };
    }
    case "ignore":
      return { status: "ignored", reason: decision.reason };
    case "reject":
      await writeAudit({ actorId: null, action: "payment.rejected", entity: "Payment", entityId: payment.id, reason: decision.reason });
      return { status: "rejected", reason: decision.reason };
  }
};

/**
 * Closes unpaid orders whose time ran out. Every update is conditional on the order still being
 * PENDING, so a payment confirmed at the same moment wins and nothing is expired under it.
 */
export const expireStaleOrders = async (now: Date = new Date()): Promise<number> => {
  const stale = await prisma.order.findMany({ where: { status: "PENDING", expiresAt: { lt: now } }, select: { id: true }, take: 200 });
  let expired = 0;
  for (const { id } of stale) {
    await prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({ where: { id, status: "PENDING" }, data: { status: "EXPIRED" } });
      if (res.count !== 1) return;
      await tx.payment.updateMany({ where: { orderId: id, status: { in: ["PENDING", "REQUIRES_ACTION"] } }, data: { status: "EXPIRED" } });
      await releaseCoupon(tx, id);
      await writeAudit({ actorId: null, action: "order.expired", entity: "Order", entityId: id }, tx);
      expired++;
    });
  }
  return expired;
};
