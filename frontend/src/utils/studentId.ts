/** 1 → "student0001", 12345 → "student12345" (at least four digits). Empty when the server sent no number. */
export const formatStudentId = (n?: number | null): string =>
  typeof n === "number" && n > 0 ? `student${String(n).padStart(4, "0")}` : "";
