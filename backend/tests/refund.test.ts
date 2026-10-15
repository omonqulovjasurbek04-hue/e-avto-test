import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: refunds, order expiry and late payment confirmations. Needs PostgreSQL (TEST_DATABASE_URL).
process.env.PAYMENT_PROVIDER = "mock";
process.env.PAYMENT_MOCK_SECRET = "refund-test-secret";
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `r${Date.now()}`;
const SECRET = "refund-test-secret";

describe.skipIf(!enabled)("refunds and order expiry", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let sign: typeof import("../src/lib/payments/mock.provider").signMock;
  let expireStaleOrders: typeof import("../src/services/payment.service").expireStaleOrders;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let courseId = "";
  let lessonId = "";
  let packageId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "FINANCE" | "ADMIN") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run}-${k}`, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    tok[k] = res.body.data.token;
  };

  const hook = (payload: Record<string, unknown>) => {
    const raw = JSON.stringify({ currency: "UZS", ...payload });
    return request(app).post("/api/payments/webhook/mock").set("Content-Type", "application/json").set("x-signature", sign(SECRET, raw)).send(raw);
  };

  /** Orders the package as `who` and returns the order with its payment. */
  const order = async (who: string) => {
    const res = await request(app).post("/api/orders").set(bearer(who)).send({ packageId });
    expect(res.status).toBe(201);
    return res.body.data as { id: string; total: number; payments: { id: string }[] };
  };
  const pay = async (o: { total: number; payments: { id: string }[] }, eventId: string) =>
    hook({ eventId, paymentId: `mock_${o.payments[0].id}`, state: "PAID", amount: o.total });
  const refundApi = (who: string, paymentId: string, amount: number) =>
    request(app).post(`/api/admin/finance/payments/${paymentId}/refunds`).set(bearer(who)).send({ amount, reason: "test refund" });
  const locked = async (who: string) => (await request(app).get(`/api/lessons/${lessonId}`).set(bearer(who))).body.data.locked as boolean;

  beforeAll(async () => {
    process.env.ENFORCE_ENROLLMENT = "true";
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    ({ signMock: sign } = await import("../src/lib/payments/mock.provider"));
    ({ expireStaleOrders } = await import("../src/services/payment.service"));
    await signup("admin", "ADMIN");
    await signup("finance", "FINANCE");
    await signup("buyer");
    await signup("late");
    await signup("race");

    const course = await prisma.course.create({ data: { title: `Refund ${run}`, description: "d" } });
    courseId = course.id;
    lessonId = (await prisma.lesson.create({ data: { courseId, title: "L", content: "secret", videoUrl: "https://cdn.example.com/v.mp4" } })).id;
    const pkg = await request(app).post("/api/admin/catalog/packages").set(bearer("admin")).send({ courseId, name: "Refundable" });
    packageId = pkg.body.data.id;
    await request(app).post(`/api/admin/catalog/packages/${packageId}/prices`).set(bearer("admin")).send({ amount: 100_000 });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.refund.deleteMany({ where: { payment: { order: { userId: { in: ids } } } } });
    await prisma.payment.deleteMany({ where: { order: { userId: { in: ids } } } });
    await prisma.order.deleteMany({ where: { userId: { in: ids } } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("only finance/superadmin may move money; admins and students may not", async () => {
    const o = await order("buyer");
    await pay(o, `${run}-p1`);
    expect((await refundApi("buyer", o.payments[0].id, 1000)).status).toBe(403);
    expect((await refundApi("admin", o.payments[0].id, 1000)).status).toBe(403);
    expect((await request(app).get("/api/admin/finance/refunds").set(bearer("admin"))).status).toBe(403);
  });

  it("partial refund keeps access, over-refund is rejected, full refund revokes access", async () => {
    const o = (await request(app).get("/api/orders").set(bearer("buyer"))).body.data[0];
    const paymentId = o.payments[0].id as string;
    expect(await locked("buyer")).toBe(false);

    const part = await refundApi("finance", paymentId, 30_000);
    expect(part.status).toBe(201);
    expect(part.body.data.status).toBe("DONE"); // the mock provider confirms immediately
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe("PARTIALLY_REFUNDED");
    expect(await locked("buyer")).toBe(false);

    expect((await refundApi("finance", paymentId, 80_000)).status).toBe(400); // only 70 000 left

    expect((await refundApi("finance", paymentId, 70_000)).status).toBe(201);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe("REFUNDED");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("REFUNDED");
    expect(await locked("buyer")).toBe(true);
    expect((await refundApi("finance", paymentId, 1)).status).toBe(409);
  });

  it("parallel refunds can never exceed the amount paid", async () => {
    const o = await order("race");
    await pay(o, `${run}-p2`);
    const results = await Promise.all([refundApi("finance", o.payments[0].id, 60_000), refundApi("finance", o.payments[0].id, 60_000), refundApi("finance", o.payments[0].id, 60_000)]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const total = await prisma.refund.aggregate({ where: { paymentId: o.payments[0].id, status: { in: ["PENDING", "DONE"] } }, _sum: { amount: true } });
    expect(total._sum.amount).toBe(60_000);
  });

  it("a provider without refund support leaves it pending until finance confirms or rejects it", async () => {
    const buyer = uid.buyer;
    const o = await prisma.order.create({ data: { userId: buyer, status: "PAID", subtotal: 50_000, total: 50_000, paidAt: new Date() } });
    const pm = await prisma.payment.create({ data: { orderId: o.id, provider: "manual-bank", providerPaymentId: `${run}-bank`, status: "PAID", amount: 50_000, paidAt: new Date() } });

    const created = await refundApi("finance", pm.id, 50_000);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("PENDING");
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: pm.id } })).status).toBe("PAID"); // nothing returned yet

    const id = created.body.data.id as string;
    expect((await request(app).post(`/api/admin/finance/refunds/${id}/complete`).set(bearer("finance"))).status).toBe(200);
    expect((await request(app).post(`/api/admin/finance/refunds/${id}/complete`).set(bearer("finance"))).status).toBe(409);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: pm.id } })).status).toBe("REFUNDED");

    const o2 = await prisma.order.create({ data: { userId: buyer, status: "PAID", subtotal: 10_000, total: 10_000, paidAt: new Date() } });
    const pm2 = await prisma.payment.create({ data: { orderId: o2.id, provider: "manual-bank", providerPaymentId: `${run}-bank2`, status: "PAID", amount: 10_000, paidAt: new Date() } });
    const r2 = await refundApi("finance", pm2.id, 10_000);
    expect((await request(app).post(`/api/admin/finance/refunds/${r2.body.data.id}/reject`).set(bearer("finance")).send({ reason: "customer withdrew" })).status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: pm2.id } })).status).toBe("PAID");
    expect((await refundApi("finance", pm2.id, 10_000)).status).toBe(201); // a rejected refund frees the amount
  });

  it("every refund action is audited", async () => {
    expect(await prisma.auditLog.count({ where: { action: { in: ["refund.create", "refund.complete", "refund.reject"] }, actorId: uid.finance } })).toBeGreaterThanOrEqual(6);
  });

  it("expires unpaid orders, releases their coupon, and never expires one that was paid in time", async () => {
    const coupon = await prisma.coupon.create({ data: { code: `EXP${run}`.toUpperCase().slice(0, 24), type: "PERCENT", value: 10, maxRedemptions: 5, redeemedCount: 1 } });
    const stale = await prisma.order.create({ data: { userId: uid.late, status: "PENDING", subtotal: 100_000, discountTotal: 10_000, total: 90_000, couponId: coupon.id, expiresAt: new Date(Date.now() - 60_000) } });
    await prisma.couponRedemption.create({ data: { couponId: coupon.id, userId: uid.late, orderId: stale.id } });
    const pm = await prisma.payment.create({ data: { orderId: stale.id, provider: "mock", providerPaymentId: `mock_${run}-late`, status: "REQUIRES_ACTION", amount: 90_000 } });
    await prisma.orderItem.create({ data: { orderId: stale.id, packageId, courseId, title: "late", unitAmount: 100_000 } });

    const fresh = await order("late"); // not expired, unpaid
    expect(await expireStaleOrders()).toBeGreaterThanOrEqual(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: stale.id } })).status).toBe("EXPIRED");
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: pm.id } })).status).toBe("EXPIRED");
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redeemedCount).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe("PENDING");

    // The provider confirms the payment AFTER our timeout: the money is real, so access is granted.
    const late = await hook({ eventId: `${run}-late-ok`, paymentId: `mock_${run}-late`, state: "PAID", amount: 90_000 });
    expect(late.body.data.status).toBe("processed");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: stale.id } })).status).toBe("PAID");
    expect(await prisma.enrollment.count({ where: { userId: uid.late, courseId } })).toBe(1);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redeemedCount).toBe(1);

    // Paid just before the deadline: the sweep must leave it alone.
    await prisma.order.update({ where: { id: fresh.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await pay(fresh, `${run}-fresh-ok`);
    await expireStaleOrders();
    expect((await prisma.order.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe("PAID");
  });
});
