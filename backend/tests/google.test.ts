import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Integration: "Continue with Google" with Google's token endpoint stubbed. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `gg${Date.now()}`;
const CLIENT_ID = "test-client.apps.googleusercontent.com";

describe.skipIf(!enabled)("continue with Google", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const realFetch = globalThis.fetch;

  const idToken = (claims: Record<string, unknown>) =>
    ["e30", Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 600, email_verified: true, ...claims })).toString("base64url"), "sig"].join(".");
  // Google's token endpoint answers with this ID token; every other request goes out as usual.
  const googleReturns = (claims: Record<string, unknown>) =>
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) =>
      String(input).startsWith("https://oauth2.googleapis.com/token")
        ? new Response(JSON.stringify({ id_token: idToken(claims) }), { status: 200, headers: { "Content-Type": "application/json" } })
        : realFetch(input, init)
    );

  /** start -> callback with the state Google would echo back; returns the callback response. */
  const signIn = async (claims: Record<string, unknown>) => {
    googleReturns(claims);
    const begin = await request(app).get("/api/auth/google/start?next=/tests");
    const state = new URL(begin.headers.location).searchParams.get("state")!;
    const cookies = (begin.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    return request(app).get(`/api/auth/google/callback?code=abc&state=${state}`).set("Cookie", cookies);
  };
  const refreshCookieOf = (res: request.Response) =>
    (res.headers["set-cookie"] as unknown as string[] | undefined)?.find((c) => c.startsWith("eavto_rt=") && !c.startsWith("eavto_rt=;"));

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
  });

  afterEach(() => vi.restoreAllMocks());

  afterAll(async () => {
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { email: { startsWith: run } } });
    await prisma.$disconnect();
  });

  it("tells the site the button is available and sends the browser to Google", async () => {
    expect((await request(app).get("/api/auth/google/config")).body.data.enabled).toBe(true);
    const res = await request(app).get("/api/auth/google/start");
    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/google\/callback$/);
    expect((res.headers["set-cookie"] as unknown as string[]).join(";")).toMatch(/eavto_gs=.*HttpOnly/i);
  });

  it("creates an account that still has to finish sign-up, with a verified e-mail", async () => {
    const res = await signIn({ sub: `${run}-new`, email: `${run}-new@gmail.com`, name: "Ali Valiyev" });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/auth\/google\?next=%2Ftests$/);
    expect(refreshCookieOf(res)).toBeTruthy();
    const user = await prisma.user.findUnique({ where: { googleId: `${run}-new` } });
    expect(user).toMatchObject({ email: `${run}-new@gmail.com`, name: "Ali Valiyev", passwordHash: null, role: "USER" });
    expect(user?.emailVerifiedAt).toBeTruthy();

    // The second time it is the same account.
    await signIn({ sub: `${run}-new`, email: `${run}-new@gmail.com`, name: "Ali" });
    expect(await prisma.user.count({ where: { email: `${run}-new@gmail.com` } })).toBe(1);
  });

  it("links an existing account with the same e-mail", async () => {
    const reg = await request(app).post("/api/auth/register").send({ name: "Old account", email: `${run}-old@gmail.com`, password: "Passw0rdOK" });
    const res = await signIn({ sub: `${run}-old`, email: `${run}-OLD@gmail.com` });
    expect(refreshCookieOf(res)).toBeTruthy();
    const user = await prisma.user.findUnique({ where: { id: reg.body.data.user.id } });
    expect(user?.googleId).toBe(`${run}-old`);
  });

  it("refuses a forged state, an unverified e-mail and a token for another app", async () => {
    googleReturns({ sub: `${run}-x`, email: `${run}-x@gmail.com` });
    const forged = await request(app).get("/api/auth/google/callback?code=abc&state=guess").set("Cookie", "eavto_gs=real");
    expect(forged.headers.location).toMatch(/\/login\?google=failed$/);

    expect((await signIn({ sub: `${run}-u`, email: `${run}-u@gmail.com`, email_verified: false })).headers.location).toMatch(/google=failed/);
    expect((await signIn({ sub: `${run}-a`, email: `${run}-a@gmail.com`, aud: "someone-else" })).headers.location).toMatch(/google=failed/);
    expect(await prisma.user.count({ where: { googleId: { in: [`${run}-u`, `${run}-a`] } } })).toBe(0);
  });

  it("only returns to a path on this site", async () => {
    googleReturns({ sub: `${run}-n`, email: `${run}-n@gmail.com` });
    const begin = await request(app).get("/api/auth/google/start?next=//evil.example");
    expect((begin.headers["set-cookie"] as unknown as string[]).join(";")).toMatch(/eavto_gn=%2Fdashboard/);
  });
});
