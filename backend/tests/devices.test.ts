import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { parseUserAgent } from "../src/utils/userAgent";

const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const EDGE_WIN = `${CHROME_WIN} Edg/130.0`;

describe("user agent description", () => {
  it("names browser, system and device kind", () => {
    expect(parseUserAgent(CHROME_WIN)).toEqual({ browser: "Chrome", os: "Windows", type: "desktop" });
    expect(parseUserAgent(SAFARI_IPHONE)).toEqual({ browser: "Safari", os: "iOS", type: "mobile" });
    expect(parseUserAgent(EDGE_WIN).browser).toBe("Microsoft Edge");
    expect(parseUserAgent(undefined)).toEqual({ browser: "Brauzer", os: "", type: "desktop" });
  });
});

// Integration: connected devices over HTTP. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `dv${Date.now()}`;

describe.skipIf(!enabled)("connected devices", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const xhr = { "X-Requested-With": "XMLHttpRequest" };
  const email = `${run}@example.com`;
  const password = "Passw0rdOK";
  let userId = "";

  const cookieOf = (res: request.Response) => {
    const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
    return raw?.find((v) => v.startsWith("eavto_rt="))?.split(";")[0].slice("eavto_rt=".length) ?? "";
  };
  // One login = one device: its access token and refresh cookie.
  const signIn = async (ua: string) => {
    const res = await request(app).post("/api/auth/login").set("User-Agent", ua).send({ email, password });
    return { token: res.body.data.token as string, cookie: cookieOf(res) };
  };
  const as = (d: { token: string; cookie: string }) => ({ Authorization: `Bearer ${d.token}`, Cookie: `eavto_rt=${d.cookie}`, ...xhr });

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    const res = await request(app).post("/api/auth/register").send({ name: "Device owner", email, password });
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("lists every signed-in device with this one first", async () => {
    const phone = await signIn(SAFARI_IPHONE);
    const laptop = await signIn(CHROME_WIN);
    const res = await request(app).get("/api/auth/devices").set(as(laptop));
    expect(res.status).toBe(200);
    // The registration itself is a device too.
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0]).toMatchObject({ current: true, browser: "Chrome", os: "Windows", type: "desktop" });
    expect(res.body.data.filter((d: { current: boolean }) => d.current)).toHaveLength(1);
    expect(res.body.data.some((d: { os: string }) => d.os === "iOS")).toBe(true);
    expect(res.body.data[0].ip).toBeTruthy();

    // Rotating the cookie keeps it one device.
    await request(app).post("/api/auth/refresh").set(xhr).set("Cookie", `eavto_rt=${phone.cookie}`).expect(200);
    expect((await request(app).get("/api/auth/devices").set(as(laptop))).body.data).toHaveLength(3);
  });

  it("signs one device out", async () => {
    const a = await signIn(SAFARI_IPHONE);
    const b = await signIn(CHROME_WIN);
    const list = (await request(app).get("/api/auth/devices").set(as(b))).body.data as { id: string; current: boolean }[];
    const aFamily = (await prisma.refreshToken.findFirst({ where: { userId, revokedAt: null }, orderBy: { createdAt: "desc" }, skip: 1, select: { familyId: true } }))!.familyId;
    expect(list.some((d) => d.id === aFamily)).toBe(true);

    const out = await request(app).delete(`/api/auth/devices/${aFamily}`).set(as(b));
    expect(out.status).toBe(200);
    expect(out.body.data.current).toBe(false);
    expect((await request(app).post("/api/auth/refresh").set(xhr).set("Cookie", `eavto_rt=${a.cookie}`)).status).toBe(401);
    // Another user's device id is not found.
    expect((await request(app).delete(`/api/auth/devices/00000000-0000-4000-8000-000000000000`).set(as(b))).status).toBe(404);
  });

  it("signs every other device out at once and keeps this one", async () => {
    const other = await signIn(SAFARI_IPHONE);
    const me = await signIn(CHROME_WIN);
    const res = await request(app).post("/api/auth/devices/sign-out-others").set(as(me));
    expect(res.status).toBe(200);

    // The other device: refresh and access token both stop working immediately.
    expect((await request(app).post("/api/auth/refresh").set(xhr).set("Cookie", `eavto_rt=${other.cookie}`)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set({ Authorization: `Bearer ${other.token}` })).status).toBe(401);

    // This device: the new access token works and the cookie still refreshes.
    expect((await request(app).get("/api/auth/me").set({ Authorization: `Bearer ${res.body.data.token}` })).status).toBe(200);
    expect((await request(app).post("/api/auth/refresh").set(xhr).set("Cookie", `eavto_rt=${me.cookie}`)).status).toBe(200);
    const left = await request(app).get("/api/auth/devices").set({ Authorization: `Bearer ${res.body.data.token}` });
    expect(left.body.data).toHaveLength(1);
  });

  it("needs the X-Requested-With header to sign devices out", async () => {
    const me = await signIn(CHROME_WIN);
    const res = await request(app).post("/api/auth/devices/sign-out-others").set({ Authorization: `Bearer ${me.token}`, Cookie: `eavto_rt=${me.cookie}` });
    expect(res.status).toBe(403);
  });
});
