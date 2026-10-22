import { Prisma } from "@prisma/client";

/**
 * Two permanent account numbers:
 *   userNumber    — every account, at sign-up              → "user0002"
 *   studentNumber — only after the first paid course, the SAME number → "student0002"
 * So the prefix tells a buyer from someone who only signed up, and the number stays the person's own.
 */
/**
 * At least four digits, never a limit: user0001 … user9999, then user10000 … user99999, user100000, …
 * The counter itself is a database sequence (users_userNumber_seq), so it simply keeps going.
 */
const pad = (n: number) => String(n).padStart(4, "0");

export const formatUserId = (n: number) => `user${pad(n)}`;
export const formatStudentId = (n: number) => `student${pad(n)}`;

/** The number shown for an account: the student number once a course was bought, otherwise the user number. */
export const formatAccountId = (u: { userNumber: number; studentNumber: number | null }) =>
  u.studentNumber ? formatStudentId(u.studentNumber) : formatUserId(u.userNumber);

/** Largest value of the Int columns; a longer typed number cannot belong to anyone. */
const MAX_NUMBER = 2_147_483_647;
const asNumber = (digits: string) => {
  const n = Number(digits);
  return n >= 1 && n <= MAX_NUMBER ? n : null;
};

/**
 * "student0007" / "user0042" / "user123456" / "#42" / "42" → a filter on the matching number(s);
 * null when the text is not an account id. A bare number is read as an id only up to 6 digits,
 * so phone numbers (7+ digits) are still searched as phones.
 */
export const accountIdFilter = (text: string): Prisma.UserWhereInput | null => {
  const q = text.trim();
  const prefixed = /^(student|user)0*(\d{1,10})$/i.exec(q);
  if (prefixed) {
    const n = asNumber(prefixed[2]);
    // An impossible number matches nobody (instead of an error from the database).
    if (n === null) return { id: { in: [] } };
    return prefixed[1].toLowerCase() === "student" ? { studentNumber: n } : { userNumber: n };
  }
  const bare = /^#?0*(\d{1,6})$/.exec(q);
  if (bare) {
    const n = asNumber(bare[1]);
    return n === null ? { id: { in: [] } } : { OR: [{ userNumber: n }, { studentNumber: n }] };
  }
  return null;
};

/**
 * Makes the account a student on the first paid course: user0002 becomes student0002.
 * A no-op when it already is one (renewals, second course).
 */
export const assignStudentNumber = (tx: Prisma.TransactionClient, userId: string) =>
  tx.$executeRaw`UPDATE "users" SET "studentNumber" = "userNumber" WHERE "id" = ${userId} AND "studentNumber" IS NULL`;
