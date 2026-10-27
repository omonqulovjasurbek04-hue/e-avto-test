const pad = (n: number) => String(n).padStart(4, "0");
const valid = (n?: number | null): n is number => typeof n === "number" && n > 0;

/** 1 → "student0001", 12345 → "student12345" (at least four digits). Empty when there is no number. */
export const formatStudentId = (n?: number | null): string => (valid(n) ? `student${pad(n)}` : "");

/** 1 → "user0001". Empty when there is no number. */
export const formatUserId = (n?: number | null): string => (valid(n) ? `user${pad(n)}` : "");

/** 1 → "teacher0001". Empty when there is no number. */
export const formatTeacherId = (n?: number | null): string => (valid(n) ? `teacher${pad(n)}` : "");

type Numbers = { role?: string; userNumber?: number | null; studentNumber?: number | null; teacherNumber?: number | null };

/**
 * The id shown for an account: "teacher0001" for a teacher, else "student0007" once a course was opened,
 * else "user0005". Same rule as the server (backend/src/lib/accountNumbers.ts).
 */
export const formatAccountId = (u?: Numbers | null): string => {
  if (u?.teacherNumber && (u.role === undefined || u.role === "TEACHER")) return formatTeacherId(u.teacherNumber);
  return formatStudentId(u?.studentNumber) || formatUserId(u?.userNumber) || formatTeacherId(u?.teacherNumber);
};

/**
 * What the account badge shows: staff are known by their role ("O'qituvchi", "Admin", …), not by the
 * sign-up number they had as a user; students keep "user0002" / "student0002".
 */
export const accountLabel = (
  u: Numbers | null | undefined,
  t: (key: string, fallback: string) => string
): string => (u?.role && u.role !== "USER" ? t(`roles.${u.role}`, u.role) : formatAccountId(u));
