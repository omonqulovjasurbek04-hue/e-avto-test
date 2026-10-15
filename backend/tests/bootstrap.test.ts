import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration: needs PostgreSQL (TEST_DATABASE_URL). Runs against the dedicated test database only.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `b${Date.now()}`;

describe.skipIf(!enabled)("first superadmin bootstrap", () => {
  let prisma: typeof import("../src/config/database").prisma;
  let create: typeof import("../src/services/bootstrap.service").createFirstSuperadmin;
  const created: string[] = [];
  let stash: { id: string }[] = [];

  beforeAll(async () => {
    ({ prisma } = await import("../src/config/database"));
    ({ createFirstSuperadmin: create } = await import("../src/services/bootstrap.service"));
    // The rule is "only when none exists", so park any existing superadmins for the duration of the test.
    stash = await prisma.user.findMany({ where: { role: "SUPERADMIN" }, select: { id: true } });
    await prisma.user.updateMany({ where: { id: { in: stash.map((s) => s.id) } }, data: { role: "ADMIN" } });
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    await prisma.user.updateMany({ where: { id: { in: stash.map((s) => s.id) } }, data: { role: "SUPERADMIN" } });
    await prisma.$disconnect();
  });

  it("rejects weak passwords", async () => {
    await expect(create({ email: `${run}@example.com`, password: "short1A" })).rejects.toThrow();
    await expect(create({ email: `${run}@example.com`, password: "alllowercase1234" })).rejects.toThrow();
  });

  it("creates the first superadmin with a hashed password and an audit record", async () => {
    const res = await create({ email: `${run}@example.com`, password: "Str0ngPassword!!" });
    created.push(res.id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: res.id } });
    expect(user.role).toBe("SUPERADMIN");
    expect(user.passwordHash).not.toContain("Str0ngPassword");
    expect(await prisma.auditLog.count({ where: { action: "bootstrap.superadmin", entityId: res.id } })).toBe(1);
  });

  it("refuses to run again once a superadmin exists (no backdoor)", async () => {
    await expect(create({ email: `${run}-2@example.com`, password: "Str0ngPassword!!" })).rejects.toThrow(/already exists/);
    expect(await prisma.user.count({ where: { email: `${run}-2@example.com` } })).toBe(0);
  });
});
