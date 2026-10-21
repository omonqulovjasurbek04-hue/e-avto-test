import { Role } from "@prisma/client";

/**
 * Static role → permission matrix. Checked on the server for every protected endpoint;
 * hiding menu items in the UI is never a substitute.
 * USER is the "student" role of the spec.
 */
export type Permission =
  | "admin:access"
  | "users:read"
  | "users:manage"
  | "roles:manage"
  | "content:manage"
  | "catalog:manage"
  | "orders:read"
  | "payments:manage"
  | "groups:manage"
  | "schedule:manage"
  | "teaching:access"
  | "attendance:mark"
  | "attendance:edit"
  | "tests:manage"
  | "media:manage"
  | "reports:read"
  | "audit:read"
  | "settings:manage";

const ADMIN_PERMISSIONS: Permission[] = [
  "admin:access",
  "users:read",
  "users:manage",
  "content:manage",
  "catalog:manage",
  "orders:read",
  "groups:manage",
  "schedule:manage",
  "teaching:access",
  "attendance:mark",
  "attendance:edit",
  "tests:manage",
  "media:manage",
  "reports:read",
  "audit:read",
  "settings:manage",
];

const MATRIX: Record<Role, readonly Permission[]> = {
  USER: [],
  TEACHER: ["teaching:access", "attendance:mark"],
  MODERATOR: ["admin:access", "content:manage", "tests:manage"],
  FINANCE: ["admin:access", "orders:read", "payments:manage", "reports:read"],
  // Front desk: enrols students into groups and plans classes; no prices, settings or audit.
  MANAGER: ["admin:access", "users:read", "groups:manage", "schedule:manage", "orders:read"],
  ADMIN: ADMIN_PERMISSIONS,
  SUPERADMIN: [...ADMIN_PERMISSIONS, "roles:manage", "payments:manage"],
};

export const hasPermission = (role: string, permission: Permission): boolean =>
  (MATRIX[role as Role] ?? []).includes(permission);

/** Roles that may only be granted or revoked by a SUPERADMIN. */
const PRIVILEGED: readonly Role[] = ["ADMIN", "SUPERADMIN"];

/**
 * Prevents privilege escalation: an ADMIN may manage non-privileged roles only; touching an
 * ADMIN/SUPERADMIN account, or granting either role, requires SUPERADMIN. Nobody changes their own role.
 */
export const canAssignRole = (actorRole: string, targetCurrentRole: Role, newRole: Role): boolean => {
  if (actorRole === "SUPERADMIN") return true;
  if (actorRole !== "ADMIN") return false;
  if (PRIVILEGED.includes(targetCurrentRole) || PRIVILEGED.includes(newRole)) return false;
  // Nobody may hand out (or take away) rights they do not hold themselves, e.g. ADMIN -> FINANCE (payments:manage).
  const own = new Set(MATRIX[actorRole as Role]);
  return [targetCurrentRole, newRole].every((r) => MATRIX[r].every((p) => own.has(p)));
};
