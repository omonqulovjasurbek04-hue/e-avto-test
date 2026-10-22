const pad = (n: number) => String(n).padStart(4, "0");
const valid = (n?: number | null): n is number => typeof n === "number" && n > 0;

/** 1 → "student0001", 12345 → "student12345" (at least four digits). Empty when there is no number. */
export const formatStudentId = (n?: number | null): string => (valid(n) ? `student${pad(n)}` : "");

/** 1 → "user0001". Empty when there is no number. */
export const formatUserId = (n?: number | null): string => (valid(n) ? `user${pad(n)}` : "");

/**
 * The id shown for an account: "user0002" until a course is bought, then "student0002" (same number).
 */
export const formatAccountId = (u?: { userNumber?: number | null; studentNumber?: number | null } | null): string =>
  formatStudentId(u?.studentNumber) || formatUserId(u?.userNumber);
