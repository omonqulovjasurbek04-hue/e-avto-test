import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  FileWarning,
  Minus,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  teacherService,
  type AttendanceStatus,
  type GroupJournal,
  type JournalLesson,
  type JournalMember,
} from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/utils/cn";
import { formatAccountId } from "@/utils/studentId";

const TZ = "Asia/Tashkent";
const LOCALES: Record<string, string> = { uz: "uz-UZ", uz_cyrl: "uz-Cyrl-UZ", ru: "ru-RU" };
const MONTH_NAMES: Record<string, string[]> = {
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
  uz_cyrl: ["январ", "феврал", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
};

const localeOf = (language: string): string => LOCALES[language] ?? "uz-UZ";

const tashkentParts = (date: Date): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return out;
};

const monthKeyOf = (date: Date): string => {
  const p = tashkentParts(date);
  return `${p.year}-${p.month}`;
};

const dayOfMonth = (iso: string | Date): number => Number(tashkentParts(new Date(iso)).day);

const daysInMonth = (month: string): number => {
  const [year, monthNo] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNo, 0)).getUTCDate();
};

const monthLabel = (month: string, language: string): string => {
  const [year, monthNo] = month.split("-").map(Number);
  const languageKey = language === "ru" || language.startsWith("ru-")
    ? "ru"
    : language.toLocaleLowerCase().includes("cyrl")
      ? "uz_cyrl"
      : "uz";
  const monthName = MONTH_NAMES[languageKey][monthNo - 1];
  const formattedName = languageKey === "uz" ? monthName[0].toLocaleUpperCase(localeOf(language)) + monthName.slice(1) : monthName;
  return `${formattedName} ${year}`;
};

interface Summary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  online: number;
  marked: number;
  percent: number | null;
}

/** Same rule as the server (backend/src/lib/attendance.ts): excused is out of the denominator. */
const summarize = (statuses: AttendanceStatus[]): Summary => {
  const count = (status: AttendanceStatus) => statuses.filter((s) => s === status).length;
  const present = count("PRESENT");
  const absent = count("ABSENT");
  const late = count("LATE");
  const excused = count("EXCUSED");
  const online = count("ONLINE");
  const denominator = statuses.length - excused;
  const percent = denominator > 0 ? Math.round(((present + late + online) / denominator) * 1000) / 10 : null;
  return { present, absent, late, excused, online, marked: statuses.length, percent };
};

const SYMBOL: Record<AttendanceStatus, string> = { PRESENT: "✓", ABSENT: "✗", LATE: "⏱", EXCUSED: "U", ONLINE: "•" };
const STATUS_CLASS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
  ABSENT: "bg-red-500 text-white shadow-sm shadow-red-500/30",
  LATE: "bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/30",
  EXCUSED: "bg-blue-200 text-blue-950 dark:bg-blue-900/70 dark:text-blue-100",
  ONLINE: "bg-brand-500 text-white shadow-sm shadow-brand-500/30",
};

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const recordOf = (lesson: JournalLesson | undefined, studentId: string) =>
  lesson?.records.find((r) => r.studentId === studentId);

interface PendingMark {
  slotId: string;
  studentId: string;
  status: AttendanceStatus | null;
  note: string | null;
}

export interface GroupJournalQuickActions {
  markAllPresent: (() => void) | null;
  exportCsv: (() => void) | null;
}

