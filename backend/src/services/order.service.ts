import { prisma } from "../config/database";
import { env } from "../config/env";
import { activeProvider } from "../lib/payments";
import { badRequest, conflict, HttpError, notFound } from "../utils/errors";
import { quote, reserveCouponSlot } from "./catalog.service";
import { fulfilOrder } from "./payment.service";

const orderInclude = {
  items: true,
  payments: { select: { id: true, provider: true, status: true, amount: true, currency: true, paidAt: true } },
} as const;

/** Ownership is part of the query: another user's order id is indistinguishable from a missing one. */
export const getOwnOrder = async (userId: string, orderId: string) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: orderInclude });
  if (!order) throw notFound("Order not found");
  return order;
};

export const listOwnOrders = (userId: string) =>
  prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, include: orderInclude });

/**
 * Creates an order for the signed-in user. Amount, discounts and coupon are recomputed here;
 * nothing price-related is accepted from the client. Order items snapshot the price paid.
 */
export const createOrder = async (userId: string, packageId: string, couponCode?: string) => {
  const provider = activeProvider();
  if (!provider) throw new HttpError(503, "Payments are not configured");

  const q = await quote(packageId, couponCode);
  if (couponCode && !q.couponApplied) throw badRequest(`Coupon cannot be applied (${q.couponRejection})`);

  const pkg = await prisma.coursePackage.findUniqueOrThrow({ where: { id: packageId }, include: { course: true } });
  const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: pkg.courseId } } });
  if (existing && existing.status === "ACTIVE" && (!existing.expiresAt || existing.expiresAt > new Date())) {
    throw conflict("You already have active access to this course");
  }

  const order = await prisma.$transaction(async (tx) => {
    if (q.couponId && !(await reserveCouponSlot(tx, q.couponId))) throw conflict("Coupon redemption limit reached");

    const created = await tx.order.create({
      data: {
        userId,
        subtotal: q.subtotal,
        discountTotal: q.discountTotal,
        total: q.total,
        currency: q.currency,
        couponId: q.couponId ?? null,
        expiresAt: new Date(Date.now() + env.ORDER_TTL_MINUTES * 60_000),
        items: {
          create: [
            { packageId, courseId: pkg.courseId, title: `${pkg.course.title} — ${pkg.name}`, unitAmount: q.subtotal, currency: q.currency },
          ],
        },
      },
    });
    if (q.couponId) await tx.couponRedemption.create({ data: { couponId: q.couponId, userId, orderId: created.id } });
    return created;
  });

  // Free after discounts: nothing to pay, grant access directly.
  if (order.total === 0) {
    const payment = await prisma.payment.create({
      data: { orderId: order.id, provider: "free", status: "PENDING", amount: 0, currency: order.currency },
    });
    await fulfilOrder(payment.id, "order.free");
    return getOwnOrder(userId, order.id);
  }

  const payment = await prisma.payment.create({
    data: { orderId: order.id, provider: provider.name, amount: order.total, currency: order.currency },
  });
  const session = await provider.createSession({ paymentId: payment.id, orderId: order.id, amount: order.total, currency: order.currency });
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId: session.providerPaymentId, status: "REQUIRES_ACTION" },
  });

  return { ...(await getOwnOrder(userId, order.id)), redirectUrl: session.redirectUrl };
};
