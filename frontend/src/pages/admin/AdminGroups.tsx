import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarPlus, Plus, UserMinus, UserPlus, Archive } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { adminPlatformService as api, teacherService, type Group } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { tashkentLocalToIso } from "@/utils/money";

export default function AdminGroups() {
  const { t } = useTranslation();
  const groups = useLoad(() => api.groups(), []);
  const courses = useLoad(() => adminService.listCourses(), []);
  const teachers = useLoad(() => adminService.listUsers({ role: "TEACHER", limit: 100 }).then((p) => p.items), []);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", courseId: "", teacherId: "", startDate: "", capacity: "20" });
  const [membersOf, setMembersOf] = useState<Group | null>(null);
  const [slotsOf, setSlotsOf] = useState<Group | null>(null);
  const [archiving, setArchiving] = useState<Group | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (form.name.trim().length < 2 || !form.courseId || !form.teacherId || !form.startDate) return setErr(t("admin.groups.fillAll"));
    setBusy(true);
    setErr(null);
    try {
      await api.createGroup({ name: form.name.trim(), courseId: form.courseId, teacherId: form.teacherId, startDate: form.startDate, capacity: Number(form.capacity) || 20 });
      toast.success(t("admin.groups.created"));
      setCreating(false);
      void groups.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!archiving) return;
    try {
      await api.archiveGroup(archiving.id);
      toast.success(t("admin.groups.archivedToast"));
      setArchiving(null);
      void groups.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.common.error"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t("admin.groups.title")}</h1>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setErr(null); setCreating(true); }}>{t("admin.groups.new")}</Button>
      </div>

      {groups.loading && !groups.data ? <Skeleton className="h-48 rounded-2xl" /> : groups.error ? <ErrorState message={groups.error} onRetry={groups.reload} /> : !groups.data || groups.data.length === 0 ? (
        <EmptyState title={t("admin.groups.empty")} description={t("admin.groups.emptyHint")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">{t("admin.groups.group")}</th><th className="px-4 py-3">{t("admin.common.course")}</th><th className="px-4 py-3">{t("admin.groups.teacher")}</th><th className="px-4 py-3">{t("admin.groups.students")}</th><th className="px-4 py-3">{t("admin.common.status")}</th><th className="px-4 py-3 text-right">{t("admin.common.actions")}</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {groups.data.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-white">{g.name}</td>
                  <td className="px-4 py-3">{g.course.title}</td>
                  <td className="px-4 py-3">{g.teacher.name}</td>
                  <td className="px-4 py-3">{g._count.members} / {g.capacity}</td>
                  <td className="px-4 py-3"><Badge variant={g.status === "ACTIVE" ? "success" : "neutral"}>{g.status === "ACTIVE" ? t("admin.common.active") : t("admin.common.archived")}</Badge></td>
                  <td className="px-4 py-3">
                    {g.status === "ACTIVE" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" aria-label={t("admin.groups.members")} onClick={() => setMembersOf(g)}><UserPlus className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" aria-label={t("admin.groups.schedule")} onClick={() => setSlotsOf(g)}><CalendarPlus className="h-4 w-4" /></Button>
                        <Button size="sm" variant="danger" aria-label={t("admin.common.archive")} onClick={() => setArchiving(g)}><Archive className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={creating} onClose={() => setCreating(false)} title={t("admin.groups.new")} maxWidth="lg">
        <div className="space-y-4">
          <Input label={t("admin.groups.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label={t("admin.common.course")} options={[{ value: "", label: t("admin.common.choose") }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} />
          <Select label={t("admin.groups.teacher")} options={[{ value: "", label: teachers.data && teachers.data.length === 0 ? t("admin.groups.noTeachers") : t("admin.common.choose") }, ...(teachers.data ?? []).map((tch) => ({ value: tch.id, label: tch.name }))]} value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("admin.groups.startDate")} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label={t("admin.groups.capacity")} type="number" min={1} max={200} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setCreating(false)}>{t("admin.common.cancel")}</Button><Button loading={busy} onClick={create}>{t("admin.common.save")}</Button></div>
        </div>
      </Modal>

      {membersOf && <MembersModal group={membersOf} onClose={() => { setMembersOf(null); void groups.reload(); }} />}
      {slotsOf && <SlotsModal group={slotsOf} onClose={() => setSlotsOf(null)} />}

      <ConfirmDialog open={archiving !== null} title={t("admin.groups.archiveTitle")} message={t("admin.groups.archiveText", { name: archiving?.name ?? "" })} confirmText={t("admin.common.archive")} onConfirm={archive} onCancel={() => setArchiving(null)} />
    </div>
  );
}

function MembersModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const { t } = useTranslation();
  const detail = useLoad(() => teacherService.group(group.id), [group.id]);
  const students = useLoad(() => adminService.listUsers({ role: "USER", limit: 100 }).then((p) => p.items), []);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const memberIds = new Set(detail.data?.members.map((m) => m.studentId));
  const candidates = (students.data ?? []).filter((s) => s.isActive && !memberIds.has(s.id));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setPick("");
      await detail.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t("admin.groups.membersTitle", { name: group.name })} maxWidth="lg">
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1"><Select label={t("admin.groups.addStudent")} options={[{ value: "", label: t("admin.common.choose") }, ...candidates.map((s) => ({ value: s.id, label: `${s.name}${s.email ? ` (${s.email})` : ""}` }))]} value={pick} onChange={(e) => setPick(e.target.value)} /></div>
          <Button disabled={!pick} loading={busy} onClick={() => run(() => api.addMember(group.id, pick), t("admin.groups.added"))}>{t("admin.common.add")}</Button>
        </div>
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {detail.data?.members.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">{t("admin.groups.emptyGroup")}</li>}
          {detail.data?.members.map((m) => (
            <li key={m.studentId} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-white">{m.student.name}</span>
              <Button size="sm" variant="ghost" aria-label={t("admin.groups.remove")} onClick={() => run(() => api.removeMember(group.id, m.studentId), t("admin.groups.removed"))}><UserMinus className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function SlotsModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ start: "", end: "", room: "", online: "", topic: "", repeat: "1" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.start || !f.end) return setErr(t("admin.groups.needTimes"));
    setBusy(true);
    setErr(null);
    try {
      const count = Math.max(1, Number(f.repeat) || 1);
      const created = await api.createSlots(group.id, {
        startsAt: tashkentLocalToIso(f.start),
        endsAt: tashkentLocalToIso(f.end),
        room: f.room.trim() || null,
        onlineUrl: f.online.trim() || null,
        topic: f.topic.trim() || null,
        ...(count > 1 ? { repeat: { everyWeeks: 1, count } } : {}),
      });
      toast.success(t("admin.groups.slotsCreated", { count: created.length }));
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("admin.common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t("admin.groups.scheduleTitle", { name: group.name })} maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">{t("admin.groups.scheduleHint")}</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t("admin.groups.starts")} type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          <Input label={t("admin.groups.ends")} type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t("admin.groups.room")} value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} />
          <Input label={t("admin.groups.online")} value={f.online} onChange={(e) => setF({ ...f, online: e.target.value })} />
        </div>
        <Input label={t("admin.groups.topic")} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
        <Input label={t("admin.groups.repeat")} type="number" min={1} max={104} value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} />
        {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>{t("admin.common.cancel")}</Button><Button loading={busy} onClick={save}>{t("admin.common.save")}</Button></div>
      </div>
    </Modal>
  );
}
