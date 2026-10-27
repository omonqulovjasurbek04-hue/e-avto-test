import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Integration: linking Google and Telegram to a signed-in account, and unlinking. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `la${Date.now()}`;
const CLIENT_ID = "link-test.apps.googleusercontent.com";

describe.skipIf(!enabled)("linked accounts", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let telegram: typeof import("../src/services/telegram.service");
  let googleClaims: Record<string, unknown> = {};
  let sent: string[] = [];

  const idToken = () =>
    ["e30", Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 600, email_verified: true, ...googleClaims })).toString("base64url"), "sig"].join(".");

  const cookieOf = (res: request.Response, name: string) =>
    (res.headers["set-cookie"] as unknown as string[] | undefined)?.find((c) => c.startsWith(`${name}=`))?.split(";")[0];

  /** A password account: its access token and refresh cookie. */
  const signUp = async (label: string) => {
    const res = await request(app).post("/api/auth/register").send({ name: "Linked user", email: `${run}-${label}@example.com`, password: "Passw0rdOK" });
    return { id: res.body.data.user.id as string, token: res.body.data.token as string, cookie: cookieOf(res, "eavto_rt")! };
  };

  /** Settings -> "Link Google": start with the session cookie, come back from Google with a code. */
  const linkGoogle = async (who: { cookie: string }, sub: string) => {
    googleClaims = { sub, email: `${sub}@gmail.com` };
    const begin = await request(app).get("/api/auth/google/start?link=1").set("Cookie", who.cookie);
    const state = new URL(begin.headers.location).searchParams.get("state")!;
    const cookies = (begin.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    return request(app).get(`/api/auth/google/callback?code=abc&state=${state}`).set("Cookie", cookies);
  };

  const botCode = async (tgId: number) => {
    await telegram.handleUpdate({ update_id: 1, message: { text: "/start", chat: { id: tgId, type: "private" }, from: { id: tgId, first_name: "Ali" } } });
    return sent[sent.length - 1].match(/\b(\d{6})\b/)![1];
  };

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { body?: unknown }) => {
        if (String(url).startsWith("https://oauth2.googleapis.com/token")) {
          return new Response(JSON.stringify({ id_token: idToken() }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        // Telegram Bot API: remember the text the bot sends (the code).
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        if (body.text) sent.push(String(body.text));
        return { ok: true, json: async () => ({ ok: true, result: {} }) };
      })
    );
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    telegram = await import("../src/services/telegram.service");
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (!enabled) return;
    await prisma.user.deleteMany({ where: { OR: [{ email: { startsWith: run } }, { googleId: { startsWith: run } }, { telegramId: { startsWith: "8880" } }] } });
    await prisma.$disconnect();
  });

  it("links Google to the signed-in account and shows it on the profile", async () => {
    const me = await signUp("g");
    const res = await linkGoogle(me, `${run}-g`);
    expect(res.headers.location).toMatch(/\/settings\?google=linked$/);
    const profile = await request(app).get("/api/auth/me").set({ Authorization: `Bearer ${me.token}` });
    expect(profile.body.data).toMatchObject({ googleLinked: true, telegramLinked: false });

    // Google now signs in to the same account.
    googleClaims = { sub: `${run}-g`, email: `${run}-other@gmail.com` };
    const begin = await request(app).get("/api/auth/google/start");
    const state = new URL(begin.headers.location).searchParams.get("state")!;
    const cookies = (begin.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    const login = await request(app).get(`/api/auth/google/callback?code=abc&state=${state}`).set("Cookie", cookies);
    expect(cookieOf(login, "eavto_rt")).toBeTruthy();
    expect(await prisma.user.count({ where: { googleId: `${run}-g` } })).toBe(1);
  });

  it("refuses a Google account already linked to someone else, and a link without a session", async () => {
    const other = await signUp("taken");
    expect((await linkGoogle(other, `${run}-g`)).headers.location).toMatch(/\/settings\?google=taken$/);
    const anonymous = await request(app).get("/api/auth/google/start?link=1");
    expect(anonymous.headers.location).toMatch(/\/login$/);
  });

  it("links Telegram with a bot code", async () => {
    const me = await signUp("t");
    sent = [];
    const res = await request(app).post("/api/auth/telegram/link").set({ Authorization: `Bearer ${me.token}` }).send({ code: await botCode(888001) });
    expect(res.status).toBe(200);
    expect(res.body.data.telegramLinked).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: me.id } }))?.telegramId).toBe("888001");

    const other = await signUp("t2");
    const clash = await request(app).post("/api/auth/telegram/link").set({ Authorization: `Bearer ${other.token}` }).send({ code: await botCode(888001) });
    expect(clash.status).toBe(409);
  });

  /** "Continue with Google" from the login page (not linking). */
  const googleSignIn = async (sub: string, email: string) => {
    googleClaims = { sub, email };
    const begin = await request(app).get("/api/auth/google/start");
    const state = new URL(begin.headers.location).searchParams.get("state")!;
    const cookies = (begin.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    return request(app).get(`/api/auth/google/callback?code=abc&state=${state}`).set("Cookie", cookies);
  };

  it("shows which Google and Telegram accounts are linked", async () => {
    const me = await signUp("who");
    await linkGoogle(me, `${run}-who`);
    sent = [];
    const tg = await request(app).post("/api/auth/telegram/link").set({ Authorization: `Bearer ${me.token}` }).send({ code: await botCode(888010) });
    expect(tg.body.data).toMatchObject({ googleLinked: true, googleEmail: `${run}-who@gmail.com`, telegramLinked: true, telegramName: "Ali" });
  });

  it("after unlinking, Google sign-in does not re-link through the e-mail; linking again in Settings does", async () => {
    const me = await signUp("re");
    const email = `${run}-re@example.com`;
    await linkGoogle(me, `${run}-re`);
    await request(app).delete("/api/auth/google").set({ Authorization: `Bearer ${me.token}` }).expect(200);

    const refused = await googleSignIn(`${run}-re`, email);
    expect(refused.headers.location).toMatch(/\/login\?google=unlinked$/);
    expect((await prisma.user.findUnique({ where: { id: me.id } }))?.googleId).toBeNull();

    expect((await linkGoogle(me, `${run}-re`)).headers.location).toMatch(/google=linked$/);
    const back = await googleSignIn(`${run}-re`, email);
    expect(cookieOf(back, "eavto_rt")).toBeTruthy();
  });

  it("after unlinking, the Telegram account cannot open a second account; linking again works", async () => {
    const me = await signUp("tre");
    const auth = { Authorization: `Bearer ${me.token}` };
    sent = [];
    await request(app).post("/api/auth/telegram/link").set(auth).send({ code: await botCode(888020) }).expect(200);
    const off = await request(app).delete("/api/auth/telegram").set(auth);
    expect(off.body.data).toMatchObject({ telegramLinked: false });

    const login = await request(app).post("/api/auth/telegram/verify").send({ code: await botCode(888020) });
    expect(login.status).toBe(409);
    expect(await prisma.user.count({ where: { telegramId: "888020" } })).toBe(0);

    const again = await request(app).post("/api/auth/telegram/link").set(auth).send({ code: await botCode(888020) });
    expect(again.body.data.telegramLinked).toBe(true);
    const signIn = await request(app).post("/api/auth/telegram/verify").send({ code: await botCode(888020) });
    expect(signIn.body.data.user.id).toBe(me.id);
  });

  it("unlinks, but never the last way to sign in", async () => {
    const me = await signUp("u");
    await linkGoogle(me, `${run}-u`);
    const off = await request(app).delete("/api/auth/google").set({ Authorization: `Bearer ${me.token}` });
    expect(off.status).toBe(200);
    expect(off.body.data.googleLinked).toBe(false);

    // A Google-only account (no password) keeps Google.
    googleClaims = { sub: `${run}-only`, email: `${run}-only@gmail.com` };
    const begin = await request(app).get("/api/auth/google/start");
    const state = new URL(begin.headers.location).searchParams.get("state")!;
    const cookies = (begin.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    const login = await request(app).get(`/api/auth/google/callback?code=abc&state=${state}`).set("Cookie", cookies);
    const refreshed = await request(app).post("/api/auth/refresh").set("X-Requested-With", "XMLHttpRequest").set("Cookie", cookieOf(login, "eavto_rt")!);
    const blocked = await request(app).delete("/api/auth/google").set({ Authorization: `Bearer ${refreshed.body.data.token}` });
    expect(blocked.status).toBe(409);
  });
});