const download = (filename: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * A month of lessons as a day-by-day grid: rows are students, columns are the days of the Tashkent
 * calendar month. Clicking a cell cycles its attendance status; changes are saved explicitly.
 */
export function GroupAttendanceJournal({
  groupId,
  groupName,
  courseName,
  teacherName,
  canMark,
  month,
  summaryOpen,
  onCloseSummary,
  onPendingMarkCountChange,
  onSavingMarksChange,
  saveAttendanceRef,
  quickActionsRef,
  refreshKey = 0,
  onOpenLesson,
}: {
  groupId: string;
  groupName: string;
  courseName: string;
  teacherName: string;
  canMark: boolean;
  month: string;
  summaryOpen: boolean;
  onCloseSummary: () => void;
  onPendingMarkCountChange: (count: number) => void;
  onSavingMarksChange: (saving: boolean) => void;
  saveAttendanceRef: MutableRefObject<(() => void) | null>;
  quickActionsRef: MutableRefObject<GroupJournalQuickActions>;
  refreshKey?: number;
  onOpenLesson: (lesson: JournalLesson, preset?: "allPresent") => void;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const currentMonth = monthKeyOf(new Date());
  const [activeDay, setActiveDay] = useState(() => dayOfMonth(new Date()));
  const [telegramMessage, setTelegramMessage] = useState("");
  const [telegramMessageEdited, setTelegramMessageEdited] = useState(false);
  const [telegramTomorrowMessage, setTelegramTomorrowMessage] = useState("");
  const [telegramTomorrowMessageEdited, setTelegramTomorrowMessageEdited] = useState(false);
  const [telegramSending, setTelegramSending] = useState(false);
  const [telegramComposerOpen, setTelegramComposerOpen] = useState(false);
  const [pendingMarks, setPendingMarks] = useState<Record<string, PendingMark>>({});
  const [savingMarks, setSavingMarks] = useState(false);
  const savingMarksLock = useRef(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const studentColumnRef = useRef<HTMLTableCellElement>(null);
  const [tableScrollMetrics, setTableScrollMetrics] = useState({ tableWidth: 1500, studentColumnWidth: 320 });
  const journal = useLoad(() => teacherService.journal(groupId, month), [groupId, month, refreshKey]);
  const data = journal.data;
  const pendingMarkCount = Object.keys(pendingMarks).length;
  useEffect(() => {
    const scroller = tableScrollRef.current;
    const table = scroller?.querySelector("table");
    const studentColumn = studentColumnRef.current;
    if (!scroller || !table || !studentColumn) return;

    const updateWidth = () => {
      const nextMetrics = {
        tableWidth: table.scrollWidth,
        studentColumnWidth: studentColumn.getBoundingClientRect().width,
      };
      setTableScrollMetrics((current) =>
        current.tableWidth === nextMetrics.tableWidth &&
        current.studentColumnWidth === nextMetrics.studentColumnWidth
          ? current
          : nextMetrics
      );
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(scroller);
    observer.observe(table);
    observer.observe(studentColumn);
    return () => observer.disconnect();
  }, [data, month]);

  const syncHorizontalScroll = (source: HTMLDivElement, target: HTMLDivElement | null) => {
    if (target && target.scrollLeft !== source.scrollLeft) target.scrollLeft = source.scrollLeft;
  };
  useEffect(() => {
    onPendingMarkCountChange(pendingMarkCount);
  }, [pendingMarkCount, onPendingMarkCountChange]);
  useEffect(() => {
    onSavingMarksChange(savingMarks);
  }, [onSavingMarksChange, savingMarks]);
  useEffect(
    () => () => {
      saveAttendanceRef.current = null;
      quickActionsRef.current = { markAllPresent: null, exportCsv: null };
      onPendingMarkCountChange(0);
    },
    [onPendingMarkCountChange, quickActionsRef, saveAttendanceRef]
  );
  const pendingKey = (slotId: string, studentId: string) => `${slotId}:${studentId}`;
  const statusFor = useCallback(
    (lesson: JournalLesson, studentId: string, originalStatus: AttendanceStatus): AttendanceStatus | null => {
      const key = pendingKey(lesson.slotId, studentId);
      return Object.prototype.hasOwnProperty.call(pendingMarks, key) ? pendingMarks[key].status : originalStatus;
    },
    [pendingMarks]
  );

  const days = useMemo(() => Array.from({ length: daysInMonth(month) }, (_, i) => i + 1), [month]);
  const selectedDay = Math.min(activeDay, days.length);
  const lessonsByDay = useMemo(() => {
    const map = new Map<number, JournalLesson>();
    for (const lesson of data?.lessons ?? []) {
      const day = dayOfMonth(lesson.startsAt);
      const prev = map.get(day);
      // One lesson per day is the normal case; if there are two, show the live one.
      if (!prev || (prev.status === "CANCELLED" && lesson.status !== "CANCELLED")) map.set(day, lesson);
    }
    return map;
  }, [data]);
  const counted = useMemo(() => (data?.lessons ?? []).filter((l) => l.status !== "CANCELLED"), [data]);
  const rows = useMemo(
    () =>
      (data?.members ?? []).map((member: JournalMember) => ({
        member,
        summary: summarize(
          counted.flatMap((lesson) => {
            const record = recordOf(lesson, member.studentId);
            if (!record) return [];
            const status = statusFor(lesson, member.studentId, record.status);
            return status ? [status] : [];
          })
        ),
      })),
    [data, counted, statusFor]
  );
  const overall = useMemo(
    () => summarize(counted.flatMap((lesson) => lesson.records.flatMap((record) => {
      const status = statusFor(lesson, record.studentId, record.status);
      return status ? [status] : [];
    }))),
    [counted, statusFor]
  );
  const atRisk = rows.filter((r) => r.summary.percent !== null && r.summary.percent < 80);
  const today = month === currentMonth ? dayOfMonth(new Date()) : null;
  const todayLesson = today ? lessonsByDay.get(today) : undefined;
  const todaySummary = summarize(
    (todayLesson?.status === "CANCELLED" ? [] : todayLesson?.records ?? []).flatMap((record) => {
      const status = todayLesson ? statusFor(todayLesson, record.studentId, record.status) : record.status;
      return status ? [status] : [];
    })
  );
  const selectedLesson = lessonsByDay.get(selectedDay);
  const absentRecords = selectedLesson?.status === "CANCELLED"
    ? []
    : (selectedLesson?.records ?? [])
      .map((record) => ({ ...record, status: selectedLesson ? statusFor(selectedLesson, record.studentId, record.status) : record.status }))
      .filter((record) => record.status === "ABSENT");
  const absentStudents = absentRecords
    .map((record) => data?.members.find((member) => member.studentId === record.studentId))
    .filter((member): member is JournalMember => Boolean(member));
  const telegramStudents = absentStudents.filter((member) => member.telegramLinked);
  const selectedDateLabel = selectedLesson
    ? new Intl.DateTimeFormat(localeOf(language), { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(new Date(selectedLesson.startsAt))
    : "";
  const telegramDefaultMessage = t("teacher.group.journalTelegramBody", { group: groupName, date: selectedDateLabel });
  const telegramTomorrowDefaultMessage = t("teacher.group.journalTelegramTomorrowBody", { group: groupName, date: selectedDateLabel });
  useEffect(() => {
    if (!telegramMessageEdited) setTelegramMessage(telegramDefaultMessage);
  }, [telegramDefaultMessage, telegramMessageEdited]);
  useEffect(() => {
    if (!telegramTomorrowMessageEdited) setTelegramTomorrowMessage(telegramTomorrowDefaultMessage);
  }, [telegramTomorrowDefaultMessage, telegramTomorrowMessageEdited]);

  const sendTelegramMessage = async () => {
    if (!selectedLesson || telegramStudents.length === 0 || !telegramMessage.trim() || !telegramTomorrowMessage.trim()) return;
    setTelegramSending(true);
    try {
      const result = await teacherService.sendAttendanceTelegram(groupId, selectedLesson.slotId, telegramMessage, telegramTomorrowMessage);
      if (result.failed > 0) {
        toast.error(t("teacher.group.journalTelegramPartial", { sent: result.sent, failed: result.failed }));
      } else if (result.sent === 0) {
        toast.info(t("teacher.group.journalTelegramNoneSent"));
      } else {
        toast.success(t("teacher.group.journalTelegramSent", { count: result.sent }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("teacher.group.journalTelegramError"));
    } finally {
      setTelegramSending(false);
    }
  };
  const cycleAttendance = (lesson: JournalLesson, studentId: string) => {
    if (!canMark || savingMarks || savingMarksLock.current) return;
    const key = pendingKey(lesson.slotId, studentId);
    const original = recordOf(lesson, studentId);
    const cycle: (AttendanceStatus | null)[] = [
      "PRESENT",
      "ABSENT",
      "LATE",
      "EXCUSED",
      ...(lesson.onlineUrl || original?.status === "ONLINE" ? ["ONLINE" as const] : []),
      null,
    ];
    setPendingMarks((current) => {
      const previous = Object.prototype.hasOwnProperty.call(current, key) ? current[key].status : original?.status ?? null;
      const next = cycle[(cycle.indexOf(previous) + 1) % cycle.length];
      const updated = { ...current };
      if (next === (original?.status ?? null)) {
        delete updated[key];
      } else {
        updated[key] = {
          slotId: lesson.slotId,
          studentId,
          status: next,
          note: original?.note ?? null,
        };
      }
      return updated;
    });
  };
  const savePendingMarks = useCallback(async () => {
    if (pendingMarkCount === 0 || savingMarks || savingMarksLock.current) return;
    savingMarksLock.current = true;

    const marks = Object.values(pendingMarks);

    setSavingMarks(true);
    try {
      await teacherService.markBulk(
        groupId,
        marks.map(({ slotId, studentId, status, note }) => ({ slotId, studentId, status, note }))
      );
      setPendingMarks({});
      await journal.reload();
      toast.success(t("teacher.group.journalSaved"));
    } catch (error) {
      await journal.reload();
      toast.error(error instanceof Error ? error.message : t("teacher.group.saveError"));
    } finally {
      savingMarksLock.current = false;
      setSavingMarks(false);
    }
  }, [groupId, journal, pendingMarkCount, pendingMarks, savingMarks, t]);

  saveAttendanceRef.current = () => void savePendingMarks();
  const chooseDay = (day: number) => {
    const nextDay = Math.min(days.length, Math.max(1, day));
    setActiveDay(nextDay);
    requestAnimationFrame(() => {
      const target = tableScrollRef.current?.querySelector<HTMLElement>(`[data-day="${nextDay}"]`);
      const container = tableScrollRef.current;
      if (!target || !container) return;
      const targetLeft = target.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft - 320;
      container.scrollTo({ left: Math.max(0, Math.min(targetLeft, container.scrollWidth - container.clientWidth)), behavior: "smooth" });
    });
  };

  const markDayPresent = (lesson: JournalLesson) => {
    if (!canMark || savingMarks || savingMarksLock.current || lesson.status === "CANCELLED") return;
    setPendingMarks((current) => {
      const updated = { ...current };
      (data?.members ?? []).forEach((member) => {
        const key = pendingKey(lesson.slotId, member.studentId);
        const originalStatus = recordOf(lesson, member.studentId)?.status ?? null;
        const currentStatus = Object.prototype.hasOwnProperty.call(current, key) ? current[key].status : originalStatus;
        if (currentStatus === "PRESENT") return;
        if (originalStatus === "PRESENT") {
          delete updated[key];
          return;
        }
        updated[key] = {
          slotId: lesson.slotId,
          studentId: member.studentId,
          status: "PRESENT",
          note: recordOf(lesson, member.studentId)?.note ?? null,
        };
      });
      return updated;
    });
  };

  const exportCsv = () => {
    if (!data) return;
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const code: Record<AttendanceStatus, string> = { PRESENT: "B", ABSENT: "Y", LATE: "K", EXCUSED: "U", ONLINE: "O" };
    const header = [
      t("teacher.group.student"),
      ...days.map(String),
      t("teacher.group.present"),
      t("teacher.group.absent"),
      t("teacher.group.late"),
      t("teacher.group.excused"),
      t("teacher.group.percent"),
    ];
    const body = rows.map(({ member, summary }) => [
      member.name,
      ...days.map((day) => {
        const lesson = lessonsByDay.get(day);
        if (!lesson) return "";
        if (lesson.status === "CANCELLED") return "—";
        const record = recordOf(lesson, member.studentId);
        const status = record ? statusFor(lesson, member.studentId, record.status) : null;
        return status ? code[status] : "";
      }),
      summary.present + summary.online,
      summary.absent,
      summary.late,
      summary.excused,
      summary.percent ?? "",
    ]);
    download(`davomat-${month}.csv`, "\uFEFF" + [header, ...body].map((r) => r.map(cell).join(",")).join("\r\n"), "text/csv;charset=utf-8;");
  };
  quickActionsRef.current = {
    markAllPresent: canMark && todayLesson && todayLesson.status !== "CANCELLED"
      ? () => onOpenLesson(todayLesson, "allPresent")
      : null,
    exportCsv,
  };

  const exportWarnings = () => {
    const title = `${t("teacher.group.riskTitle")} — ${groupName} · ${monthLabel(month, language)}`;
    const lines = atRisk.map(({ member, summary }) => `- ${member.name}: ${summary.percent}% (${t("teacher.group.absent")}: ${summary.absent})`);
    download(`ogohlantirish-${month}.txt`, [title, "", ...lines].join("\r\n"), "text/plain;charset=utf-8;");
  };

  if (journal.loading && !data) return <Skeleton className="h-64 rounded-2xl" />;
  if (journal.error) return <ErrorState message={journal.error} onRetry={journal.reload} />;
  if (!data) return null;

  const donut = (() => {
    const total = todaySummary.marked;
    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
    const present = pct(todaySummary.present + todaySummary.online);
    const late = pct(todaySummary.late);
    const absent = pct(todaySummary.absent);
    const excused = pct(todaySummary.excused);
    return { present, late, absent, excused };
  })();

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 sm:p-6">

      {data.members.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title={t("teacher.group.noStudents")} />
      ) : counted.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-10 w-10" />} title={t("teacher.group.journalNoLessons")} description={t("teacher.group.noSlotsHint")} />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label={t("teacher.group.journalLegend")}>
              {(["PRESENT", "ABSENT", "LATE", "EXCUSED", "ONLINE"] as AttendanceStatus[]).map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", STATUS_CLASS[status])}>{SYMBOL[status]}</span>
                  {t(`attendance.status.${status}`)}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-slate-600">·</span>
                {t("teacher.group.journalNotMarked")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{t("teacher.group.journalStudents", { count: rows.length })}</span>
            </div>
          </div>
          <Card className="w-full min-w-0 max-w-full overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151b2a]">
              <div
                className="flex w-full min-w-0 max-w-full"
              >
                <div aria-hidden="true" className="shrink-0" style={{ width: tableScrollMetrics.studentColumnWidth }} />
                <div
                  ref={topScrollRef}
                  aria-label={t("teacher.group.journalDayRange")}
                  className="attendance-table-top-scroll min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
                  onScroll={(event) => syncHorizontalScroll(event.currentTarget, tableScrollRef.current)}
                >
                  <div aria-hidden="true" style={{ width: Math.max(0, tableScrollMetrics.tableWidth - tableScrollMetrics.studentColumnWidth), height: 1 }} />
                </div>
              </div>
              <div
                ref={tableScrollRef}
                className="attendance-table-scroll w-full min-w-0 max-w-full max-h-[70vh] overflow-auto overscroll-x-contain"
                onScroll={(event) => syncHorizontalScroll(event.currentTarget, topScrollRef.current)}
              >
                <table className="w-full min-w-[1500px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th ref={studentColumnRef} className="sticky left-0 top-0 z-40 w-80 min-w-80 border-r border-slate-300 bg-slate-50 px-3 py-2.5 font-semibold shadow-[3px_0_5px_-3px_rgba(15,23,42,0.35)] dark:border-slate-600 dark:bg-slate-900">{t("teacher.group.student")}</th>
                      {days.map((day) => {
                        const lesson = lessonsByDay.get(day);
                        const canMarkDay = canMark && lesson && lesson.status !== "CANCELLED";
                        return (
                          <th
                            key={day}
                            data-day={day}
                            className={cn(
                              "sticky top-0 z-20 w-10 bg-slate-50 px-0.5 py-2.5 text-center font-semibold dark:bg-slate-900",
                              day === today && "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
                              day === selectedDay && day !== today && "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                            )}
                          >
                          <button
                            type="button"
                            aria-label={canMarkDay
                              ? t("teacher.group.journalMarkDayPresent", { day })
                              : `${t("teacher.group.journalDay")} ${day}`}
                            aria-pressed={selectedDay === day}
                            onClick={() => {
                              chooseDay(day);
                              if (canMarkDay && lesson) markDayPresent(lesson);
                            }}
                            disabled={Boolean(canMarkDay && (savingMarks || savingMarksLock.current))}
                            title={canMarkDay ? t("teacher.group.journalMarkDayPresent", { day }) : undefined}
                            className="mx-auto flex min-w-7 items-center justify-center gap-0.5 rounded-md px-1 py-1 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed dark:hover:bg-slate-700"
                          >
                            {day}
                            {canMarkDay && <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                          </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map(({ member, summary }, index) => {
                      const risk = summary.percent !== null && summary.percent < 80;
                      return (
                        <tr key={member.studentId} className={cn("group hover:bg-slate-50 dark:hover:bg-slate-800/50", risk && "bg-red-50/50 dark:bg-red-950/20")}>
                          <td className={cn("sticky left-0 z-10 w-80 min-w-80 border-r border-slate-300 bg-white px-3 py-2 shadow-[3px_0_5px_-3px_rgba(15,23,42,0.35)] group-hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:group-hover:bg-slate-800/50", risk && "bg-red-50/50 dark:bg-red-950/20")}>
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 text-right text-xs font-medium text-slate-400">{index + 1}</span>
                              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", risk ? "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300" : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300")}>
                                {initials(member.name)}
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-1">
                                  <span className="truncate font-medium text-slate-900 dark:text-white">{member.name}</span>
                                  {risk && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" aria-label={t("teacher.group.riskTitle")} />}
                                </span>
                                <span className="block font-mono text-[11px] text-slate-400">{formatAccountId(member)}</span>
                              </span>
                            </div>
                          </td>
                          {days.map((day) => {
                            const lesson = lessonsByDay.get(day);
                            const record = lesson ? recordOf(lesson, member.studentId) : undefined;
                            const pending = lesson ? pendingMarks[pendingKey(lesson.slotId, member.studentId)] : undefined;
                            const status = pending ? pending.status : record?.status;
                            const cancelled = lesson?.status === "CANCELLED";
                            return (
                              <td
                                key={day}
                                className={cn(
                                  "p-1 text-center",
                                  day === today && "bg-brand-50/70 dark:bg-brand-500/10",
                                  day === selectedDay && day !== today && "bg-slate-100 dark:bg-slate-800/60"
                                )}
                              >
                                {!lesson ? (
                                  <span className="text-slate-300 dark:text-slate-700">·</span>
                                ) : cancelled ? (
                                  <span className="text-xs text-slate-500 dark:text-slate-500" title={t("teacher.group.cancelled")}>—</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => cycleAttendance(lesson, member.studentId)}
                                    disabled={!canMark || savingMarks}
                                    title={`${new Intl.DateTimeFormat(localeOf(language), { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(new Date(lesson.startsAt))} · ${status ? t(`attendance.status.${status}`) : t("teacher.group.journalNotMarked")}`}
                                    aria-label={`${member.name} · ${new Intl.DateTimeFormat(localeOf(language), { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(new Date(lesson.startsAt))} · ${status ? t(`attendance.status.${status}`) : t("teacher.group.journalNotMarked")}`}
                                    className={cn(
                                      "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:hover:scale-100",
                                      status ? STATUS_CLASS[status] : "border border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-500 dark:border-slate-600",
                                      pending && "ring-2 ring-brand-400 ring-offset-1 dark:ring-offset-slate-900"
                                    )}
                                  >
                                    {status ? SYMBOL[status] : "·"}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
        </div>
      )}

      <Modal
        isOpen={summaryOpen}
        onClose={onCloseSummary}
        title={t("teacher.group.journalSummaryTitle")}
        description={monthLabel(month, language)}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <section className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#151b2a] sm:gap-5 sm:p-5">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">{t("teacher.group.journalEyebrow")}</p>
              <h2 className="break-words text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                {t("teacher.group.journalTitle", { group: groupName, course: courseName })}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span>{t("teacher.group.journalTeacher", { name: teacherName })}</span>
                <span>{t("teacher.group.journalPeriod", { period: monthLabel(month, language) })}</span>
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700/70 dark:bg-[#0c1321]">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("teacher.group.journalAverage")}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{overall.percent === null ? "—" : `${overall.percent}%`}</p>
                <p className="text-xs text-slate-500">{t("teacher.group.journalRecords", { count: overall.marked })}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700/70 dark:bg-[#0c1321]">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("teacher.group.riskTitle")}</p>
                <p className={cn("mt-1 text-2xl font-bold", atRisk.length ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200")}>
                  {t("teacher.group.journalStudents", { count: atRisk.length })}
                </p>
                <p className="text-xs text-slate-500">{t("teacher.group.riskDesc")}</p>
              </div>
            </div>
          </section>

          <Card className="min-w-0 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("teacher.group.journalStudentSummary")}</h3>
              <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{t("teacher.group.student")}</th>
                      <th className="px-3 py-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">{t("teacher.group.present")}</th>
                      <th className="px-3 py-2 text-center font-semibold text-red-600 dark:text-red-400">{t("teacher.group.absent")}</th>
                      <th className="px-3 py-2 text-center font-semibold text-amber-600 dark:text-amber-400">{t("teacher.group.late")}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t("teacher.group.percent")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map(({ member, summary }) => (
                      <tr key={member.studentId}>
                        <td className="max-w-48 truncate px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{member.name}</td>
                        <td className="px-3 py-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">{summary.present + summary.online}</td>
                        <td className="px-3 py-2 text-center font-semibold text-red-600 dark:text-red-400">{summary.absent}</td>
                        <td className="px-3 py-2 text-center font-semibold text-amber-600 dark:text-amber-400">{summary.late}</td>
                        <td className="px-3 py-2 text-right">
                          <Badge variant={summary.percent !== null && summary.percent < 80 ? "danger" : summary.percent === null ? "neutral" : "success"} size="sm">
                            {summary.percent === null ? "—" : `${summary.percent}%`}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">{t("teacher.group.journalTodaySummary")}</h3>
              {todayLesson && todayLesson.status !== "CANCELLED" && <Badge variant="neutral" size="sm">{t("teacher.group.lesson")}</Badge>}
            </div>
            {!todayLesson || todayLesson.status === "CANCELLED" ? (
              <p className="py-6 text-center text-sm text-slate-500">{t("teacher.group.journalNoLessonToday")}</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="4" className="text-slate-200 dark:text-slate-700" stroke="currentColor" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="4" pathLength={100} strokeDasharray={`${donut.present} ${100 - donut.present}`} className="text-emerald-500" stroke="currentColor" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="4" pathLength={100} strokeDasharray={`${donut.late} ${100 - donut.late}`} strokeDashoffset={-donut.present} className="text-amber-400" stroke="currentColor" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="4" pathLength={100} strokeDasharray={`${donut.absent} ${100 - donut.absent}`} strokeDashoffset={-(donut.present + donut.late)} className="text-red-500" stroke="currentColor" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="4" pathLength={100} strokeDasharray={`${donut.excused} ${100 - donut.excused}`} strokeDashoffset={-(donut.present + donut.late + donut.absent)} className="text-blue-300" stroke="currentColor" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white">
                    {todaySummary.percent === null ? "—" : `${todaySummary.percent}%`}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                  <p className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{t("teacher.group.present")}</span><strong>{todaySummary.present + todaySummary.online}</strong></p>
                  <p className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />{t("teacher.group.absent")}</span><strong>{todaySummary.absent}</strong></p>
                  <p className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />{t("teacher.group.late")}</span><strong>{todaySummary.late}</strong></p>
                  <p className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-300" />{t("teacher.group.excused")}</span><strong>{todaySummary.excused}</strong></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">{t("teacher.group.riskTitle")}</h3>
              <Badge variant={atRisk.length > 0 ? "danger" : "success"} size="sm">{t("teacher.group.journalStudents", { count: atRisk.length })}</Badge>
            </div>
            <p className="mb-3 text-xs text-slate-500">{t("teacher.group.riskDesc")}</p>
            {atRisk.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">{t("teacher.group.riskEmpty")}</p>
            ) : (
              <ul className="space-y-1.5">
                {atRisk.slice(0, 5).map(({ member, summary }) => (
                  <li key={member.studentId} className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-sm dark:bg-red-950/30">
                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">{member.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">{summary.percent}%</span>
                      {member.phone && (
                        <a href={`tel:${member.phone.replace(/[^\d+]/g, "")}`} title={member.phone} className="text-slate-400 transition hover:text-brand-600 dark:hover:text-brand-300">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {atRisk.length > 0 && (
              <Button variant="outline" size="sm" className="mt-3 w-full" leftIcon={<FileWarning className="h-4 w-4" />} onClick={exportWarnings}>
                {t("teacher.group.journalWarnings")}
              </Button>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      </Modal>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151b2a]">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <MessageCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                {t("teacher.group.journalTelegramTitle")}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant={telegramStudents.length ? "success" : "neutral"} size="sm">
                  {t("teacher.group.journalTelegramLinked", { count: telegramStudents.length })}
                </Badge>
                <button
                  type="button"
                  aria-label={t(telegramComposerOpen ? "teacher.group.journalTelegramCloseComposer" : "teacher.group.journalTelegramCompose")}
                  title={t(telegramComposerOpen ? "teacher.group.journalTelegramCloseComposer" : "teacher.group.journalTelegramCompose")}
                  aria-expanded={telegramComposerOpen}
                  onClick={() => setTelegramComposerOpen((open) => !open)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 transition hover:border-sky-400 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/60"
                >
                  {telegramComposerOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="mb-2 text-xs text-slate-500">{t("teacher.group.journalTelegramHint")}</p>
            <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              {t("teacher.group.journalTelegramSchedule")}
            </p>
            {absentRecords.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-500">{t("teacher.group.journalTelegramNoAbsences")}</p>
            ) : telegramStudents.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-500">
                {t("teacher.group.journalTelegramNoLinked", { count: absentRecords.length })}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t("teacher.group.journalTelegramRecipients", { absent: absentRecords.length, linked: telegramStudents.length })}
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {telegramStudents.slice(0, 5).map((member) => (
                    <li key={member.studentId} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {member.name}
                    </li>
                  ))}
                  {telegramStudents.length > 5 && (
                    <li className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {t("teacher.group.journalTelegramMore", { count: telegramStudents.length - 5 })}
                    </li>
                  )}
                </ul>
              </div>
            )}
            {telegramComposerOpen && (
              <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>{t("teacher.group.journalTelegramTodayLabel")}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTelegramMessageEdited(false);
                        setTelegramMessage(telegramDefaultMessage);
                      }}
                      className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {t("teacher.group.journalTelegramReset")}
                    </button>
                  </div>
                  <textarea
                    value={telegramMessage}
                    onChange={(event) => {
                      setTelegramMessage(event.target.value);
                      setTelegramMessageEdited(true);
                    }}
                    maxLength={1000}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>{t("teacher.group.journalTelegramTomorrowLabel")}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTelegramTomorrowMessageEdited(false);
                        setTelegramTomorrowMessage(telegramTomorrowDefaultMessage);
                      }}
                      className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {t("teacher.group.journalTelegramReset")}
                    </button>
                  </div>
                  <textarea
                    value={telegramTomorrowMessage}
                    onChange={(event) => {
                      setTelegramTomorrowMessage(event.target.value);
                      setTelegramTomorrowMessageEdited(true);
                    }}
                    maxLength={1000}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <p className="text-xs leading-relaxed text-slate-500">{t("teacher.group.journalTelegramTomorrowHint")}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {t("teacher.group.journalTelegramLimit", { count: telegramMessage.length })} · {t("teacher.group.journalTelegramLimit", { count: telegramTomorrowMessage.length })}
                  </span>
                  {canMark && (
                    <Button
                      size="sm"
                      leftIcon={<Send className="h-4 w-4" />}
                      disabled={telegramSending || telegramStudents.length === 0 || !telegramMessage.trim() || !telegramTomorrowMessage.trim()}
                      onClick={() => void sendTelegramMessage()}
                    >
                      {telegramSending ? t("teacher.group.journalTelegramSending") : t("teacher.group.journalTelegramSend")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

    </div>
  );
}

export type { GroupJournal, JournalLesson };
