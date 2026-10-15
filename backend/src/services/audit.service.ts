import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";

const SENSITIVE = /pass|token|secret|hash|card|cvv/i;

/** Drops secret-looking keys so credentials never reach the audit trail. */
const scrub = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object" && !(v instanceof Date)) {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([k]) => !SENSITIVE.test(k))
          .map(([k, val]) => [k, walk(val)])
      );
    }
    return v;
  };
  return walk(value) as Prisma.InputJsonValue;
};

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

export const writeAudit = async (entry: AuditEntry, db: Prisma.TransactionClient | typeof prisma = prisma) => {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: scrub(entry.before),
      after: scrub(entry.after),
      reason: entry.reason,
    },
  });
};
