import { Prisma, Role } from "@prisma/client";

/**
 * Public account numbers. The internal `users.id` is the permanent identity that every record links to;
 * these are what people see and type. The database gives them (triggers on "users"), whatever sets the role:
 *   userNumber    — at sign-up → "user0005". Freed when the account becomes a teacher or staff, then
 *                   given to a new sign-up (history in user_identifiers).
 *   studentNumber — own sequence, at the first paid (or admin-granted) course → "student0001". Never reused.
 *   teacherNumber — own sequence, when the account first becomes a teacher → "teacher0001". Never reused.
 *   staffNumber   — one sequence per staff role → "moderator01", "finance01", "manager01",
 *                   "admin01", "superadmin01". A new staff role gives a new number. Never reused.
 * At least four digits (two for staff: there are few of them), never a limit: …9999, then 10000, …
 */
const pad = (n: number) => String(n).padStart(4, "0");

/** Staff roles and the prefix of their numbers (the role in lower case). */
export const STAFF_ROLES = ["MODERATOR", "FINANCE", "MANAGER", "ADMIN", "SUPERADMIN"] as const satisfies readonly Role[];
const isStaff = (role: string | undefined): role is (typeof STAFF_ROLES)[number] => (STAFF_ROLES as readonly string[]).includes(role ?? "");

export const formatUserId = (n: number) => `user${pad(n)}`;
export const formatStudentId = (n: number) => `student${pad(n)}`;
export const formatTeacherId = (n: number) => `teacher${pad(n)}`;
export const formatStaffId = (role: string, n: number) => `${role.toLowerCase()}${String(n).padStart(2, "0")}`;

type Numbers = { userNumber: number | null; studentNumber: number | null; teacherNumber?: number | null; staffNumber?: number | null; role?: string };

/** The number shown for an account: staff number for staff, teacher number for a teacher, else student, else user. */
export const formatAccountId = (u: Numbers) => {
  if (u.staffNumber && isStaff(u.role)) return formatStaffId(u.role, u.staffNumber);
  if (u.teacherNumber && (u.role === undefined || u.role === "TEACHER")) return formatTeacherId(u.teacherNumber);
  if (u.studentNumber) return formatStudentId(u.studentNumber);
  if (u.userNumber) return formatUserId(u.userNumber);
  return u.teacherNumber ? formatTeacherId(u.teacherNumber) : "—";
};

/** Largest value of the Int columns; a longer typed number cannot belong to anyone. */
const MAX_NUMBER = 2_147_483_647;
const asNumber = (digits: string) => {
  const n = Number(digits);
  return n >= 1 && n <= MAX_NUMBER ? n : null;
};

/**
 * "admin0001" / "teacher0003" / "student0007" / "user0042" / "#42" / "42" → a filter on the matching
 * number(s); null when the text is not an account id. A bare number is read as an id only up to 6 digits,
 * so phone numbers (7+ digits) are still searched as phones.
 */
export const accountIdFilter = (text: string): Prisma.UserWhereInput | null => {
  const q = text.trim();
  const prefixed = /^(superadmin|admin|manager|finance|moderator|teacher|student|user)0*(\d{1,10})$/i.exec(q);
  if (prefixed) {
    const n = asNumber(prefixed[2]);
    // An impossible number matches nobody (instead of an error from the database).
    if (n === null) return { id: { in: [] } };
    const kind = prefixed[1].toLowerCase();
    if (kind === "student") return { studentNumber: n };
    if (kind === "teacher") return { teacherNumber: n };
    if (kind === "user") return { userNumber: n };
    return { role: kind.toUpperCase() as Role, staffNumber: n };
  }
  const bare = /^#?0*(\d{1,6})$/.exec(q);
  if (bare) {
    const n = asNumber(bare[1]);
    return n === null ? { id: { in: [] } } : { OR: [{ userNumber: n }, { studentNumber: n }, { teacherNumber: n }, { staffNumber: n }] };
  }
  return null;
};

/**
 * Makes the account a student on its first course (paid or granted): the next student number.
 * A no-op when it already is one (renewals, second course).
 */
export const assignStudentNumber = (tx: Prisma.TransactionClient, userId: string) =>
  tx.$executeRaw`UPDATE "users" SET "studentNumber" = nextval('"student_number_seq"') WHERE "id" = ${userId} AND "studentNumber" IS NULL`;
