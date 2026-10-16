import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { codeForStep, currentStep, verifyCode, base32Decode, base32Encode, encryptSecret, decryptSecret } from "../src/lib/totp";

// Integration tests: need a real PostgreSQL (TEST_DATABASE_URL) with the migrations applied.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `ah${Date.now()}`;
const PASSWORD = "Passw0rdOK";

// The mail transport is replaced so the tests can read the link and switch "SMTP configured" on and off.
const mail = vi.hoisted(() => ({ configured: true, accept: true, sent: [] as { to: string; subject: string; text: string }[] }));
vi.mock("../src/services/mail.service", () => ({
  isMailConfigured: () => mail.configured,
  sendMail: async (msg: { to: string; subject: string; text: string }) => {
    if (!mail.configured || !mail.accept) return false;
    mail.sent.push(msg);
    return true;
  },
}));

describe("TOTP primitives", () => {
  it("matches the RFC 6238 SHA-1 test vector", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    // T = 59 s -> step 1 -> 94287082 (8 digits); the 6-digit code is the last six.
    expect(codeForStep(secret, 1)).toBe("287082");
    expect(codeForStep(secret, Math.floor(1111111109 / 30))).toBe("081804");
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
  });

  it("accepts ±1 step, refuses replays and malformed codes", () => {
    const secret = base32Encode(Buffer.from("abcdefghijabcdefghij"));
    const now = Date.now();
    const step = currentStep(now);
    expect(verifyCode(secret, codeForStep(secret, step), null, now)).toBe(step);
    expect(verifyCode(secret, codeForStep(secret, step - 1), null, now)).toBe(step - 1);
    expect(verifyCode(secret, codeForStep(secret, step - 3), null, now)).toBeNull();
    expect(verifyCode(secret, codeForStep(secret, step), step, now)).toBeNull();
    expect(verifyCode(secret, "12345", null, now)).toBeNull();
  });

  it("encrypts secrets at rest (authenticated)", () => {
    const enc = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(enc).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(enc)).toBe("JBSWY3DPEHPK3PXP");
    const parts = enc.split(".");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});

