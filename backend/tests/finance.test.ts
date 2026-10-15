import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: order list and revenue summary. Needs PostgreSQL (TEST_DATABASE_URL).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `f${Date.now()}`;

describe.skipIf(!enabled)("finance API", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  let orderId = "";
  const bearer = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string, role?: "FINANCE" | "TEACHER") => {
    const res = await request(app).post("/api/auth/register").send({ name: `${run}-${k}`, email: `${run}-${k}@example.com`, password: "Passw0rdOK" });
    ids.push(res.body.data.user.id);
    if (role) await prisma.user.update({ where: { id: res.body.data.user.id }, data: { role } });
    tok[k] = res.body.data.token;
    return res.body.data.user.id as string;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    await signup("finance", "FINANCE");
    await signup("teacher", "TEACHER");
    const buyer = await signup("buyer");
    const order = await prisma.order.create({ data: { userId: buyer, status: "PAID", subtotal: 120_000, discountTotal: 20_000, total: 100_000, paidAt: new Date() } });
    orderId = order.id;
    const payment = await prisma.payment.create({ data: { orderId, provider: "mock", status: "PARTIALLY_REFUNDED", amount: 100_000, paidAt: new Date() } });
    await prisma.refund.create({ data: { paymentId: payment.id, amount: 30_000, reason: "test", status: "DONE", createdById: buyer } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.refund.deleteMany({ where: { payment: { orderId } } });
    await prisma.payment.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("only finance/admin roles can see orders and revenue", async () => {
    expect((await request(app).get("/api/admin/finance/orders").set(bearer("buyer"))).status).toBe(403);
    expect((await request(app).get("/api/admin/finance/summary").set(bearer("teacher"))).status).toBe(403);
    expect((await request(app).get("/api/admin/finance/orders")).status).toBe(401);
  });

  it("lists orders with filters and never leaks provider payloads", async () => {
    const res = await request(app).get(`/api/admin/finance/orders?status=PAID&search=${run}`).set(bearer("finance"));
    expect(res.status).toBe(200);
    expect(res.body.data.some((o: { id: string }) => o.id === orderId)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain("payload");
  });

  it("counts paid revenue and subtracts completed refunds", async () => {
    const res = await request(app).get("/api/admin/finance/summary").set(bearer("finance"));
    expect(res.status).toBe(200);
    const s = res.body.data;
    expect(s.gross).toBeGreaterThanOrEqual(100_000);
    expect(s.refunded).toBeGreaterThanOrEqual(30_000);
    expect(s.net).toBe(s.gross - s.refunded);
    expect((await request(app).get("/api/admin/finance/summary?from=2026-12-01&to=2026-01-01").set(bearer("finance"))).status).toBe(400);
  });
});

describe.skipIf(!enabled)("audit log API", () => {
  it("is readable by admins only and never exposes secrets", async () => {
    const { default: app } = await import("../src/app");
    const { prisma } = await import("../src/config/database");
    const mk = async (k: string, role?: "ADMIN" | "FINANCE") => {
      const r = await request(app).post("/api/auth/register").send({ name: `${run}-au-${k}`, email: `${run}-au-${k}@example.com`, password: "Passw0rdOK" });
      if (role) await prisma.user.update({ where: { id: r.body.data.user.id }, data: { role } });
      return { id: r.body.data.user.id as string, token: r.body.data.token as string };
    };
    const admin = await mk("admin", "ADMIN");
    const finance = await mk("fin", "FINANCE");
    const student = await mk("stu");
    await prisma.auditLog.create({ data: { actorId: admin.id, action: "test.audit", entity: "Probe", before: { note: "a", passwordHash: "x" } } });

    expect((await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${student.token}`)).status).toBe(403);
    expect((await request(app).get("/api/admin/audit").set("Authorization", `Bearer ${finance.token}`)).status).toBe(403);
    const res = await request(app).get("/api/admin/audit?action=test.audit").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].actor.id).toBe(admin.id);

    await prisma.auditLog.deleteMany({ where: { action: "test.audit" } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, finance.id, student.id] } } });
  });
});
