import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * One test account per role for trying the panels locally:  npm run seed:roles
 * Only creates or updates these accounts; no other data is touched. Local databases only.
 */
const prisma = new PrismaClient();

// Demo credentials are for local development only; override via the environment.
const PASSWORD = process.env.SEED_ROLE_PASSWORD || "Test1234";

const ACCOUNTS: { role: Role; name: string; email: string; phone: string }[] = [
  { role: "USER", name: "Test Student", email: "student@test.local", phone: "+998900000011" },
  // A plain user: signed up, no course bought yet (user#### number, no student number).
  { role: "USER", name: "Test User", email: "user@test.local", phone: "+998900000017" },
  { role: "TEACHER", name: "Test Teacher", email: "teacher@test.local", phone: "+998900000012" },
  { role: "MODERATOR", name: "Test Moderator", email: "moderator@test.local", phone: "+998900000013" },
  { role: "FINANCE", name: "Test Finance", email: "finance@test.local", phone: "+998900000014" },
  { role: "ADMIN", name: "Test Admin", email: "admin@test.local", phone: "+998900000015" },
  { role: "MANAGER", name: "Test Manager", email: "manager@test.local", phone: "+998900000016" },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create test accounts with NODE_ENV=production");
  }
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname.replace(/^\[|\]$/g, "");
    } catch {
      return "";
    }
  })();
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Refusing to create test accounts on non-local database host "${host || "?"}"`);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const a of ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { role: a.role, phone: a.phone, passwordHash, isActive: true, failedLogins: 0, lockedUntil: null },
      create: { ...a, passwordHash },
    });
    if (a.role === "TEACHER") {
      await prisma.teacherProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    }
    console.log(`${a.role.padEnd(9)} ${a.phone}  ${a.email}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
