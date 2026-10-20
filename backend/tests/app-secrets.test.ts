import { afterAll, beforeAll, describe, expect, it } from "vitest";

// JWT_SECRET_FROM_DB: with no JWT_SECRET in the environment the server makes a random secret once,
// keeps it in app_secrets and every start (and every instance) uses the same one. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("signing secret kept in the database", () => {
  let prisma: typeof import("../src/config/database").prisma;
  let env: typeof import("../src/config/env").env;
  let loadJwtSecretFromDb: typeof import("../src/lib/appSecrets").loadJwtSecretFromDb;
  const saved = process.env.JWT_SECRET;

  beforeAll(async () => {
    delete process.env.JWT_SECRET;
    process.env.JWT_SECRET_FROM_DB = "true";
    ({ env } = await import("../src/config/env"));
    ({ prisma } = await import("../src/config/database"));
    ({ loadJwtSecretFromDb } = await import("../src/lib/appSecrets"));
    await prisma.appSecret.deleteMany({ where: { key: "jwt_secret" } });
  });

  afterAll(async () => {
    process.env.JWT_SECRET = saved;
    delete process.env.JWT_SECRET_FROM_DB;
    await prisma?.appSecret.deleteMany({ where: { key: "jwt_secret" } });
  });

  it("creates a random secret once and reuses it", async () => {
    expect(env.JWT_SECRET_FROM_DB).toBe(true);
    await loadJwtSecretFromDb();
    const first = env.JWT_SECRET;
    expect(first).toMatch(/^[0-9a-f]{96}$/);

    env.JWT_SECRET = "";
    await loadJwtSecretFromDb();
    expect(env.JWT_SECRET).toBe(first);
    expect(await prisma.appSecret.count({ where: { key: "jwt_secret" } })).toBe(1);
  });

  it("signs and verifies tokens with it", async () => {
    const { generateToken, verifyToken } = await import("../src/utils/jwt");
    const token = generateToken({ userId: "u1", role: "USER", tv: 0 } as never);
    expect((verifyToken(token) as { userId: string }).userId).toBe("u1");
  });
});
