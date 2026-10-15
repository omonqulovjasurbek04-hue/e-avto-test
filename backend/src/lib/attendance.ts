export type AttendanceStatusName = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "ONLINE";

export interface AttendanceSummary {
  /** Sessions that count (cancelled lessons are excluded before this function is called). */
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  online: number;
  /** 0-100, one decimal; null when nothing counts yet. */
  percent: number | null;
}

/**
 * DEFAULT RULE (owner has not decided yet — see IMPLEMENTATION_PLAN "business decisions"):
 * attended = PRESENT + LATE + ONLINE; EXCUSED lessons are removed from the denominator;
 * ABSENT counts against the student. Change only here.
 */
export const summarize = (statuses: AttendanceStatusName[]): AttendanceSummary => {
  const count = (s: AttendanceStatusName) => statuses.filter((x) => x === s).length;
  const present = count("PRESENT");
  const late = count("LATE");
  const online = count("ONLINE");
  const absent = count("ABSENT");
  const excused = count("EXCUSED");
  const denominator = statuses.length - excused;
  const percent = denominator > 0 ? Math.round(((present + late + online) / denominator) * 1000) / 10 : null;
  return { total: statuses.length, present, absent, late, excused, online, percent };
};

/** Neutralises spreadsheet formula injection in exported text cells. */
export const csvCell = (value: unknown): string => {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (header: string[], rows: unknown[][]): string =>
  [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
