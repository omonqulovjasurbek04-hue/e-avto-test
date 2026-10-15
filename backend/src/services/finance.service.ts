import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { getPagination } from "../utils/pagination";

export interface OrderFilter {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
}

/** Back-office order list. Never returns provider payloads, only statuses and amounts. */
export const listOrders = async (q: OrderFilter) => {
  const { page, limit, skip, take } = getPagination(q.page, q.limit);
  const where: Prisma.OrderWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? { OR: [{ user: { name: { contains: q.search, mode: "insensitive" } } }, { user: { email: { contains: q.search, mode: "insensitive" } } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where, orderBy: { createdAt: "desc" }, skip, take,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { select: { title: true, unitAmount: true } },
        payments: { select: { id: true, provider: true, status: true, amount: true, paidAt: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { items, page, limit, total };
};

/**
 * Revenue counts only orders the server marked PAID (i.e. confirmed by a verified provider event
 * or a zero-amount order). Completed refunds are subtracted and also shown separately.
 */
export const summary = async (from: Date, to: Date) => {
  const [paid, refunds, byStatus] = await Promise.all([
    prisma.order.aggregate({ where: { status: { in: ["PAID", "REFUNDED"] }, paidAt: { gte: from, lt: to } }, _sum: { total: true, discountTotal: true }, _count: true }),
    prisma.refund.aggregate({ where: { status: "DONE", createdAt: { gte: from, lt: to } }, _sum: { amount: true }, _count: true }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: from, lt: to } }, _count: true }),
  ]);
  const gross = paid._sum.total ?? 0;
  const refunded = refunds._sum.amount ?? 0;
  return {
    from, to,
    currency: "UZS",
    paidOrders: paid._count,
    gross,
    refunded,
    refundCount: refunds._count,
    net: gross - refunded,
    discountsGiven: paid._sum.discountTotal ?? 0,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
  };
};
