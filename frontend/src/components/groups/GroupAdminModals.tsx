import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/services/admin.service";
import { adminPlatformService as api, teacherService, type Group } from "@/services/platform.service";
import { useLoad } from "@/hooks/useLoad";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { tashkentLocalToIso } from "@/utils/money";

/** Group managers (groups:manage): a group's members, and extra lessons on the schedule. */
export function MembersModal({ group, onClose }: { group: Group; onClose: () => void }) {
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
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
          {detail.data?.members.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">{t("admin.groups.emptyGroup")}</li>}
          {detail.data?.members.map((m) => (
            <li key={m.studentId} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-900 dark:text-white">{m.student.name}</span>
              <Button size="sm" variant="ghost" aria-label={t("admin.groups.remove")} onClick={() => run(() => api.removeMember(group.id, m.studentId), t("admin.groups.removed"))}><UserMinus className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

export function SlotsModal({ group, onClose }: { group: Group; onClose: () => void }) {
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
        {err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>{t("admin.common.cancel")}</Button><Button loading={busy} onClick={save}>{t("admin.common.save")}</Button></div>
      </div>
    </Modal>
  );
}
