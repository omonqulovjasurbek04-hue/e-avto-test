import "dotenv/config";
import { execFileSync } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizeUzPhone } from "../src/lib/phone";
import { catalog, photoUrl } from "./content/catalog";

/**
 * Production bootstrap, run on every deploy after `prisma migrate deploy` (Render build command).
 * Safe to repeat and deletes nothing (unlike prisma/seed.ts, which is for local demo data only):
 *  1. An empty database gets the course catalogue: categories, courses, packages, lesson texts. Courses that
 *     have no photo get the catalogue one.
 *  2. If there is no administrator yet: the account registered on the site with BOOTSTRAP_ADMIN_PHONE becomes
 *     SUPERADMIN (no password in the hosting dashboard needed). Without such an account, one is created when
 *     BOOTSTRAP_ADMIN_PASSWORD (10+ characters) is set.
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

  // Courses without a photo get the catalogue one (a photo set in the admin panel is never replaced).
  let photos = 0;
  for (const def of catalog) {
    if (!def.photo) continue;
    const res = await prisma.course.updateMany({ where: { slug: def.slug, OR: [{ thumbnail: null }, { thumbnail: "" }] }, data: { thumbnail: photoUrl(def.photo) } });
    photos += res.count;
  }
  if (photos) console.log(`Course photos filled: ${photos}`);

  const admins = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPERADMIN"] } } });
  if (admins > 0) {
    console.log("Administrator exists: skipped");
    return;
  }
  const phone = normalizeUzPhone(process.env.BOOTSTRAP_ADMIN_PHONE ?? "");
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  if (!phone) {
    console.warn("No administrator yet. Set BOOTSTRAP_ADMIN_PHONE (+998...) and redeploy.");
    return;
  }
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    // The owner registered on the site with their own password: that account becomes the administrator.
    await prisma.user.update({ where: { id: existing.id }, data: { role: "SUPERADMIN", isActive: true } });
  } else if (password.length >= 10) {
    await prisma.user.create({ data: { name: "Administrator", phone, passwordHash: await bcrypt.hash(password, 12), role: "SUPERADMIN" } });
  } else {
    console.warn(`No account with ${phone.slice(0, 6)}***${phone.slice(-2)} yet: register on the site with this phone, then redeploy (or set BOOTSTRAP_ADMIN_PASSWORD, 10+ characters).`);
    return;
  }
  console.log(`Administrator ready: ${phone.slice(0, 6)}***${phone.slice(-2)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
