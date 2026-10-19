import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Lesson } from "@/types/lesson";
import { Alert } from "@/components/ui/Alert";

// Browsers format "uz-UZ" dates poorly ("M10 21"), so the Uzbek month names are spelled out here.
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const UZ_CYRL_MONTHS = ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];

/** "21-oktabr" / "21-октябр" / "21 октября" in the current UI language. */
export const formatUnlockDate = (iso: string, lang: string) => {
  const d = new Date(iso);
  if (lang === "ru") return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const months = lang === "uz_cyrl" ? UZ_CYRL_MONTHS : UZ_MONTHS;
  return `${d.getDate()}-${months[d.getMonth()]}`;
};

/** Short reason for a lesson row: when or how it opens. */
export function lockHint(lesson: Lesson, t: (k: string, o?: Record<string, unknown>) => string, lang: string): string {
  if (lesson.lockReason === "schedule" && lesson.unlocksAt) return t("lock.scheduleShort", { date: formatUnlockDate(lesson.unlocksAt, lang) });
  if (lesson.lockReason === "attendance") return t("lock.attendanceShort");
  return t("lock.locked");
}

/**
 * Why a lesson is closed: not bought yet (link to prices), waits for the next class (group students),
 * or opens on a date (distance learning: 2 lessons every 3 days).
 */
export default function LessonLockNotice({ lesson, className }: { lesson: Lesson; className?: string }) {
  const { t, i18n } = useTranslation();
  if (lesson.lockReason === "schedule" || lesson.lockReason === "attendance") {
    return (
      <Alert variant="info" title={t("lock.notYetTitle")} className={className}>
        {lesson.lockReason === "schedule" && lesson.unlocksAt
          ? t("lock.schedule", { date: formatUnlockDate(lesson.unlocksAt, i18n.language) })
          : t("lock.attendance")}
      </Alert>
    );
  }
  return (
    <Alert variant="warning" title={t("lock.title")} className={className}>
      {t("lock.details")} <Link to={`/my-courses/${lesson.courseId}#packages`} className="font-semibold underline">{t("lock.link")}</Link>
    </Alert>
  );
}
