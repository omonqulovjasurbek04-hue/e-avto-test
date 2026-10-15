import { z } from "zod";
import { prisma } from "../config/database";
import { hashPassword } from "../utils/password";
import { conflict } from "../utils/errors";
import { writeAudit } from "./audit.service";

// Stricter than the signup rule: this account can grant every other role.
const bootstrapSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(100)
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/\d/, "Add a digit"),
});

/**
 * Creates the FIRST superadmin of a fresh installation. It refuses to run once any superadmin
 * exists, so it cannot be used later as a backdoor to add privileged accounts; further admins are
 * created through the normal, audited role-change endpoint by a superadmin.
 */
export const createFirstSuperadmin = async (input: { name?: string; email: string; password: string }) => {
  const data = bootstrapSchema.parse({ name: input.name ?? "Administrator", email: input.email, password: input.password });

  if ((await prisma.user.count({ where: { role: "SUPERADMIN" } })) > 0) {
    throw conflict("A superadmin already exists; use the admin panel to manage roles");
  }

  const passwordHash = await hashPassword(data.password);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });

  const user = await prisma.$transaction(async (tx) => {
    // Promote an existing account (e.g. the owner already registered) or create a fresh one.
    const saved = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { role: "SUPERADMIN", passwordHash, isActive: true, tokenVersion: { increment: 1 } } })
      : await tx.user.create({ data: { name: data.name, email: data.email, passwordHash, role: "SUPERADMIN" } });
    await writeAudit({ actorId: null, action: "bootstrap.superadmin", entity: "User", entityId: saved.id, after: { email: saved.email, promoted: Boolean(existing) } }, tx);
    return saved;
  });

  return { id: user.id, email: user.email, promoted: Boolean(existing) };
};
