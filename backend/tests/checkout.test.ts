import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration test for order → webhook → enrollment. Needs PostgreSQL (TEST_DATABASE_URL) with migrations applied.
process.env.PAYMENT_PROVIDER = "mock";
process.env.PAYMENT_MOCK_SECRET = "checkout-test-secret";
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `c${Date.now()}`;
const PASSWORD = "Passw0rdOK";

describe.skipIf(!enabled)("checkout flow", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let sign: typeof import("../src/lib/payments/mock.provider").signMock;
  const userIds: string[] = [];
  let courseId = "";
  let packageId = "";
  let student = { token: "", id: "" };
  let other = { token: "", id: "" };
  let admin = { token: "" };

  const register = async (label: string) => {
    const res = await request(app).post("/api/auth/register").send({ name: label, email: `${run}-${label}@example.com`, password: PASSWORD });
    expect(res.status).toBe(201);
    userIds.push(res.body.data.user.id);
    return { token: res.body.data.token as string, id: res.body.data.user.id as string };
  };
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const hook = (payload: Record<string, unknown>, secret = "checkout-test-secret") => {
    const raw = JSON.stringify(payload);
    return request(app).post("/api/payments/webhook/mock").set("Content-Type", "application/json").set("x-signature", sign(secret, raw)).send(raw);
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    ({ signMock: sign } = await import("../src/lib/payments/mock.provider"));
    student = await register("student");
    other = await register("other");
    admin = await register("admin");
    await prisma.user.update({ where: { id: userIds[2] }, data: { role: "ADMIN" } });

    const course = await prisma.course.create({ data: { title: `Course ${run}`, description: "d" } });
    courseId = course.id;
    const pkg = await request(app).post("/api/admin/catalog/packages").set(bearer(admin.token)).send({ courseId, name: "Standart", durationDays: 30 });
    expect(pkg.status).toBe(201);
    packageId = pkg.body.data.id;
    const price = await request(app).post(`/api/admin/catalog/packages/${packageId}/prices`).set(bearer(admin.token)).send({ amount: 100_000, isSample: true });
    expect(price.status).toBe(201);
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.payment.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("students cannot manage the catalog", async () => {
    const res = await request(app).post("/api/admin/catalog/packages").set(bearer(student.token)).send({ courseId, name: "x" });
    expect(res.status).toBe(403);
  });

  it("ignores any client-supplied amount", async () => {
    const res = await request(app).post("/api/orders").set(bearer(student.token)).send({ packageId, amount: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(100_000);
  });

  it("grants access only after a verified webhook, and only once", async () => {
    const order = (await request(app).get("/api/orders").set(bearer(student.token))).body.data[0];
    const payment = order.payments[0];
    const event = { eventId: `${run}-e1`, paymentId: `mock_${payment.id}`, state: "PAID", amount: 100_000, currency: "UZS" };

    // browser-side "success" has no way to mark paid; enrollment is still absent
    expect(await prisma.enrollment.count({ where: { userId: student.id, courseId } })).toBe(0);
    // Only signed up so far: a user number, no student number.
    const before = (await request(app).get("/api/auth/me").set(bearer(student.token))).body.data;
    expect(typeof before.userNumber).toBe("number");
    expect(before.studentNumber).toBeUndefined();

    expect((await hook(event, "wrong-secret")).status).toBe(401);
    expect(await prisma.enrollment.count({ where: { userId: student.id, courseId } })).toBe(0);

    expect((await hook(event)).body.data.status).toBe("processed");
    expect((await hook(event)).body.data.status).toBe("duplicate");
    expect(await prisma.enrollment.count({ where: { userId: student.id, courseId } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: student.id, type: "PAYMENT_PAID" } })).toBe(1);

    const paid = await request(app).get(`/api/orders/${order.id}`).set(bearer(student.token));
    expect(paid.body.data.status).toBe("PAID");

    // The paid course makes the account a student; the sign-up number stays.
    const after = (await request(app).get("/api/auth/me").set(bearer(student.token))).body.data;
    expect(after.studentNumber).toBeGreaterThan(0);
    expect(after.userNumber).toBe(before.userNumber);
  });

  it("gives the student number once, in purchase order, and keeps it on renewal", async () => {
    const { studentNumber: first } = await prisma.user.findUniqueOrThrow({ where: { id: student.id } });

    // A renewal after the access ran out (second paid order for the same account) keeps the number.
    await prisma.enrollment.updateMany({ where: { userId: student.id, courseId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const renewal = await request(app).post("/api/orders").set(bearer(student.token)).send({ packageId });
    const renewalPayment = renewal.body.data.payments[0].id;
    expect((await hook({ eventId: `${run}-renew`, paymentId: `mock_${renewalPayment}`, state: "PAID", amount: 100_000, currency: "UZS" })).body.data.status).toBe("processed");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).studentNumber).toBe(first);

    // The admin list tells buyers and non-buyers apart.
    const students = await request(app).get("/api/admin/users").query({ kind: "student", search: `student${first}` }).set(bearer(admin.token));
    expect(students.body.data.map((u: { id: string }) => u.id)).toEqual([student.id]);
    const notBought = await request(app).get("/api/admin/users").query({ kind: "user", search: run }).set(bearer(admin.token));
    expect(notBought.body.data.map((u: { id: string }) => u.id)).not.toContain(student.id);
    expect(notBought.body.data.map((u: { id: string }) => u.id)).toContain(other.id);
  });

  it("rejects a paid event with a different amount", async () => {
    const res = await request(app).post("/api/orders").set(bearer(other.token)).send({ packageId });
    const paymentId = res.body.data.payments[0].id;
    const r = await hook({ eventId: `${run}-e2`, paymentId: `mock_${paymentId}`, state: "PAID", amount: 1, currency: "UZS" });
    expect(r.body.data.status).toBe("rejected");
    expect(await prisma.enrollment.count({ where: { userId: other.id, courseId } })).toBe(0);
  });


  it("processes concurrent duplicate callbacks exactly once", async () => {
    const orders = (await request(app).get("/api/orders").set(bearer(other.token))).body.data;
    const paymentId = `mock_${orders[0].payments[0].id}`;
    const raw = JSON.stringify({ eventId: `${run}-race`, paymentId, state: "PAID", amount: 100_000, currency: "UZS" });
    const send = () => request(app).post("/api/payments/webhook/mock").set("Content-Type", "application/json").set("x-signature", sign("checkout-test-secret", raw)).send(raw);
    const results = await Promise.all(Array.from({ length: 6 }, send));
    const statuses = results.map((r) => r.body.data?.status).sort();
    expect(statuses.filter((x) => x === "processed")).toHaveLength(1);
    expect(statuses.filter((x) => x === "duplicate")).toHaveLength(5);
    expect(await prisma.enrollment.count({ where: { userId: other.id, courseId } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: other.id, type: "PAYMENT_PAID" } })).toBe(1);

    // Six concurrent callbacks still draw a single student number: the next one after the first buyer.
    const [first, second] = await Promise.all([student.id, other.id].map((id) => prisma.user.findUniqueOrThrow({ where: { id } })));
    expect(second.studentNumber).toBe((first.studentNumber ?? 0) + 1);
  });

  it("a coupon with one use left is granted to exactly one of several simultaneous buyers", async () => {
    const code = `ONE${run}`.toUpperCase().slice(0, 24);
    const created = await request(app).post("/api/admin/catalog/coupons").set(bearer(admin.token)).send({ code, type: "PERCENT", value: 50, maxRedemptions: 1 });
    expect(created.status).toBe(201);
    const buyers = await Promise.all(Array.from({ length: 5 }, (_, i) => register(`racer${i}`)));
    const results = await Promise.all(buyers.map((b) => request(app).post("/api/orders").set(bearer(b.token)).send({ packageId, couponCode: code })));
    const ok = results.filter((r) => r.status === 201);
    expect(ok).toHaveLength(1);
    expect(ok[0].body.data.total).toBe(50_000);
    expect(results.filter((r) => r.status !== 201).every((r) => [400, 409].includes(r.status))).toBe(true);
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { code } });
    expect(coupon.redeemedCount).toBe(1);
  });

  it("hides other users' orders", async () => {
    const mine = (await request(app).get("/api/orders").set(bearer(student.token))).body.data[0];
    const res = await request(app).get(`/api/orders/${mine.id}`).set(bearer(other.token));
    expect(res.status).toBe(404);
  });
});
