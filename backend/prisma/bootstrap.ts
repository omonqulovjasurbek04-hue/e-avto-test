import "dotenv/config";
import { execFileSync } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeUzPhone } from "../src/lib/phone";

/**
 * Production bootstrap, run on every deploy after `prisma migrate deploy` (Render build command).
 * Safe to repeat and deletes nothing (unlike prisma/seed.ts, which is for local demo data only):
 *  1. An empty database gets the course catalogue: categories, courses, packages, lesson texts.
 *  2. If there is no administrator yet, one is created from BOOTSTRAP_ADMIN_PHONE / BOOTSTRAP_ADMIN_PASSWORD
 *     (set them once in the hosting dashboard; after the first deploy they can be removed).
 */
const prisma = new PrismaClient();
const runContent = (file: string) =>
  execFileSync(process.execPath, ["--import", "tsx", path.join(__dirname, "content", file)], { stdio: "inherit" });

async function main() {
  if ((await prisma.course.count()) === 0) {
    console.log("Empty database: loading the course catalogue");
    // courses.ts creates the categories, catalog.ts the courses and packages, courses.ts again the lesson texts.
    runContent("courses.ts");
    runContent("catalog.ts");
    runContent("courses.ts");
  } else {
    console.log("Catalogue already present: skipped");
  }

  const admins = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPERADMIN"] } } });
  if (admins > 0) {
    console.log("Administrator exists: skipped");
    return;
  }
  const phone = normalizeUzPhone(process.env.BOOTSTRAP_ADMIN_PHONE ?? "");
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  if (!phone || password.length < 10) {
    console.warn("No administrator yet. Set BOOTSTRAP_ADMIN_PHONE (+998...) and BOOTSTRAP_ADMIN_PASSWORD (10+ characters) and redeploy.");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    // The owner registered on the site first: promote that account (the password is kept as they set it).
    await prisma.user.update({ where: { id: existing.id }, data: { role: "SUPERADMIN", isActive: true } });
  } else {
    await prisma.user.create({ data: { name: "Administrator", phone, passwordHash, role: "SUPERADMIN" } });
  }
  console.log(`Administrator ready: ${phone.slice(0, 6)}***${phone.slice(-2)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
