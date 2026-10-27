import type { UserRole } from "@/types/user";

/**
 * UI-side copy of the server's role -> permission matrix (backend/src/lib/permissions.ts).
 * It only decides what to SHOW; every API call is authorised again on the server, so a stale or
 * tampered copy can never grant access, only show a button that then answers 403.
 */
export type Permission =
  | "admin:access" | "users:read" | "users:manage" | "roles:manage" | "content:manage" | "catalog:manage" | "orders:read"
  | "payments:manage" | "groups:manage" | "groups:own" | "courses:open-all" | "schedule:manage" | "tests:manage" | "audit:read" | "settings:manage" | "reports:read" | "media:manage"
  | "tickets:edit" | "enrollments:grant";

const ADMIN: Permission[] = ["admin:access", "users:read", "users:manage", "content:manage", "catalog:manage", "orders:read", "groups:manage", "groups:own", "courses:open-all", "schedule:manage", "tests:manage", "audit:read", "settings:manage", "reports:read", "media:manage", "tickets:edit", "enrollments:grant"];

const MATRIX: Record<UserRole, Permission[]> = {
  USER: [],
  TEACHER: ["groups:own", "courses:open-all", "tickets:edit"],
  MODERATOR: ["admin:access", "content:manage", "tests:manage", "tickets:edit", "courses:open-all"],
  FINANCE: ["admin:access", "orders:read", "payments:manage", "reports:read"],
  MANAGER: ["admin:access", "users:read", "groups:manage", "schedule:manage", "orders:read"],
  ADMIN,
  SUPERADMIN: [...ADMIN, "roles:manage", "payments:manage"],
};

export const can = (role: UserRole | undefined, permission: Permission): boolean => ((role && MATRIX[role]) || []).includes(permission);

export const ROLE_LABEL: Record<UserRole, string> = {
  USER: "O'quvchi",
  TEACHER: "O'qituvchi",
  MODERATOR: "Moderator",
  FINANCE: "Moliya xodimi",
  MANAGER: "Administrator",
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};

/** Mirrors the server rule: admins manage ordinary roles; granting or touching ADMIN/SUPERADMIN needs a superadmin. */
export const canAssignRole = (actor: UserRole | undefined, current: UserRole, next: UserRole): boolean => {
  if (actor === "SUPERADMIN") return true;
  if (actor !== "ADMIN") return false;
  const privileged: UserRole[] = ["ADMIN", "SUPERADMIN"];
  if (privileged.includes(current) || privileged.includes(next)) return false;
  // Same as the server: no one hands out rights they do not hold (ADMIN cannot create FINANCE).
  const own = new Set(MATRIX[actor]);
  return [current, next].every((r) => MATRIX[r].every((p) => own.has(p)));
};
