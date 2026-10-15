import { describe, expect, it } from "vitest";
import { canAssignRole, hasPermission } from "../src/lib/permissions";

describe("permission matrix", () => {
  it("gives students no back-office access", () => {
    expect(hasPermission("USER", "admin:access")).toBe(false);
    expect(hasPermission("USER", "users:manage")).toBe(false);
  });

  it("keeps finance away from user management and teachers away from payments", () => {
    expect(hasPermission("FINANCE", "orders:read")).toBe(true);
    expect(hasPermission("FINANCE", "users:manage")).toBe(false);
    expect(hasPermission("TEACHER", "payments:manage")).toBe(false);
    expect(hasPermission("TEACHER", "attendance:mark")).toBe(true);
  });

  it("lets only superadmin manage roles", () => {
    expect(hasPermission("ADMIN", "roles:manage")).toBe(false);
    expect(hasPermission("SUPERADMIN", "roles:manage")).toBe(true);
  });

  it("denies unknown roles", () => {
    expect(hasPermission("HACKER", "admin:access")).toBe(false);
  });
});

describe("role escalation guard", () => {
  it("blocks an admin from creating admins or superadmins", () => {
    expect(canAssignRole("ADMIN", "USER", "ADMIN")).toBe(false);
    expect(canAssignRole("ADMIN", "USER", "SUPERADMIN")).toBe(false);
  });

  it("blocks an admin from demoting another admin or a superadmin", () => {
    expect(canAssignRole("ADMIN", "ADMIN", "USER")).toBe(false);
    expect(canAssignRole("ADMIN", "SUPERADMIN", "USER")).toBe(false);
  });

  it("allows an admin to manage ordinary roles", () => {
    expect(canAssignRole("ADMIN", "USER", "TEACHER")).toBe(true);
    expect(canAssignRole("ADMIN", "TEACHER", "MODERATOR")).toBe(true);
  });

  it("never lets an admin hand out rights it does not hold itself (FINANCE has payments:manage)", () => {
    expect(hasPermission("ADMIN", "payments:manage")).toBe(false);
    expect(canAssignRole("ADMIN", "USER", "FINANCE")).toBe(false);
    expect(canAssignRole("ADMIN", "TEACHER", "FINANCE")).toBe(false);
    expect(canAssignRole("ADMIN", "FINANCE", "USER")).toBe(false);
    expect(canAssignRole("SUPERADMIN", "USER", "FINANCE")).toBe(true);
  });

  it("allows a superadmin everything and nobody else anything", () => {
    expect(canAssignRole("SUPERADMIN", "USER", "ADMIN")).toBe(true);
    expect(canAssignRole("FINANCE", "USER", "TEACHER")).toBe(false);
    expect(canAssignRole("USER", "USER", "USER")).toBe(false);
  });
});
