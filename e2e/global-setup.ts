import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { API, E2E_DB } from "./playwright.config";

const requireFromBackend = createRequire(path.resolve(__dirname, "../backend/package.json"));
const { PrismaClient } = requireFromBackend("@prisma/client") as typeof import("../backend/node_modules/@prisma/client");

export const STATE_FILE = path.resolve(__dirname, ".state.json");
export const PASSWORD = "Passw0rdOK";

export interface State {
  run: string;
  emails: { admin: string; teacher: string; student: string; other: string; finance: string; moderator: string };
  ids: { student: string; other: string; teacher: string; course: string; lesson: string; package: string; group: string; slot: string };
  pkgPriceMinor: number;
}

async function call<T>(method: string, url: string, token?: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { success: boolean; data: T; message?: string };
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${json.message ?? ""}`);
  return json.data;
}

/** Creates users, a course with a lesson, a priced package, a coupon, and a group with one lesson slot. */
export default async function globalSetup() {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DB } } });
  const run = `e${Date.now().toString(36)}`;
  const emails = { admin: `${run}-admin@e2e.test`, teacher: `${run}-teacher@e2e.test`, student: `${run}-student@e2e.test`, other: `${run}-other@e2e.test`, finance: `${run}-finance@e2e.test`, moderator: `${run}-moderator@e2e.test` };

  const register = (name: string, email: string) =>
    call<{ token: string; user: { id: string } }>("POST", "/auth/register", undefined, { name, email, password: PASSWORD });

  const admin = await register("E2E Admin", emails.admin);
  const teacher = await register("E2E Teacher", emails.teacher);
  const student = await register("E2E Student", emails.student);
  const other = await register("E2E Other", emails.other);
  const finance = await register("E2E Finance", emails.finance);
  const moderator = await register("E2E Moderator", emails.moderator);
  await prisma.user.update({ where: { id: finance.user.id }, data: { role: "FINANCE" } });
  await prisma.user.update({ where: { id: moderator.user.id }, data: { role: "MODERATOR" } });
  await prisma.user.update({ where: { id: admin.user.id }, data: { role: "ADMIN" } });
  await prisma.user.update({ where: { id: teacher.user.id }, data: { role: "TEACHER" } });

  const t = admin.token;
  const course = await call<{ id: string }>("POST", "/admin/courses", t, { title: `E2E Kurs ${run}`, description: "E2E sinov kursi", isPublished: true });
  const lesson = await call<{ id: string }>("POST", "/admin/lessons", t, { courseId: course.id, title: `E2E Dars ${run}`, content: "Yopiq dars matni", videoUrl: "https://cdn.example.com/video.mp4", isPublished: true });
  const pkg = await call<{ id: string }>("POST", "/admin/catalog/packages", t, { courseId: course.id, name: `E2E Paket ${run}`, durationDays: 30 });
  const pkgPriceMinor = 20_000_000; // 200 000 so'm
  await call("POST", `/admin/catalog/packages/${pkg.id}/prices`, t, { amount: pkgPriceMinor, isSample: true });
  await call("POST", "/admin/catalog/coupons", t, { code: `E2E${run.toUpperCase()}`.slice(0, 20), type: "PERCENT", value: 10 });

  const group = await call<{ id: string }>("POST", "/admin/groups", t, { name: `E2E Guruh ${run}`, courseId: course.id, teacherId: teacher.user.id, startDate: "2026-09-01", capacity: 10 });
  await call("POST", `/admin/groups/${group.id}/members`, t, { studentId: student.user.id });
  const start = new Date(Date.now() + 86_400_000);
  const slots = await call<{ id: string }[]>("POST", `/admin/groups/${group.id}/slots`, t, {
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + 5_400_000).toISOString(),
    room: `E2E-${run}`,
    topic: "E2E mavzu",
  });

  const state: State = {
    run,
    emails,
    ids: { student: student.user.id, other: other.user.id, teacher: teacher.user.id, course: course.id, lesson: lesson.id, package: pkg.id, group: group.id, slot: slots[0].id },
    pkgPriceMinor,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  await prisma.$disconnect();
}
