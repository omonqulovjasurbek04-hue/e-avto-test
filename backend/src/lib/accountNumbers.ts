import { Prisma } from "@prisma/client";

/**
 * Two permanent account numbers:
 *   userNumber    — every account, at sign-up             → "user0001"
 *   studentNumber — only after the first paid course       → "student0001" (own sequence)
 * So the number alone tells a buyer from someone who only signed up. Neither is ever reused.
 */
const pad = (n: number) => String(n).padStart(4, "0");

export const formatUserId = (n: number) => `user${pad(n)}`;
export const formatStudentId = (n: number) => `student${pad(n)}`;

/** The number shown for an account: the student number once a course was bought, otherwise the user number. */
export const formatAccountId = (u: { userNumber: number; studentNumber: number | null }) =>
  u.studentNumber ? formatStudentId(u.studentNumber) : formatUserId(u.userNumber);

/** "student0007" / "user0042" / "#42" / "42" → a filter on the matching number(s); null when the text is not a number. */
export const accountIdFilter = (text: string): Prisma.UserWhereInput | null => {
  const q = text.trim();
  const student = /^student0*(\d{1,9})$/i.exec(q);
  if (student) return { studentNumber: Number(student[1]) };
  const user = /^user0*(\d{1,9})$/i.exec(q);
  if (user) return { userNumber: Number(user[1]) };
  const bare = /^#?(\d{1,6})$/.exec(q);
  if (bare) return { OR: [{ userNumber: Number(bare[1]) }, { studentNumber: Number(bare[1]) }] };
  return null;
};

/**
 * Gives the account its student number on the first paid course. A no-op when it already has one
 * (renewals, second course); the row lock makes concurrent fulfilments of one user safe.
 */
export const assignStudentNumber = (tx: Prisma.TransactionClient, userId: string) =>
  tx.$executeRaw`UPDATE "users" SET "studentNumber" = nextval('"users_student_number_seq"') WHERE "id" = ${userId} AND "studentNumber" IS NULL`;
