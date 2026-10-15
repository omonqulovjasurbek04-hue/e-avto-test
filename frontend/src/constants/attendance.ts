import type { AttendanceStatus } from "@/services/platform.service";

/** Badge colour per status; the visible text comes from i18n (`attendance.status.*`). */
export const ATTENDANCE_VARIANT: Record<AttendanceStatus, "success" | "danger" | "warning" | "neutral" | "primary"> = {
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  EXCUSED: "neutral",
  ONLINE: "primary",
};

export const ATTENDANCE_STATUSES = Object.keys(ATTENDANCE_VARIANT) as AttendanceStatus[];
