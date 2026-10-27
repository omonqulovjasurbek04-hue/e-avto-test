import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

// Integration: public account numbers (user/student/teacher), their history and the admin actions on
// them. Needs PostgreSQL (the numbers are picked by database triggers and sequences).
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = `id${Date.now()}`;

describe.skipIf(!enabled)("account identifiers", () => {
  let app: import("express").Application;
  let prisma: typeof import("../src/config/database").prisma;
  const ids: string[] = [];
  const tok: Record<string, string> = {};
  const uid: Record<string, string> = {};
  let courseId = "";
  let course2 = "";
  const as = (k: string) => ({ Authorization: `Bearer ${tok[k]}` });

  const signup = async (k: string) => {
    const email = `${run}-${k}@example.com`;
    const res = await request(app).post("/api/auth/register").send({ name: `${run} ${k}`, email, password: "Passw0rdOK" });
    expect(res.status).toBe(201);
    ids.push(res.body.data.user.id);
    uid[k] = res.body.data.user.id;
    tok[k] = res.body.data.token;
    return res.body.data.user as { id: string; userNumber: number };
  };
  const relogin = async (k: string) => {
    tok[k] = (await request(app).post("/api/auth/login").send({ email: `${run}-${k}@example.com`, password: "Passw0rdOK" })).body.data.token;
  };
  const user = (k: string) => prisma.user.findUniqueOrThrow({ where: { id: uid[k] } });
  /** The number the database will give the next sign-up when one was freed: the smallest nobody holds. */
  const smallestFreed = async () => {
    const rows = await prisma.$queryRaw<{ n: number | null }[]>`
      SELECT MIN(ui."number")::int AS n FROM "user_identifiers" ui
       WHERE ui."kind" = 'USER' AND ui."releaseReason" = 'ROLE_CHANGE'
         AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."userNumber" = ui."number")`;
    return rows[0]?.n ?? null;
  };

  beforeAll(async () => {
    ({ default: app } = await import("../src/app"));
    ({ prisma } = await import("../src/config/database"));
    for (const k of ["admin", "manager"]) await signup(k);
    await prisma.user.update({ where: { id: uid.admin }, data: { role: "ADMIN" } });
    await prisma.user.update({ where: { id: uid.manager }, data: { role: "MANAGER" } });
    await relogin("admin");
    await relogin("manager");
    courseId = (await prisma.course.create({ data: { title: `Ids ${run}`, description: "d" } })).id;
    course2 = (await prisma.course.create({ data: { title: `Ids2 ${run}`, description: "d" } })).id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.teacherGroup.deleteMany({ where: { name: { startsWith: run } } });
    await prisma.enrollment.deleteMany({ where: { courseId: { in: [courseId, course2] } } });
    await prisma.course.deleteMany({ where: { id: { in: [courseId, course2] } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("gives every sign-up a number and records it", async () => {
    const ali = await signup("ali");
    expect(typeof ali.userNumber).toBe("number");
    const rows = await prisma.userIdentifier.findMany({ where: { userId: ali.id } });
    expect(rows).toEqual([expect.objectContaining({ kind: "USER", number: ali.userNumber, releasedAt: null })]);
  });

  it("never gives two simultaneous sign-ups the same number", async () => {
    const users = await Promise.all(Array.from({ length: 8 }, (_, i) => signup(`p${i}`)));
    const numbers = users.map((u) => u.userNumber);
    expect(new Set(numbers).size).toBe(8);
  });

  it("makes a user a teacher: teacher number, user number freed, account and courses kept", async () => {
    // Ali has a course before becoming a teacher.
    await request(app).post(`/api/admin/users/${uid.ali}/enrollments`).set(as("admin")).send({ courseId, reason: "Grant before teaching" }).expect(201);
    const before = await user("ali");

    const res = await request(app).patch(`/api/admin/users/${uid.ali}/role`).set(as("admin")).send({ role: "TEACHER", reason: "Hired as instructor" });
    expect(res.status).toBe(200);
    const after = await user("ali");
    expect(after.id).toBe(before.id);
    expect(after.userNumber).toBeNull();
    expect(after.teacherNumber).toEqual(expect.any(Number));
    expect(after.studentNumber).toBe(before.studentNumber);
    expect(await prisma.enrollment.count({ where: { userId: uid.ali, courseId } })).toBe(1);

    const history = await request(app).get(`/api/admin/users/${uid.ali}/identifiers`).set(as("admin"));
    const byKind = Object.fromEntries(history.body.data.map((r: { kind: string }) => [r.kind, r]));
    expect(byKind.USER).toMatchObject({ number: before.userNumber, releaseReason: "ROLE_CHANGE" });
    expect(byKind.USER.releasedAt).not.toBeNull();
    expect(byKind.TEACHER).toMatchObject({ number: after.teacherNumber, releasedAt: null });

    const audit = await prisma.auditLog.findFirst({ where: { entityId: uid.ali, action: "user.role.change" }, orderBy: { createdAt: "desc" } });
    expect(audit?.reason).toBe("Hired as instructor");
    expect(audit?.after).toMatchObject({ role: "TEACHER", userNumber: null, teacherNumber: after.teacherNumber });
  });

  it("gives a freed user number to a new sign-up, without mixing up the two people", async () => {
    const expected = await smallestFreed();
    expect(expected).not.toBeNull();
    const vali = await signup("vali");
    expect(vali.userNumber).toBe(expected);

    // The old holder's records still point at the old holder.
    const ali = await user("ali");
    expect(ali.userNumber).toBeNull();
    const valiRows = await prisma.userIdentifier.findMany({ where: { userId: uid.vali } });
    expect(valiRows).toEqual([expect.objectContaining({ kind: "USER", number: expected, releasedAt: null })]);
    // Search by the number finds today's holder only.
    const found = await request(app).get("/api/admin/users").query({ search: `user${String(expected).padStart(4, "0")}` }).set(as("admin"));
    expect(found.body.data.map((u: { id: string }) => u.id)).toEqual([uid.vali]);
  });

  it("keeps a teacher with active groups until the groups are handed over", async () => {
    const group = await prisma.teacherGroup.create({ data: { name: `${run} G`, courseId, teacherId: uid.ali, startDate: new Date() } });
    const refused = await request(app).patch(`/api/admin/users/${uid.ali}/role`).set(as("admin")).send({ role: "USER", reason: "Left" });
    expect(refused.status).toBe(409);
    expect((await user("ali")).role).toBe("TEACHER");

    await prisma.teacherGroup.update({ where: { id: group.id }, data: { status: "ARCHIVED" } });
    const ok = await request(app).patch(`/api/admin/users/${uid.ali}/role`).set(as("admin")).send({ role: "USER", reason: "Left" });
    expect(ok.status).toBe(200);
    const ali = await user("ali");
    // A user number again; the teacher number stays as history; the group (and its lessons) is still there.
    expect(ali.userNumber).toEqual(expect.any(Number));
    expect(ali.teacherNumber).toEqual(expect.any(Number));
    expect(await prisma.teacherProfile.findUnique({ where: { userId: uid.ali }, select: { isActive: true } })).toEqual({ isActive: false });
    expect(await prisma.teacherGroup.count({ where: { id: group.id } })).toBe(1);
  });

  it("opens a course without payment only with a reason and the right permission", async () => {
    const lastStudent = (await prisma.user.aggregate({ _max: { studentNumber: true } }))._max.studentNumber ?? 0;
    expect((await request(app).post(`/api/admin/users/${uid.vali}/enrollments`).set(as("admin")).send({ courseId })).status).toBe(422);
    expect((await request(app).post(`/api/admin/users/${uid.vali}/enrollments`).set(as("manager")).send({ courseId, reason: "Free place" })).status).toBe(403);

    const res = await request(app).post(`/api/admin/users/${uid.vali}/enrollments`).set(as("admin")).send({ courseId, days: 30, reason: "Free place" });
    expect(res.status).toBe(201);
    const vali = await user("vali");
    expect(vali.studentNumber).toBeGreaterThan(lastStudent);
    // Same course again while open: refused. A second course: same student number.
    expect((await request(app).post(`/api/admin/users/${uid.vali}/enrollments`).set(as("admin")).send({ courseId, reason: "Again" })).status).toBe(409);
    await request(app).post(`/api/admin/users/${uid.vali}/enrollments`).set(as("admin")).send({ courseId: course2, reason: "Second course" }).expect(201);
    expect((await user("vali")).studentNumber).toBe(vali.studentNumber);

    const list = await request(app).get(`/api/admin/users/${uid.vali}/enrollments`).set(as("admin"));
    expect(list.body.data).toHaveLength(2);
    const audit = await prisma.auditLog.findFirst({ where: { action: "enrollment.grant", entityId: res.body.data.id } });
    expect(audit?.reason).toBe("Free place");
  });

  it("audits blocking with the reason", async () => {
    await request(app).patch(`/api/admin/users/${uid.p0}/status`).set(as("admin")).send({ isActive: false, reason: "Spam" }).expect(200);
    const audit = await prisma.auditLog.findFirst({ where: { action: "user.block", entityId: uid.p0 } });
    expect(audit).toMatchObject({ actorId: uid.admin, reason: "Spam" });
  });

  it("lists teachers apart from users", async () => {
    await request(app).patch(`/api/admin/users/${uid.p1}/role`).set(as("admin")).send({ role: "TEACHER" }).expect(200);
    const teachers = await request(app).get("/api/admin/users").query({ kind: "teacher", search: run }).set(as("admin"));
    expect(teachers.body.data.map((u: { id: string }) => u.id)).toEqual([uid.p1]);
    const users = await request(app).get("/api/admin/users").query({ kind: "user", search: run }).set(as("admin"));
    expect(users.body.data.map((u: { id: string }) => u.id)).not.toContain(uid.p1);
  });
});
