import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ClipboardCheck, Pencil } from "lucide-react";
import { toast } from "sonner";
import { teacherService, type AttendanceStatus, type GroupInput, type Roster, type Slot } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime, formatTime } from "@/utils/money";
import { ATTENDANCE_STATUSES } from "@/constants/attendance";
import { useTranslation } from "react-i18next";
import { can } from "@/lib/permissions";
import { GroupForm, rhythmLabel } from "@/components/groups/GroupForm";
import { GroupMembers } from "@/components/groups/GroupMembers";

export default function TeacherGroupDetail() {
  const { t } = useTranslation();
  const { groupId = "" } = useParams();
  const role = useAuthStore((s) => s.user?.role);
  const myId = useAuthStore((s) => s.user?.id);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [tab, setTab] = useState("slots");

  const group = useLoad(() => teacherService.group(groupId), [groupId]);
  const slots = useLoad(() => teacherService.slots(groupId), [groupId]);
  const report = useLoad(() => teacherService.report(groupId), [groupId]);

  const [roster, setRoster] = useState<Roster | null>(null);
  const [marks, setMarks] = useState<Record<string, { status: AttendanceStatus | ""; note: string }>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openRoster = async (slot: Slot) => {
    setFormError(null);
    setReason("");
    try {
      const r = await teacherService.roster(slot.id);
      setRoster(r);
      setMarks(Object.fromEntries(r.students.map((s) => [s.studentId, { status: s.status ?? "", note: s.note ?? "" }])));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("teacher.group.loadError"));
    }
  };

  // The dashboard passes a lesson id in navigation state (not the address): its attendance opens right away.
  const location = useLocation();
  const navigate = useNavigate();
  const linkedSlot = (location.state as { attendance?: string } | null)?.attendance ?? null;
  useEffect(() => {
    if (!linkedSlot) return;
    navigate(location.pathname, { replace: true, state: null });
    void openRoster({ id: linkedSlot } as Slot);
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
      void slots.reload();
      void report.reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("teacher.group.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (group.loading && !group.data) return <Skeleton className="h-64 rounded-2xl" />;
  if (group.error || !group.data) return <ErrorState message={group.error ?? t("teacher.group.notFound")} onRetry={group.reload} />;
  const g = group.data;
  // Admins change any group; a teacher (groups:own) the groups they teach. The server checks again.
  const editable = g.status === "ACTIVE" && (can(role, "groups:manage") || (can(role, "groups:own") && g.teacherId === myId));

  const saveGroup = async (input: GroupInput) => {
    setEditBusy(true);
    try {
      const res = await teacherService.updateGroup(g.id, input);
      toast.success(res.lessonsCreated > 0 ? t("groupForm.created", { count: res.lessonsCreated }) : t("groupForm.saved"));
      setEditing(false);
      await Promise.all([group.reload(), slots.reload()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/teacher" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> {t("teacher.group.back")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{g.name}</h1>
          <p className="text-sm text-slate-500">{g.course.title} · {t("teacher.groups.students", { count: g.members.length, capacity: g.capacity })}</p>
          {rhythmLabel(g, t) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400">
              <CalendarDays className="h-4 w-4" /> {rhythmLabel(g, t)}{g.lessonMinutes ? ` · ${g.lessonMinutes} min` : ""}{g.room ? ` · ${g.room}` : ""}
            </p>
          )}
        </div>
        {editable && (
          <Button variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>{t("groupForm.edit")}</Button>
        )}
      </div>

      <Tabs
        activeTab={tab}
        onChange={setTab}
        tabs={[
          { id: "students", label: t("teacher.group.tabStudents"), count: g.members.length },
          { id: "report", label: t("teacher.group.tabReport") },
          { id: "slots", label: t("teacher.group.tabSlots") },
        ]}
      />

      {tab === "slots" &&
        (slots.loading && !slots.data ? <Skeleton className="h-32 rounded-2xl" /> : !slots.data || slots.data.length === 0 ? (
          <EmptyState title={t("teacher.group.noSlots")} description={t("teacher.group.noSlotsHint")} />
        ) : (
          <div className="space-y-3">
            {slots.data.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{s.topic || t("teacher.group.lesson")}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{formatDateTime(s.startsAt)} – {formatTime(s.endsAt)}{s.room ? ` · ${s.room}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.status === "CANCELLED" && <Badge variant="danger">{t("teacher.group.cancelled")}</Badge>}
                    {s.session?.finalizedAt && <Badge variant="success">{t("teacher.group.done")}</Badge>}
                    {s.status !== "CANCELLED" && (
                      <Button size="sm" variant="outline" leftIcon={<ClipboardCheck className="h-4 w-4" />} onClick={() => openRoster(s)}>
                        {t("teacher.group.attendance")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      {tab === "students" &&
        (g.members.length === 0 && !editable ? <EmptyState title={t("teacher.group.noStudents")} /> : (
          <GroupMembers group={g} editable={editable} onChanged={() => group.reload()} />
        ))}

      {tab === "report" && (
        <div className="space-y-3">
          {report.loading && !report.data ? <Skeleton className="h-32 rounded-2xl" /> : report.error ? <ErrorState message={report.error} onRetry={report.reload} /> : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
                  <tr><th className="px-4 py-3">{t("teacher.group.student")}</th><th className="px-4 py-3">{t("teacher.group.present")}</th><th className="px-4 py-3">{t("teacher.group.late")}</th><th className="px-4 py-3">{t("teacher.group.absent")}</th><th className="px-4 py-3">{t("teacher.group.excused")}</th><th className="px-4 py-3">{t("teacher.group.percent")}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {report.data?.rows.map((r) => (
                    <tr key={r.studentId}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                      <td className="px-4 py-3">{r.present + r.online}</td>
                      <td className="px-4 py-3">{r.late}</td>
                      <td className="px-4 py-3">{r.absent}</td>
                      <td className="px-4 py-3">{r.excused}</td>
                      <td className="px-4 py-3 font-semibold">{r.percent === null ? "—" : `${r.percent}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
