import { Prisma } from "@prisma/client";

/**
 * Public account numbers. The internal `users.id` is the permanent identity that every record links to;
 * these are what people see and type:
 *   userNumber    — given at sign-up → "user0005". Freed when the account becomes a teacher and then
 *                   given to a new sign-up (the database picks it; history in user_identifiers).
 *   studentNumber — own sequence, at the first paid (or admin-granted) course → "student0001". Never reused.
 *   teacherNumber — own sequence, when the account first becomes a teacher → "teacher0001". Never reused.
 * At least four digits, never a limit: …9999, then 10000, 10001, …
 */
const pad = (n: number) => String(n).padStart(4, "0");

export const formatUserId = (n: number) => `user${pad(n)}`;
export const formatStudentId = (n: number) => `student${pad(n)}`;
export const formatTeacherId = (n: number) => `teacher${pad(n)}`;

type Numbers = { userNumber: number | null; studentNumber: number | null; teacherNumber?: number | null; role?: string };

/** The number shown for an account: a teacher's number, else the student number, else the user number. */
export const formatAccountId = (u: Numbers) => {
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
 * "teacher0003" / "student0007" / "user0042" / "user123456" / "#42" / "42" → a filter on the matching number(s);
 * null when the text is not an account id. A bare number is read as an id only up to 6 digits,
 * so phone numbers (7+ digits) are still searched as phones.
 */
export const accountIdFilter = (text: string): Prisma.UserWhereInput | null => {
  const q = text.trim();
  const prefixed = /^(teacher|student|user)0*(\d{1,10})$/i.exec(q);
  if (prefixed) {
    const n = asNumber(prefixed[2]);
    // An impossible number matches nobody (instead of an error from the database).
    if (n === null) return { id: { in: [] } };
    const kind = prefixed[1].toLowerCase();
    return kind === "student" ? { studentNumber: n } : kind === "teacher" ? { teacherNumber: n } : { userNumber: n };
  }
  const bare = /^#?0*(\d{1,6})$/.exec(q);
  if (bare) {
    const n = asNumber(bare[1]);
    return n === null ? { id: { in: [] } } : { OR: [{ userNumber: n }, { studentNumber: n }, { teacherNumber: n }] };
  }
  return null;
};

/**
 * Makes the account a student on its first course (paid or granted): the next student number.
 * A no-op when it already is one (renewals, second course).
 */
export const assignStudentNumber = (tx: Prisma.TransactionClient, userId: string) =>
  tx.$executeRaw`UPDATE "users" SET "studentNumber" = nextval('"student_number_seq"') WHERE "id" = ${userId} AND "studentNumber" IS NULL`;

/**
 * The account becomes a teacher: it gets a teacher number (the first time only) and its user number is
 * freed for a new sign-up. Courses, payments and results stay with the account (they link to its id).
 */
export const becomeTeacher = (tx: Prisma.TransactionClient, userId: string) =>
  tx.$executeRaw`UPDATE "users" SET "teacherNumber" = COALESCE("teacherNumber", nextval('"teacher_number_seq"')::INTEGER), "userNumber" = NULL WHERE "id" = ${userId}`;

/** No longer a teacher: the account needs a user number again (a freed one, else a new one). */
export const leaveTeacher = (tx: Prisma.TransactionClient, userId: string) =>
  tx.$executeRaw`UPDATE "users" SET "userNumber" = "next_user_number"() WHERE "id" = ${userId} AND "userNumber" IS NULL`;
