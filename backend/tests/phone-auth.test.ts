import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { normalizeUzPhone } from "../src/lib/phone";

// Sign-up and sign-in with an Uzbek phone number (e-mail optional). Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const tail = String(Date.now()).slice(-7);
const PHONE = `+99891${tail}`;
const PASSWORD = "Passw0rdOK";

describe("normalizeUzPhone", () => {
  it("accepts the usual spellings and returns one canonical form", () => {
    for (const v of ["+998 90 123 45 67", "998901234567", "90 123-45-67", "(90) 1234567", "8 90 123 45 67", "+998(90)123-45-67"]) {
      expect(normalizeUzPhone(v)).toBe("+998901234567");
    }
  });
  it("rejects anything that is not a 9-digit Uzbek number", () => {
    for (const v of ["", "12345", "+7 912 345 67 89", "+998 90 123 45 6", "abc", "+998 90 123 45 678"]) expect(normalizeUzPhone(v)).toBeNull();
  });
});

describe.skipIf(!enabled)("phone sign-up and sign-in", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const login = (body: object) => request(app).post("/api/auth/login").set("X-Requested-With", "XMLHttpRequest").send(body);

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
  });
  afterAll(async () => {
    if (enabled) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
  });

  it("registers with a phone number only and stores it in canonical form", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "Phone Only", phone: `91 ${tail.slice(0, 3)} ${tail.slice(3)}`, password: PASSWORD });
    expect(res.status).toBe(201);
    ids.push(res.body.data.user.id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: res.body.data.user.id } });
    expect(user.phone).toBe(PHONE);
    expect(user.email).toBeNull();
    expect(res.body.data.emailVerification?.sent ?? false).toBe(false);
  });

  it("signs in with the phone in any spelling; wrong password or unknown number fail the same way", async () => {
    expect((await login({ phone: `+998 (91) ${tail}`, password: PASSWORD })).status).toBe(200);
    expect((await login({ phone: `998 91 ${tail}`, password: PASSWORD })).status).toBe(200);
    expect((await login({ phone: PHONE, password: "Wrong1234" })).status).toBe(401);
    expect((await login({ phone: "+998 99 999 99 99", password: PASSWORD })).status).toBe(401);
    expect((await login({ phone: "12345", password: PASSWORD })).status).toBe(422);
    expect((await login({ password: PASSWORD })).status).toBe(422);
  });

  it("refuses a second account on the same number and requires a phone or an e-mail", async () => {
    const dup = await request(app).post("/api/auth/register").send({ name: "Copy", phone: PHONE, password: PASSWORD });
    expect(dup.status).toBe(409);
    expect((await request(app).post("/api/auth/register").send({ name: "Nobody", password: PASSWORD })).status).toBe(422);
  });

  it("still lets e-mail accounts sign in, and a profile cannot take someone else's number", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "Mail User", email: `${tail}-mail@example.com`, password: PASSWORD });
    ids.push(res.body.data.user.id);
    expect((await login({ email: `${tail}-mail@example.com`, password: PASSWORD })).status).toBe(200);
    const taken = await request(app).put("/api/profile").set("Authorization", `Bearer ${res.body.data.token}`).send({ phone: PHONE });
    expect(taken.status).toBe(409);
    const own = await request(app).put("/api/profile").set("Authorization", `Bearer ${res.body.data.token}`).send({ phone: "+998 93 000 00 00" });
    expect(own.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: res.body.data.user.id } })).phone).toBe("+998930000000");
    await prisma.user.update({ where: { id: res.body.data.user.id }, data: { phone: null } });
  });

  it("finishes a Telegram sign-up once: name, phone and password, then the phone logs in", async () => {
    const { generateToken } = await import("../src/utils/jwt");
    const tg = await prisma.user.create({ data: { telegramId: `tg-${tail}`, name: "Telegram foydalanuvchi" } });
    ids.push(tg.id);
    const token = generateToken({ userId: tg.id, role: tg.role, tv: tg.tokenVersion });
    const auth = { Authorization: `Bearer ${token}` };

    const me = await request(app).get("/api/auth/me").set(auth);
    expect(me.body.data.hasPassword).toBe(false);

    const newPhone = `+99895${tail}`;
    expect((await request(app).post("/api/auth/complete-registration").set(auth).send({ name: "Ali Valiyev", phone: PHONE, password: PASSWORD })).status).toBe(409); // number taken
    // The first and the last name are both required.
    expect((await request(app).post("/api/auth/complete-registration").set(auth).send({ name: "Ali", phone: `95 ${tail}`, password: PASSWORD })).status).toBe(422);
    expect((await request(app).post("/api/auth/complete-registration").set(auth).send({ name: "A V", phone: `95 ${tail}`, password: PASSWORD })).status).toBe(422);
    expect((await request(app).post("/api/auth/complete-registration").set(auth).send({ name: "Ali Valiyev", phone: "123", password: PASSWORD })).status).toBe(422);
    const done = await request(app).post("/api/auth/complete-registration").set(auth).send({ name: "Ali Valiyev", phone: `95 ${tail}`, password: PASSWORD });
    expect(done.status).toBe(200);
    expect(done.body.data).toMatchObject({ name: "Ali Valiyev", phone: newPhone, hasPassword: true });
    expect((await login({ phone: newPhone, password: PASSWORD })).status).toBe(200);

    // Only once: an account with a password cannot be "re-registered" (e.g. to swap the phone silently).
    expect((await request(app).post("/api/auth/complete-registration").set(auth).send({ name: "Xon Yoldosh", phone: "+998 97 000 00 00", password: PASSWORD })).status).toBe(409);
    expect((await request(app).post("/api/auth/complete-registration").send({ name: "X Y", phone: "+998 97 000 00 00", password: PASSWORD })).status).toBe(401);
  });
});
