/**
 * One-off bootstrap for a fresh installation:
 *   BOOTSTRAP_EMAIL=owner@example.uz BOOTSTRAP_PASSWORD='<12+ chars>' [BOOTSTRAP_NAME='Owner'] npm run create-superadmin
 * (production image:  node dist/scripts/createSuperadmin.js)
 * The password is read from the environment, never from the command line history or the repository.
 */
import { prisma } from "../config/database";
import { createFirstSuperadmin } from "../services/bootstrap.service";

async function main() {
  const email = process.env.BOOTSTRAP_EMAIL;
  const password = process.env.BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.error("Set BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD.");
    process.exitCode = 2;
    return;
  }
  try {
    const result = await createFirstSuperadmin({ email, password, name: process.env.BOOTSTRAP_NAME });
    console.log(`Superadmin ${result.promoted ? "promoted" : "created"}: ${result.email}`);
    console.log("Sign in, then change the password from the profile page and remove BOOTSTRAP_* from your environment.");
  } catch (err) {
    console.error(err instanceof Error ? `Refused: ${err.message}` : "Failed");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