describe.skipIf(!enabled)("auth hardening", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const userIds: string[] = [];

  const api = () => request(app);
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const xhr = { "X-Requested-With": "XMLHttpRequest" };

  /** Extracts the refresh cookie value from a response. */
  const refreshCookie = (res: request.Response): string | undefined => {
    const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
    const c = raw?.find((v) => v.startsWith("eavto_rt="));
    return c ? c.split(";")[0].slice("eavto_rt=".length) : undefined;
  };
  const refresh = (cookie: string) => api().post("/api/auth/refresh").set(xhr).set("Cookie", `eavto_rt=${cookie}`);

  async function register(label: string) {
    const email = `${run}-${label}@example.com`;
    const res = await api().post("/api/auth/register").send({ name: `User ${label}`, email, password: PASSWORD });
    expect(res.status).toBe(201);
    userIds.push(res.body.data.user.id);
    return { id: res.body.data.user.id as string, email, token: res.body.data.token as string, cookie: refreshCookie(res)!, body: res.body };
  }

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
  });

  beforeEach(() => {
    mail.configured = true;
    mail.accept = true;
    mail.sent.length = 0;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  describe("refresh tokens", () => {
    it("sets an httpOnly, Secure, SameSite cookie scoped to /api/auth and never puts the refresh token in the body", async () => {
      const res = await api().post("/api/auth/register").send({ name: "Cookie", email: `${run}-cookie@example.com`, password: PASSWORD });
      userIds.push(res.body.data.user.id);
      const raw = (res.headers["set-cookie"] as unknown as string[]).find((v) => v.startsWith("eavto_rt="))!;
      expect(raw).toMatch(/HttpOnly/i);
      expect(raw).toMatch(/Secure/i);
      expect(raw).toMatch(/SameSite=Strict/i);
      expect(raw).toMatch(/Path=\/api\/auth/i);
      expect(JSON.stringify(res.body)).not.toContain(refreshCookie(res));

      // Only the hash is stored.
      const stored = await prisma.refreshToken.findMany({ where: { userId: res.body.data.user.id } });
      expect(stored).toHaveLength(1);
      expect(stored[0].tokenHash).not.toBe(refreshCookie(res));
    });

    it("access tokens are short-lived", async () => {
      const u = await register("ttl");
      const payload = JSON.parse(Buffer.from(u.token.split(".")[1], "base64url").toString());
      expect(payload.exp - payload.iat).toBeLessThanOrEqual(15 * 60);
    });

    it("rotates on every refresh and the new access token works", async () => {
      const u = await register("rotate");
      const r1 = await refresh(u.cookie);
      expect(r1.status).toBe(200);
      const c2 = refreshCookie(r1)!;
      expect(c2).toBeTruthy();
      expect(c2).not.toBe(u.cookie);
      expect(r1.body.data.user.id).toBe(u.id);
      const me = await api().get("/api/auth/me").set(bearer(r1.body.data.token));
      expect(me.status).toBe(200);

      const r2 = await refresh(c2);
      expect(r2.status).toBe(200);
    });

    it("reusing a rotated token revokes the whole family", async () => {
      const u = await register("reuse");
      const r1 = await refresh(u.cookie);
      const c2 = refreshCookie(r1)!;

      // An attacker replays the original token...
      const replay = await refresh(u.cookie);
      expect(replay.status).toBe(401);
      expect((replay.headers["set-cookie"] as unknown as string[]).join(";")).toMatch(/eavto_rt=;/);

      // ...so the legitimate successor stops working too.
      const after = await refresh(c2);
      expect(after.status).toBe(401);
      const live = await prisma.refreshToken.count({ where: { userId: u.id, revokedAt: null, usedAt: null } });
      expect(live).toBe(0);
    });

    it("concurrent refreshes with the same token never both succeed", async () => {
      const u = await register("race");
      const results = await Promise.all([refresh(u.cookie), refresh(u.cookie)]);
      expect(results.filter((r) => r.status === 200).length).toBeLessThanOrEqual(1);
    });

    it("needs the X-Requested-With header (no cross-site form posts)", async () => {
      const u = await register("csrf");
      const res = await api().post("/api/auth/refresh").set("Cookie", `eavto_rt=${u.cookie}`);
      expect(res.status).toBe(403);
      const none = await api().post("/api/auth/refresh").set(xhr);
      expect(none.status).toBe(401);
      const junk = await refresh("not-a-real-token");
      expect(junk.status).toBe(401);
    });

    it("logout revokes this device's refresh token and clears the cookie", async () => {
      const u = await register("logout");
      const out = await api().post("/api/auth/logout").set(xhr).set("Cookie", `eavto_rt=${u.cookie}`);
      expect(out.status).toBe(200);
      expect((out.headers["set-cookie"] as unknown as string[]).join(";")).toMatch(/eavto_rt=;/);
      expect((await refresh(u.cookie)).status).toBe(401);
    });

    it("logout-all, password change and password reset revoke every refresh token", async () => {
      const u = await register("all");
      const second = await api().post("/api/auth/login").send({ email: u.email, password: PASSWORD });
      const c2 = refreshCookie(second)!;
      await api().post("/api/auth/logout-all").set(bearer(u.token)).expect(200);
      expect((await refresh(u.cookie)).status).toBe(401);
      expect((await refresh(c2)).status).toBe(401);

      const login = await api().post("/api/auth/login").send({ email: u.email, password: PASSWORD });
      const other = await api().post("/api/auth/login").send({ email: u.email, password: PASSWORD });
      const changed = await api().put("/api/auth/password").set(bearer(login.body.data.token)).send({ currentPassword: PASSWORD, newPassword: "NewPassw0rd1" });
      expect(changed.status).toBe(200);
      // This device continues with the fresh session, the other device is signed out.
      expect((await refresh(refreshCookie(changed)!)).status).toBe(200);
      expect((await refresh(refreshCookie(other)!)).status).toBe(401);
      expect((await refresh(refreshCookie(login)!)).status).toBe(401);

      const beforeReset = await api().post("/api/auth/login").send({ email: u.email, password: "NewPassw0rd1" });
      await api().post("/api/auth/forgot-password").send({ email: u.email }).expect(200);
      const resetToken = /reset-password\?token=([0-9a-f]+)/.exec(mail.sent.find((m) => m.to === u.email && m.text.includes("reset-password"))!.text)![1];
      await api().post("/api/auth/reset-password").send({ token: resetToken, password: "Reset3dPass1" }).expect(200);
      expect((await refresh(refreshCookie(beforeReset)!)).status).toBe(401);
    });

    it("a role change or deactivation by an admin revokes refresh tokens", async () => {
      const admin = await register("roleadmin");
      await prisma.user.update({ where: { id: admin.id }, data: { role: "SUPERADMIN" } });
      const adminLogin = await api().post("/api/auth/login").send({ email: admin.email, password: PASSWORD });
      const target = await register("roletarget");

      await api().patch(`/api/admin/users/${target.id}/role`).set(bearer(adminLogin.body.data.token)).send({ role: "TEACHER" }).expect(200);
      expect((await refresh(target.cookie)).status).toBe(401);

      const again = await api().post("/api/auth/login").send({ email: target.email, password: PASSWORD });
      await api().patch(`/api/admin/users/${target.id}/status`).set(bearer(adminLogin.body.data.token)).send({ isActive: false }).expect(200);
      expect((await refresh(refreshCookie(again)!)).status).toBe(401);
    });

    it("an expired refresh token is refused", async () => {
      const u = await register("expired");
      await prisma.refreshToken.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await refresh(u.cookie)).status).toBe(401);
    });
  });

  describe("email verification", () => {
    it("emails a link on sign-up, verifies once, and reports the delivery honestly", async () => {
      const u = await register("verify");
      expect(u.body.data.emailVerification).toEqual({ sent: true, mailConfigured: true });
      expect(u.body.data.user.emailVerified).toBe(false);
      const msg = mail.sent.find((m) => m.to === u.email)!;
      const token = /verify-email\?token=([0-9a-f]+)/.exec(msg.text)![1];

      const ok = await api().post("/api/auth/verify-email").send({ token });
      expect(ok.status).toBe(200);
      const me = await api().get("/api/auth/me").set(bearer(u.token));
      expect(me.body.data.emailVerified).toBe(true);

      const twice = await api().post("/api/auth/verify-email").send({ token });
      expect(twice.status).toBe(400);
      const resend = await api().post("/api/auth/verify-email/resend").set(bearer(u.token));
      expect(resend.body.data.alreadyVerified).toBe(true);
    });

    it("never claims a mail was sent when SMTP is not configured", async () => {
      mail.configured = false;
      const u = await register("nosmtp");
      expect(u.body.data.emailVerification).toEqual({ sent: false, mailConfigured: false });
      const resend = await api().post("/api/auth/verify-email/resend").set(bearer(u.token));
      expect(resend.body.data).toMatchObject({ alreadyVerified: false, sent: false, mailConfigured: false });

      mail.configured = true;
      mail.accept = false; // SMTP set up but the server refused the message
      const failed = await api().post("/api/auth/verify-email/resend").set(bearer(u.token));
      expect(failed.body.data).toMatchObject({ sent: false, mailConfigured: true });
    });

    it("changing the e-mail resets verification and old links stop working", async () => {
      const u = await register("change");
      const first = /token=([0-9a-f]+)/.exec(mail.sent.find((m) => m.to === u.email)!.text)![1];
      const newEmail = `${run}-changed@example.com`;
      const upd = await api().put("/api/profile").set(bearer(u.token)).send({ email: newEmail });
      expect(upd.status).toBe(200);
      expect((await api().post("/api/auth/verify-email").send({ token: first })).status).toBe(400);
      const second = /token=([0-9a-f]+)/.exec(mail.sent.find((m) => m.to === newEmail)!.text)![1];
      expect((await api().post("/api/auth/verify-email").send({ token: second })).status).toBe(200);
    });

    it("rejects unknown and expired links", async () => {
      expect((await api().post("/api/auth/verify-email").send({ token: "f".repeat(64) })).status).toBe(400);
      const u = await register("verifyexp");
      const token = /token=([0-9a-f]+)/.exec(mail.sent.find((m) => m.to === u.email)!.text)![1];
      await prisma.emailVerification.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await api().post("/api/auth/verify-email").send({ token })).status).toBe(400);
    });
  });

  describe("TOTP two-factor", () => {
    const codeNow = (secret: string, offset = 0) => codeForStep(secret, currentStep() + offset);

    async function staff(label: string, role: "ADMIN" | "FINANCE" | "SUPERADMIN" = "ADMIN") {
      const u = await register(label);
      await prisma.user.update({ where: { id: u.id }, data: { role } });
      const login = await api().post("/api/auth/login").send({ email: u.email, password: PASSWORD });
      return { ...u, token: login.body.data.token as string };
    }

    async function enable(token: string) {
      const setup = await api().post("/api/auth/2fa/setup").set(bearer(token));
      expect(setup.status).toBe(200);
      const secret = setup.body.data.secret as string;
      expect(setup.body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
      const on = await api().post("/api/auth/2fa/enable").set(bearer(token)).send({ code: codeNow(secret) });
      expect(on.status).toBe(200);
      return { secret, recoveryCodes: on.body.data.recoveryCodes as string[] };
    }

    it("is not offered to students", async () => {
      const u = await register("student2fa");
      const status = await api().get("/api/auth/2fa").set(bearer(u.token));
      expect(status.body.data.available).toBe(false);
      expect((await api().post("/api/auth/2fa/setup").set(bearer(u.token))).status).toBe(403);
    });

    it("setup needs a valid code; the secret is stored encrypted", async () => {
      const a = await staff("setup");
      const setup = await api().post("/api/auth/2fa/setup").set(bearer(a.token));
      const bad = await api().post("/api/auth/2fa/enable").set(bearer(a.token)).send({ code: "000000" });
      expect(bad.status).toBe(400);
      const row = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
      expect(row.totpPendingSecret).not.toContain(setup.body.data.secret);
      expect(row.totpEnabledAt).toBeNull();
    });

    it("login asks for the second factor, then issues a session; codes cannot be replayed", async () => {
      const a = await staff("login2fa", "FINANCE");
      const { secret } = await enable(a.token);

      const step1 = await api().post("/api/auth/login").send({ email: a.email, password: PASSWORD });
      expect(step1.status).toBe(200);
      expect(step1.body.data.twoFactorRequired).toBe(true);
      expect(step1.body.data.token).toBeUndefined();
      expect(refreshCookie(step1)).toBeUndefined();
      const challenge = step1.body.data.challengeToken as string;

      // The challenge is not an access token.
      expect((await api().get("/api/auth/me").set(bearer(challenge))).status).toBe(401);
      expect((await api().post("/api/auth/2fa/login").send({ challengeToken: challenge, code: "123456" })).status).toBe(401);

      const code = codeNow(secret, 1);
      const ok = await api().post("/api/auth/2fa/login").send({ challengeToken: challenge, code });
      expect(ok.status).toBe(200);
      expect(ok.body.data.user.twoFactorEnabled).toBe(true);
      expect(refreshCookie(ok)).toBeTruthy();

      const replay = await api().post("/api/auth/2fa/login").send({ challengeToken: challenge, code });
      expect(replay.status).toBe(401);
    });

    it("recovery codes work once; a superadmin can reset 2FA for someone else", async () => {
      const a = await staff("recovery");
      const { recoveryCodes } = await enable(a.token);
      expect(recoveryCodes).toHaveLength(8);
      const row = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
      expect(row.totpRecoveryHashes).not.toContain(recoveryCodes[0]);

      const challenge = async () => (await api().post("/api/auth/login").send({ email: a.email, password: PASSWORD })).body.data.challengeToken as string;
      const ok = await api().post("/api/auth/2fa/login").send({ challengeToken: await challenge(), code: recoveryCodes[0].toUpperCase() });
      expect(ok.status).toBe(200);
      const again = await api().post("/api/auth/2fa/login").send({ challengeToken: await challenge(), code: recoveryCodes[0] });
      expect(again.status).toBe(401);

      // A plain admin cannot reset; a superadmin can.
      const admin = await staff("resetter-admin");
      expect((await api().delete(`/api/admin/users/${a.id}/two-factor`).set(bearer(admin.token))).status).toBe(403);
      const sa = await staff("resetter-sa", "SUPERADMIN");
      const reset = await api().delete(`/api/admin/users/${a.id}/two-factor`).set(bearer(sa.token));
      expect(reset.status).toBe(200);
      const plain = await api().post("/api/auth/login").send({ email: a.email, password: PASSWORD });
      expect(plain.body.data.token).toBeTruthy();
      const audit = await prisma.auditLog.findFirst({ where: { action: "user.2fa.reset", entityId: a.id } });
      expect(audit).not.toBeNull();
    });

    it("disabling needs the password and a code", async () => {
      const a = await staff("disable");
      const { secret } = await enable(a.token);
      expect((await api().post("/api/auth/2fa/disable").set(bearer(a.token)).send({ password: "wrong-pass1", code: codeNow(secret, 1) })).status).toBe(400);
      const off = await api().post("/api/auth/2fa/disable").set(bearer(a.token)).send({ password: PASSWORD, code: codeNow(secret, 1) });
      expect(off.status).toBe(200);
      expect((await api().get("/api/auth/2fa").set(bearer(a.token))).body.data.enabled).toBe(false);
    });

    it("wrong codes count towards the account lockout", async () => {
      const a = await staff("lock2fa");
      await enable(a.token);
      const challenge = (await api().post("/api/auth/login").send({ email: a.email, password: PASSWORD })).body.data.challengeToken as string;
      for (let i = 0; i < 8; i++) await api().post("/api/auth/2fa/login").send({ challengeToken: challenge, code: "000000" });
      const locked = await api().post("/api/auth/2fa/login").send({ challengeToken: challenge, code: "000000" });
      expect(locked.status).toBe(429);
    });
  });
});
