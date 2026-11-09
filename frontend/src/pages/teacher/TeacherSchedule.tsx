import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Settings2, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { teacherService, type Group, type ScheduleSettings } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { useAuthStore } from "@/store/auth.store";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TimeInput } from "@/components/ui/TimeInput";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const WEEKDAYS = [
  { value: 1, key: "teacher.schedule.monday" },
  { value: 2, key: "teacher.schedule.tuesday" },
  { value: 3, key: "teacher.schedule.wednesday" },
  { value: 4, key: "teacher.schedule.thursday" },
  { value: 5, key: "teacher.schedule.friday" },
  { value: 6, key: "teacher.schedule.saturday" },
  { value: 7, key: "teacher.schedule.sunday" },
] as const;

const isScheduledOn = (group: Pick<Group, "days" | "weekdays">, weekday: number) => {
  if (group.days === "ODD") return [1, 3, 5].includes(weekday);
  if (group.days === "EVEN") return [2, 4, 6].includes(weekday);
  return group.weekdays.includes(weekday);
};

const formatClock = (minutes: number) =>
  `${String(Math.floor((minutes % 1440) / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export default function TeacherSchedule() {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.user?.role);
  const groups = useLoad(() => teacherService.groups(), []);
  const scheduleSettings = useLoad(() => teacherService.scheduleSettings(), []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const activeGroups = groups.data?.filter((group) => group.status === "ACTIVE") ?? [];
  const scheduledGroups = activeGroups.filter((group) => group.startTime && (group.days || group.weekdays.length > 0));
  const rooms = useMemo(
    () => [...new Set(scheduledGroups.map((group) => group.room?.trim() ?? ""))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [scheduledGroups],
  );
  const [selectedWeekday, setSelectedWeekday] = useState(() => new Date().getDay() || 7);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const editableSchedule = can(role, "schedule:manage") || can(role, "groups:manage");
  const settings = scheduleSettings.data;
  const workStartMinutes = settings ? timeToMinutes(settings.workStart) : 8 * 60;
  const workEndMinutes = settings ? timeToMinutes(settings.workEnd) : 20 * 60;
  const workMinutes = workEndMinutes - workStartMinutes;
  const hourMarks = Array.from({ length: Math.ceil(workMinutes / 60) }, (_, index) => workStartMinutes + index * 60);

  if (groups.loading && !groups.data) return <Skeleton className="h-64 rounded-2xl" />;
  if (groups.error) return <ErrorState message={groups.error} onRetry={groups.reload} />;
  if (scheduleSettings.loading && !settings) return <Skeleton className="h-64 rounded-2xl" />;
  if (scheduleSettings.error) return <ErrorState message={scheduleSettings.error} onRetry={scheduleSettings.reload} />;

  const saveSettings = async (next: ScheduleSettings) => {
    setSavingSettings(true);
    try {
      const saved = await teacherService.updateScheduleSettings(next);
      scheduleSettings.setData(saved);
      setSettingsOpen(false);
      toast.success(t("teacher.schedule.settingsSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("teacher.schedule.settingsSaveError"));
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("teacher.schedule.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeGroups.length > 0 && (
            <Link
              to="/teacher"
              className="group inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-brand-600 transition duration-200 hover:text-brand-700 active:scale-95 dark:text-brand-400"
            >
              <UsersRound className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-75" aria-hidden="true" />
              {t("teacher.groups.title")}
            </Link>
          )}
          {editableSchedule && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("teacher.schedule.editSettings")}
              title={t("teacher.schedule.editSettings")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {activeGroups.length === 0 ? (
        <EmptyState title={t("teacher.schedule.noGroups")} description={t("teacher.groups.emptyHint")} />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("teacher.schedule.roomSchedule")}</h2>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("teacher.schedule.weekdays")}>
                {WEEKDAYS.map((day) => (
                  <Button
                    key={day.value}
                    size="sm"
                    variant={selectedWeekday === day.value ? "primary" : "outline"}
                    aria-pressed={selectedWeekday === day.value}
                    onClick={() => setSelectedWeekday(day.value)}
                  >
                    {t(day.key)}
                  </Button>
                ))}
              </div>
            </div>
            {rooms.length === 0 ? (
              <EmptyState title={t("teacher.schedule.noRoomSchedule")} />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="grid grid-cols-[120px_minmax(0,1fr)] bg-slate-50 dark:bg-slate-950">
                  <div aria-hidden="true" className="border-r-2 border-slate-400 dark:border-slate-600" />
                  <div
                    ref={topScrollRef}
                    aria-label={t("teacher.schedule.scrollTimeline")}
                    className="overflow-x-auto overflow-y-hidden"
                    onScroll={(event) => {
                      const grid = gridScrollRef.current;
                      if (grid && grid.scrollLeft !== event.currentTarget.scrollLeft) grid.scrollLeft = event.currentTarget.scrollLeft;
                    }}
                  >
                    <div className="h-3" style={{ minWidth: `${hourMarks.length * 56}px` }} />
                  </div>
                </div>
                <div
                  ref={gridScrollRef}
                  className="schedule-grid-scroll overflow-x-auto"
                  onScroll={(event) => {
                    const top = topScrollRef.current;
                    if (top && top.scrollLeft !== event.currentTarget.scrollLeft) top.scrollLeft = event.currentTarget.scrollLeft;
                  }}
                >
                  <div style={{ minWidth: `${120 + hourMarks.length * 56}px` }}>
                    <div className="grid border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950" style={{ gridTemplateColumns: `120px repeat(${hourMarks.length}, minmax(56px, 1fr))` }}>
                      <div className="sticky left-0 z-20 flex items-center border-r-2 border-slate-400 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300">
                        {t("teacher.schedule.room")}
                      </div>
                      {hourMarks.map((minute) => (
                        <div key={minute} className="border-r border-slate-200 px-1 py-3 text-center text-xs font-medium text-slate-500 dark:border-slate-800">
                          {formatClock(minute)}
                        </div>
                      ))}
                    </div>
                    {rooms.map((room) => {
                      const roomGroups = scheduledGroups.filter((group) => (group.room?.trim() ?? "") === room && isScheduledOn(group, selectedWeekday));
                      const roomLabel = room
                        ? /^\d+$/.test(room) ? t("teacher.schedule.roomNumber", { number: room }) : room
                        : t("teacher.schedule.unspecifiedRoom");

                      return (
                        <div key={room || "unspecified"} className="grid border-b border-slate-200 last:border-b-0 dark:border-slate-800" style={{ gridTemplateColumns: `120px repeat(${hourMarks.length}, minmax(56px, 1fr))` }}>
                          <div className="sticky left-0 z-10 flex items-center border-r-2 border-slate-400 bg-white px-3 py-3 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                            {roomLabel}
                          </div>
                          <div
                            className="relative h-20"
                            style={{
                              gridColumn: `2 / span ${hourMarks.length}`,
                              backgroundImage: "repeating-linear-gradient(to right, transparent 0, transparent calc(100% - 1px), rgb(226 232 240) calc(100% - 1px), rgb(226 232 240) 100%)",
                              backgroundSize: `${100 / hourMarks.length}% 100%`,
                            }}
                          >
                            {roomGroups.map((group) => {
                              const [hour, minute] = (group.startTime ?? "00:00").split(":").map(Number);
                              const startMinutes = hour * 60 + minute;
                              const duration = Math.min(group.lessonMinutes ?? settings?.lessonMinutes ?? 90, workEndMinutes - startMinutes);
                              const timelineMinutes = hourMarks.length * 60;
                              const left = ((startMinutes - workStartMinutes) / timelineMinutes) * 100;
                              const width = (duration / timelineMinutes) * 100;
                              if (startMinutes < workStartMinutes || startMinutes >= workEndMinutes || duration <= 0) return null;
                              return (
                                <span key={group.id}>
                                  <div
                                    title={`${group.name} · ${formatClock(startMinutes)}–${formatClock(startMinutes + duration)}`}
                                    className="absolute inset-y-2 flex items-center overflow-hidden rounded-lg border border-brand-200 bg-brand-50 px-2 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200"
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                  >
                                    <span className="truncate">{group.name}</span>
                                  </div>
                                  {settings && settings.breakMinutes > 0 && startMinutes + duration < workEndMinutes && (
                                    <div
                                      aria-label={t("teacher.schedule.breakDuration", { minutes: settings.breakMinutes })}
                                      title={t("teacher.schedule.breakDuration", { minutes: settings.breakMinutes })}
                                      className="absolute inset-y-3 rounded-sm bg-amber-300/70 dark:bg-amber-400/40"
                                      style={{ left: `${((startMinutes + duration - workStartMinutes) / timelineMinutes) * 100}%`, width: `${(Math.min(settings.breakMinutes, workEndMinutes - startMinutes - duration) / timelineMinutes) * 100}%` }}
                                    />
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

        </>
      )}
      {settings && (
        <ScheduleSettingsModal
          open={settingsOpen}
          settings={settings}
          saving={savingSettings}
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      )}
    </div>
  );
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function ScheduleSettingsModal({
  open,
  settings,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  settings: ScheduleSettings;
  saving: boolean;
  onClose: () => void;
  onSave: (settings: ScheduleSettings) => void;
}) {
  const { t } = useTranslation();
  const [workStart, setWorkStart] = useState(settings.workStart);
  const [workEnd, setWorkEnd] = useState(settings.workEnd);
  const [lessonMinutes, setLessonMinutes] = useState(String(settings.lessonMinutes));
  const [breakMinutes, setBreakMinutes] = useState(String(settings.breakMinutes));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setWorkStart(settings.workStart);
    setWorkEnd(settings.workEnd);
    setLessonMinutes(String(settings.lessonMinutes));
    setBreakMinutes(String(settings.breakMinutes));
    setError(null);
  }, [open, settings]);

  const submit = () => {
    const lesson = Number(lessonMinutes);
    const pause = Number(breakMinutes);
    if (workEnd <= workStart) return setError(t("teacher.schedule.invalidWorkHours"));
    if (!Number.isInteger(lesson) || lesson < 1 || lesson > 240) return setError(t("teacher.schedule.invalidLessonMinutes"));
    if (!Number.isInteger(pause) || pause < 0 || pause > 120) return setError(t("teacher.schedule.invalidBreakMinutes"));
    setError(null);
    onSave({ workStart, workEnd, lessonMinutes: lesson, breakMinutes: pause });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t("teacher.schedule.settingsTitle")} description={t("teacher.schedule.settingsHint")} maxWidth="md">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TimeInput label={t("teacher.schedule.workStart")} value={workStart} onChange={setWorkStart} />
          <TimeInput label={t("teacher.schedule.workEnd")} value={workEnd} onChange={setWorkEnd} />
        </div>
        <Input
          label={t("teacher.schedule.lessonMinutes")}
          type="number"
          min={1}
          max={240}
          step={1}
          value={lessonMinutes}
          onChange={(event) => setLessonMinutes(event.target.value)}
        />
        <Input
          label={t("teacher.schedule.breakMinutes")}
          type="number"
          min={0}
          max={120}
          step={1}
          value={breakMinutes}
          onChange={(event) => setBreakMinutes(event.target.value)}
        />
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button loading={saving} onClick={submit} leftIcon={<Clock3 className="h-4 w-4" />}>{t("common.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}
