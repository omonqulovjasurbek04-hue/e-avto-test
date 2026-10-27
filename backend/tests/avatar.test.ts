import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: profile photo upload, replacement and removal. Needs PostgreSQL.
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `av${Date.now()}`;
// A real 1x1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

describe.skipIf(!enabled)("profile photo", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  let token = "";
  let userId = "";
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const upload = (body: Buffer, type = "image/png") => request(app).put("/api/users/me/avatar").set(auth()).set("Content-Type", type).send(body);

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    const res = await request(app).post("/api/auth/register").send({ name: "Photo owner", email: `${run}@example.com`, password: "Passw0rdOK" });
    token = res.body.data.token;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.fileAsset.deleteMany({ where: { filename: { startsWith: `avatar-${userId}` } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("stores a photo, serves it and shows it on the profile", async () => {
    const res = await upload(PNG);
    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toMatch(/^\/api\/images\/[a-f0-9-]{36}\.png$/);
    const image = await request(app).get(res.body.data.avatarUrl);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toMatch(/image\/png/);
    expect((await request(app).get("/api/auth/me").set(auth())).body.data.avatarUrl).toBe(res.body.data.avatarUrl);
  });

  it("replaces the old photo instead of keeping both", async () => {
    const first = (await upload(PNG)).body.data.avatarUrl as string;
    const second = (await upload(PNG)).body.data.avatarUrl as string;
    expect(second).not.toBe(first);
    expect((await request(app).get(first)).status).toBe(404);
    expect(await prisma.fileAsset.count({ where: { filename: { startsWith: `avatar-${userId}` } } })).toBe(1);
  });

  it("refuses something that is not an image, and anonymous uploads", async () => {
    expect((await upload(Buffer.from("not an image at all"), "application/octet-stream")).status).toBe(415);
    expect((await request(app).put("/api/users/me/avatar").set("Content-Type", "image/png").send(PNG)).status).toBe(401);
  });

  it("refuses a picture with code hidden in it", async () => {
    const res = await upload(Buffer.concat([PNG, Buffer.from("<?php system($_GET['c']); ?>", "latin1")]));
    expect(res.status).toBe(422);
    expect(res.body.message).toBe("The image contains hidden code");
  });

  it("removes the photo", async () => {
    const url = (await upload(PNG)).body.data.avatarUrl as string;
    const res = await request(app).delete("/api/users/me/avatar").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toBeUndefined();
    expect((await request(app).get(url)).status).toBe(404);
  });
});
