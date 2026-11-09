import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Copy, Info, LoaderCircle, MoreHorizontal, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { teacherService, type AttendanceStatus, type GroupInput, type Roster } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { useStoredState } from "@/hooks/useStoredState";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime } from "@/utils/money";
import { ATTENDANCE_STATUSES } from "@/constants/attendance";
import { useTranslation } from "react-i18next";
import { can } from "@/lib/permissions";
import { GroupForm, rhythmLabel } from "@/components/groups/GroupForm";
import { AddStudentModal } from "@/components/groups/AddStudentModal";
import { GroupAttendanceJournal, type GroupJournalQuickActions } from "@/components/groups/GroupAttendanceJournal";

const TASHKENT_TIME_ZONE = "Asia/Tashkent";

const currentTashkentMonth = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TASHKENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Unable to determine the current Tashkent month");
  return `${year}-${month}`;
};

const shiftMonth = (month: string, delta: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export default function TeacherGroupDetail() {
  const { t } = useTranslation();
  const { groupId: routeGroupId } = useParams();
  // The chosen group is kept in localStorage instead of the address bar.
  const [storedGroupId, setStoredGroupId] = useStoredState("teacher.groupId");
  const groupId = routeGroupId || storedGroupId || "";
  const role = useAuthStore((s) => s.user?.role);
  const myId = useAuthStore((s) => s.user?.id);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [attendanceGuideOpen, setAttendanceGuideOpen] = useState(false);
  const [pendingAttendanceCount, setPendingAttendanceCount] = useState(0);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const saveAttendanceRef = useRef<(() => void) | null>(null);
  const journalQuickActionsRef = useRef<GroupJournalQuickActions>({ markAllPresent: null, exportCsv: null });
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const [journalMonth, setJournalMonth] = useState(currentTashkentMonth);
  // The header's "add student" icon opens the search as an overlay over the page.
  const [addingStudent, setAddingStudent] = useState(false);
  // Bumped after attendance or membership changes so the journal reloads.
  const [journalRefresh, setJournalRefresh] = useState(0);

  useEffect(() => {
    if (!moreActionsOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!moreActionsRef.current?.contains(event.target as Node)) setMoreActionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreActionsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreActionsOpen]);

  const group = useLoad(() => (groupId ? teacherService.group(groupId) : Promise.resolve(null)), [groupId]);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [marks, setMarks] = useState<Record<string, { status: AttendanceStatus | ""; note: string }>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openRoster = async (slot: { id: string }, preset?: "allPresent") => {
    setFormError(null);
    setReason("");
    try {
      const r = await teacherService.roster(slot.id);
      setRoster(r);
      setMarks(
        Object.fromEntries(
          r.students.map((s) => [s.studentId, { status: s.status ?? (preset === "allPresent" ? ("PRESENT" as AttendanceStatus) : ""), note: s.note ?? "" }])
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("teacher.group.loadError"));
    }
  };

  const location = useLocation();
  const navigate = useNavigate();
  // An old link has the group id in the address bar: remember it and switch to the clean URL.
  useEffect(() => {
    if (!routeGroupId) return;
    setStoredGroupId(routeGroupId);
    navigate("/teacher/groups", { replace: true, state: location.state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeGroupId]);

  // The dashboard passes a lesson id in navigation state (not the address): its attendance opens right away.
  const linkedSlot = routeGroupId ? null : (location.state as { attendance?: string } | null)?.attendance ?? null;
  useEffect(() => {
    if (!linkedSlot) return;
    navigate(location.pathname, { replace: true, state: null });
    void openRoster({ id: linkedSlot });
    // Runs once per link: the state is cleared above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedSlot]);

  const hasSaved = roster?.students.some((s) => s.status !== null) ?? false;

  const save = async (finalize: boolean) => {
    if (!roster) return;
    const records = Object.entries(marks)
      .filter(([, m]) => m.status !== "")
      .map(([studentId, m]) => ({ studentId, status: m.status as AttendanceStatus, note: m.note.trim() || null }));
    if (records.length === 0) {
      setFormError(t("teacher.group.pickOne"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await teacherService.mark(roster.slot.id, records, hasSaved ? reason : undefined);
      if (finalize) await teacherService.finalize(roster.slot.id);
      toast.success(finalize ? t("teacher.group.finalized") : t("teacher.group.saved"));
      setRoster(null);
      setJournalRefresh((key) => key + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("teacher.group.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (!groupId) return <Navigate to="/teacher" replace />;
  if (group.loading && !group.data) return <Skeleton className="h-64 rounded-2xl" />;
  if (group.error || !group.data) return (
    <div className="space-y-6">
      <Link to="/teacher" onClick={() => setStoredGroupId(null)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> {t("teacher.group.back")}
      </Link>
      <ErrorState message={group.error ?? t("teacher.group.notFound")} onRetry={group.reload} />
    </div>
  );
  const g = group.data;
  // Admins change any group; a teacher (groups:own) the groups they teach. The server checks again.
  const editable = g.status === "ACTIVE" && (can(role, "groups:manage") || (can(role, "groups:own") && g.teacherId === myId));

  const saveGroup = async (input: GroupInput) => {
    setEditBusy(true);
    try {
      const res = await teacherService.updateGroup(g.id, input);
      toast.success(res.lessonsCreated > 0 ? t("groupForm.created", { count: res.lessonsCreated }) : t("groupForm.saved"));
      setEditing(false);
      await group.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setEditBusy(false);
    }
  };

  const copyAttendanceGuide = async () => {
    const guide = [
      t("teacher.group.journalGuide"),
      "",
      ...(["journalGuideGroup", "journalGuideDays", "journalGuideMark", "journalCellHint", "journalGuideSave"] as const).map(
        (key, index) => `${index + 1}. ${t(`teacher.group.${key}`)}`
      ),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(guide);
      toast.success(t("teacher.group.journalGuideCopied"));
    } catch {
      toast.error(t("teacher.group.journalGuideCopyError"));
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/teacher" onClick={() => setStoredGroupId(null)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> {t("teacher.group.back")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{g.name}</h1>
          <p className="text-sm text-slate-500">{g.course.title}</p>
          {rhythmLabel(g, t) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400">
              <CalendarDays className="h-4 w-4" /> {rhythmLabel(g, t)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              aria-label={t("teacher.group.journalSummaryTitle")}
              title={t("teacher.group.journalSummaryTitle")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-brand-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-brand-300 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setAttendanceGuideOpen(true)}
              aria-label={t("teacher.group.journalGuide")}
              title={t("teacher.group.journalGuide")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-brand-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-brand-300 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
            >
              <Info className="h-5 w-5" />
            </button>
            {editable && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label={t("groupForm.edit")}
                  title={t("groupForm.edit")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:text-brand-300"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAddingStudent(true)}
                  aria-label={t("groupForm.addStudent")}
                  title={t("groupForm.addStudent")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </>
            )}
            {editable && (
              <div ref={moreActionsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreActionsOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={moreActionsOpen}
                  aria-controls="group-more-actions"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span>{t("teacher.group.moreActions")}</span>
                  <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </button>
                {moreActionsOpen && (
                  <div
                    id="group-more-actions"
                    role="menu"
                    aria-label={t("teacher.group.moreActions")}
                    className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!journalQuickActionsRef.current.markAllPresent}
                      onClick={() => {
                        journalQuickActionsRef.current.markAllPresent?.();
                        setMoreActionsOpen(false);
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:hidden dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {t("teacher.group.journalAllPresent")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        journalQuickActionsRef.current.exportCsv?.();
                        setMoreActionsOpen(false);
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {t("teacher.group.exportCsv")}
                    </button>
                    <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                    {(pendingAttendanceCount > 0 || savingAttendance) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { saveAttendanceRef.current?.(); setMoreActionsOpen(false); }}
                        disabled={savingAttendance}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-70 dark:text-brand-300 dark:hover:bg-brand-950/40"
                      >
                        {savingAttendance ? t("teacher.group.journalSaving") : `${t("teacher.group.journalSaveChanges")} · ${pendingAttendanceCount}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {editable && (
              <button
                type="button"
                onClick={() => saveAttendanceRef.current?.()}
                aria-label={t("teacher.group.journalSaveChanges")}
                title={`${t("teacher.group.journalSaveChanges")} · ${pendingAttendanceCount}`}
                aria-hidden={pendingAttendanceCount === 0 && !savingAttendance}
                disabled={savingAttendance || pendingAttendanceCount === 0}
                className={`relative inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 ${pendingAttendanceCount === 0 && !savingAttendance ? "invisible pointer-events-none" : ""}`}
              >
                {savingAttendance && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {savingAttendance ? t("teacher.group.journalSaving") : t("common.save")}
                {pendingAttendanceCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {pendingAttendanceCount}
                  </span>
                )}
              </button>
            )}
            <div className="ml-auto flex items-center justify-end gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setJournalMonth((month) => shiftMonth(month, -1))}
                aria-label={t("teacher.group.prevMonth")}
                title={t("teacher.group.prevMonth")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <label className="sr-only" htmlFor="journal-month">{t("teacher.group.journalMonth")}</label>
              <input
                id="journal-month"
                type="month"
                value={journalMonth}
                aria-label={t("teacher.group.journalMonth")}
                onChange={(event) => event.target.value && setJournalMonth(event.target.value)}
                className="w-36 bg-transparent px-1 py-1.5 text-center text-sm font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setJournalMonth((month) => shiftMonth(month, 1))}
                aria-label={t("teacher.group.nextMonth")}
                title={t("teacher.group.nextMonth")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <GroupAttendanceJournal
        groupId={g.id}
        groupName={g.name}
        courseName={g.course.title}
        teacherName={g.teacher.name}
        canMark={["TEACHER", "ADMIN", "SUPERADMIN"].includes(role ?? "")}
        month={journalMonth}
        summaryOpen={summaryOpen}
        onCloseSummary={() => setSummaryOpen(false)}
        onPendingMarkCountChange={setPendingAttendanceCount}
        onSavingMarksChange={setSavingAttendance}
        saveAttendanceRef={saveAttendanceRef}
        quickActionsRef={journalQuickActionsRef}
        refreshKey={journalRefresh}
        onOpenLesson={(lesson, preset) => void openRoster({ id: lesson.slotId }, preset)}
      />

      <AddStudentModal
        group={g}
        isOpen={addingStudent}
        onClose={() => setAddingStudent(false)}
        onAdded={async () => {
          await group.reload();
          setJournalRefresh((key) => key + 1);
        }}
      />

      <Modal
        isOpen={attendanceGuideOpen}
        onClose={() => setAttendanceGuideOpen(false)}
        title={t("teacher.group.journalGuide")}
        description={t("teacher.group.journalGuideHint")}
        maxWidth="lg"
      >
        <div className="space-y-3">
          {(["journalGuideGroup", "journalGuideDays", "journalGuideMark", "journalCellHint", "journalGuideSave"] as const).map((key, index) => (
            <div key={key} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">{index + 1}</span>
              <p className="pt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{t(`teacher.group.${key}`)}</p>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => void copyAttendanceGuide()}>
              {t("teacher.group.journalGuideCopy")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title={t("groupForm.edit")} maxWidth="lg">
        {editing && <GroupForm group={g} courses={[g.course]} busy={editBusy} onSubmit={saveGroup} onCancel={() => setEditing(false)} />}
      </Modal>

      <Modal isOpen={roster !== null} onClose={() => setRoster(null)} title={roster ? t("teacher.group.rosterTitle", { date: formatDateTime(roster.slot.startsAt) }) : ""} maxWidth="lg">
        {roster && (
          <div className="space-y-4">
            {roster.slot.finalizedAt && <p className="text-sm text-amber-600">{t("teacher.group.lockedHint")}</p>}
            <div className="space-y-3">
              {roster.students.map((s) => (
                <div key={s.studentId} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_160px_1fr]">
                  <p className="font-medium text-slate-900 dark:text-white">{s.name}</p>
                  <Select
                    aria-label={t("teacher.group.statusOf", { name: s.name })}
                    options={[{ value: "", label: t("teacher.group.choose") }, ...ATTENDANCE_STATUSES.filter((v) => v !== "ONLINE" || roster.slot.onlineUrl).map((value) => ({ value, label: t(`attendance.status.${value}`) }))]}
                    value={marks[s.studentId]?.status ?? ""}
                    onChange={(e) => setMarks({ ...marks, [s.studentId]: { ...marks[s.studentId], status: e.target.value as AttendanceStatus | "" } })}
                  />
                  <Input
                    aria-label={t("teacher.group.noteOf", { name: s.name })}
                    placeholder={t("teacher.group.note")}
                    value={marks[s.studentId]?.note ?? ""}
                    onChange={(e) => setMarks({ ...marks, [s.studentId]: { ...marks[s.studentId], note: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            {hasSaved && <Input label={t("teacher.group.reason")} value={reason} onChange={(e) => setReason(e.target.value)} />}
            {formError && <p role="alert" className="text-sm text-red-500">{formError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRoster(null)}>{t("teacher.group.cancel")}</Button>
              <Button variant="outline" loading={saving} onClick={() => save(false)}>{t("teacher.group.save")}</Button>
              <Button loading={saving} onClick={() => save(true)}>{t("teacher.group.saveFinalize")}</Button>
            </div>
            <p className="text-xs text-slate-500">
              {ATTENDANCE_STATUSES.map((v) => t(`attendance.status.${v}`)).join(" · ")}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
