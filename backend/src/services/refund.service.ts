import { prisma } from "../config/database";
import { getProvider } from "../lib/payments";
import { badRequest, conflict, notFound } from "../utils/errors";
import { writeAudit } from "./audit.service";

/**
 * Refund lifecycle:  create (PENDING) -> provider confirms (or finance confirms by hand) -> DONE
 *                                     \-> REJECTED
 * Revenue only subtracts DONE refunds, and access is revoked only when the payment is refunded in full.
 */

/** Creates a refund request. The payment row is locked, so parallel requests cannot refund more than was paid. */
export const createRefund = async (actorId: string, paymentId: string, amount: number, reason: string) => {
  const refund = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ amount: number; status: string }[]>`
      SELECT "amount", "status"::text AS status FROM "payments" WHERE "id" = ${paymentId} FOR UPDATE`;
    if (rows.length === 0) throw notFound("Payment not found");
    if (!["PAID", "PARTIALLY_REFUNDED"].includes(rows[0].status)) throw conflict("Only a paid payment can be refunded");

    const active = await tx.refund.aggregate({ where: { paymentId, status: { in: ["PENDING", "DONE"] } }, _sum: { amount: true } });
    const remaining = rows[0].amount - (active._sum.amount ?? 0);
    if (amount > remaining) throw badRequest(`Refund exceeds the refundable amount (${remaining} left)`);

    const created = await tx.refund.create({ data: { paymentId, amount, reason, createdById: actorId } });
    await writeAudit({ actorId, action: "refund.create", entity: "Refund", entityId: created.id, after: { paymentId, amount }, reason }, tx);
    return created;
  });

  // Ask the provider if it supports refunds; otherwise the refund waits for a person to confirm it.
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  const provider = getProvider(payment.provider);
  if (provider?.refund && payment.providerPaymentId) {
    try {
      const res = await provider.refund({ providerPaymentId: payment.providerPaymentId, refundId: refund.id, amount, currency: payment.currency });
      if (res.status === "DONE") return completeRefund(actorId, refund.id);
    } catch {
      // The request stays PENDING and can be retried or confirmed manually; never mark money as returned on an error.
    }
  }
  return refund;
};

/** Marks a pending refund as returned and updates the payment, order and access accordingly. */
export const completeRefund = async (actorId: string, refundId: string) =>
  prisma.$transaction(async (tx) => {
    const claimed = await tx.refund.updateMany({ where: { id: refundId, status: "PENDING" }, data: { status: "DONE" } });
    if (claimed.count !== 1) {
      if (!(await tx.refund.findUnique({ where: { id: refundId }, select: { id: true } }))) throw notFound("Refund not found");
      throw conflict("This refund is not pending");
    }
    const refund = await tx.refund.findUniqueOrThrow({ where: { id: refundId }, include: { payment: true } });

    const done = await tx.refund.aggregate({ where: { paymentId: refund.paymentId, status: "DONE" }, _sum: { amount: true } });
    const full = (done._sum.amount ?? 0) >= refund.payment.amount;
    await tx.payment.update({ where: { id: refund.paymentId }, data: { status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    if (full) {
      await tx.order.update({ where: { id: refund.payment.orderId }, data: { status: "REFUNDED" } });
      // A fully refunded purchase no longer entitles the customer to the course.
      await tx.enrollment.updateMany({ where: { orderId: refund.payment.orderId, status: "ACTIVE" }, data: { status: "REVOKED" } });
    }
    await writeAudit({ actorId, action: "refund.complete", entity: "Refund", entityId: refundId, after: { amount: refund.amount, full } }, tx);
    return refund;
  });

export const rejectRefund = async (actorId: string, refundId: string, reason: string) =>
  prisma.$transaction(async (tx) => {
    const res = await tx.refund.updateMany({ where: { id: refundId, status: "PENDING" }, data: { status: "REJECTED" } });
    if (res.count !== 1) throw conflict("Only a pending refund can be rejected");
    await writeAudit({ actorId, action: "refund.reject", entity: "Refund", entityId: refundId, reason }, tx);
    return { id: refundId, status: "REJECTED" };
  });

export const listRefunds = () =>
  prisma.refund.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { payment: { select: { id: true, amount: true, currency: true, order: { select: { id: true, user: { select: { name: true, email: true } } } } } } },
  });
